console.log("client.js подключен (исправленная версия)");

let fromLat = "", fromLon = "";
let toLat = "", toLon = "";

// ТАРИФЫ (меняйте сами)
const BASE_PRICE = 30;       // Подача, грн
const PRICE_PER_KM = 25;     // Цена за 1 км, грн
let selectedPrice = 0; // Выбранная клиентом цена

const fromInput = document.getElementById("from");
const fromList = document.getElementById("from-list");
const fromError = document.getElementById("from-error");

const toInput = document.getElementById("to");
const toList = document.getElementById("to-list");

const calcBtn = document.getElementById("calcBtn");
const routeInfo = document.getElementById("routeInfo");

// Счетчик запросов для отмены устаревших ответов (защита от зависания списка)
let requestId = 0;

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function searchCoordinates(query, targetList, isFrom) {
    if (query.length < 2) {
        targetList.innerHTML = "";
        return null;
    }

    // Исправляем "Поля5" -> "Поля 5"
    const cleanQuery = query.replace(/([a-zA-Zа-яА-ЯіІїЇєЄ])(\d)/g, "$1 $2").trim();

    // Уникальный ID для этого конкретного запроса
    const currentRequestId = ++requestId;

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ua&accept-language=uk,ru&q=${encodeURIComponent(cleanQuery + ", Дніпро")}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Если за это время пользователь успел ввести что-то еще, игнорируем этот ответ
        if (currentRequestId !== requestId) {
            return null;
        }

        targetList.innerHTML = "";
        if (data.length === 0) return null;

        data.forEach(item => {
            const div = document.createElement("div");

            // УМНОЕ ФОРМАТИРОВАНИЕ: 
            // Если адрес начинается с числа (дома), ставим его после названия улицы
            const parts = item.display_name.split(',');
            let displayName = parts[0].trim();

            if (parts.length > 1) {
                const firstPart = parts[0].trim();
                const secondPart = parts[1].trim();

                // Если первая часть - это просто номер дома (например, "50")
                if (/^\d+\w*$/.test(firstPart)) {
                    displayName = `${secondPart} ${firstPart}`; // "проспект Дмитра Яворницького 50"
                } else {
                    displayName = `${firstPart}, ${secondPart}`; // "вулиця Шелгунова, 8"
                }
            }

            div.textContent = displayName;
            div.style.cursor = "pointer";
            div.style.padding = "5px";
            div.style.borderBottom = "1px solid #eee";

            div.addEventListener("click", (e) => {
                e.stopPropagation(); // Останавливаем всплытие, чтобы не сработал клик по document

                if (isFrom) {
                    fromInput.value = displayName;
                    fromLat = item.lat;
                    fromLon = item.lon;
                    fromError.textContent = "";
                } else {
                    toInput.value = displayName;
                    toLat = item.lat;
                    toLon = item.lon;
                }

                // МГНОВЕННОЕ ЗАКРЫТИЕ СПИСКА
                targetList.innerHTML = "";
            });

            targetList.appendChild(div);
        });

        return data[0];
    } catch (error) {
        console.error("Ошибка геокодинга:", error);
        return null;
    }
}

fromInput.addEventListener("input", debounce(async () => {
    fromLat = ""; fromLon = "";
    fromError.textContent = "";
    await searchCoordinates(fromInput.value, fromList, true);
}, 300));

toInput.addEventListener("input", debounce(async () => {
    toLat = ""; toLon = "";
    await searchCoordinates(toInput.value, toList, false);
}, 300));

// Закрытие списков при клике вне их
document.addEventListener("click", (e) => {
    if (!e.target.closest("#from") && !e.target.closest("#from-list")) {
        fromList.innerHTML = "";
    }
    if (!e.target.closest("#to") && !e.target.closest("#to-list")) {
        toList.innerHTML = "";
    }
});

calcBtn.addEventListener("click", async () => {
    // Принудительно закрываем списки при нажатии кнопки
    fromList.innerHTML = "";
    toList.innerHTML = "";

    routeInfo.textContent = "Рахуємо...";

    const finalFromQuery = fromInput.value.replace(/([a-zA-Zа-яА-ЯіІїЇєЄ])(\d)/g, "$1 $2").trim();
    const finalToQuery = toInput.value.replace(/([a-zA-Zа-яА-ЯіІїЇєЄ])(\d)/g, "$1 $2").trim();

    if (!fromLat || !fromLon) {
        const res = await searchCoordinates(finalFromQuery, fromList, true);
        if (res) { fromLat = res.lat; fromLon = res.lon; }
    }

    if (!toLat || !toLon) {
        const res = await searchCoordinates(finalToQuery, toList, false);
        if (res) { toLat = res.lat; toLon = res.lon; }
    }

    if (!fromLat || !fromLon) {
        fromError.textContent = "Не вдалося знайти адресу. Спробуйте: 'Поля 5'";
        routeInfo.textContent = "";
        return;
    }
    if (!toLat || !toLon) {
        routeInfo.textContent = "Не вдалося знайти адресу призначення.";
        return;
    }

    try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
            const distanceKm = (data.routes[0].distance / 1000).toFixed(1);

            // Базовая цена
            const basePrice = Math.round(BASE_PRICE + distanceKm * PRICE_PER_KM);

            // Обновляем текст с расстоянием
            routeInfo.innerHTML = `<strong>Відстань:</strong> ${distanceKm} км`;

            // Показываем карточки цен
            const priceCards = document.getElementById("priceCards");
            const cards = priceCards.querySelectorAll(".price-card");

            cards.forEach(card => {
                const multiplier = parseFloat(card.dataset.multiplier);
                const price = Math.round(basePrice * multiplier);
                card.querySelector(".price-card-value").textContent = `${price} грн`;
            });

            priceCards.classList.remove("hidden");

            // Показываем кнопку вызова
            document.getElementById("callBtn").classList.remove("hidden");
        } else {
            routeInfo.textContent = "Маршрут не знайдено. Перевірте правильність адреси.";
        }
    } catch (error) {
        console.error("Помилка OSRM:", error);
        routeInfo.textContent = "Помилка з'єднання.";
    }
});

// Обработчик клика по карточкам цен
document.querySelectorAll(".price-card").forEach(card => {
    card.addEventListener("click", () => {
        // Убираем active у всех карточек
        document.querySelectorAll(".price-card").forEach(c => c.classList.remove("active"));

        // Добавляем active к выбранной
        card.classList.add("active");

        // Сохраняем выбранную цену
        selectedPrice = parseInt(card.querySelector(".price-card-value").textContent);

        console.log("Выбрана цена:", selectedPrice);
    });
});

// Обработчик кнопки "Викликати таксі"
document.getElementById("callBtn").addEventListener("click", () => {
    if (!selectedPrice) {
        alert("Будь ласка, виберіть тариф");
        return;
    }

    console.log("Заказ создан:", {
        from: fromInput.value,
        to: toInput.value,
        price: selectedPrice
    });

    alert(`Замовлення створено!\nВід: ${fromInput.value}\nДо: ${toInput.value}\nЦіна: ${selectedPrice} грн`);

    // Здесь позже будет отправка на сервер
});