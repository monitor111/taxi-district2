console.log("client.js подключен (исправленная версия)");

let fromLat = "", fromLon = "";
let toLat = "", toLon = "";

let fromSector = "", toSector = "";

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

// =========================================================
// УПРАВЛЕНИЕ ДАННЫМИ КЛИЕНТА И ПОЭТАПНОЕ РАСКРЫТИЕ
// =========================================================

// 1. Функция сохранения данных (теперь она точно есть)
function saveClientData(name, phone) {
    localStorage.setItem("taxi_client_name", name);
    localStorage.setItem("taxi_client_phone", phone);
}

// 2. Логика переключения шагов при загрузке страницы
function checkClientExists() {
    const savedName = localStorage.getItem("taxi_client_name");
    const savedPhone = localStorage.getItem("taxi_client_phone");

    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");

    // Проверяем, что мы именно на странице заказа (элементы существуют)
    if (step1 && step2) {
        if (savedName && savedPhone) {
            // Клиент уже был: скрываем шаг 1, показываем адреса
            step1.classList.add("hidden");
            step2.classList.remove("hidden");
            
            // На всякий случай подставляем сохраненные данные в скрытые поля
            document.getElementById("clientName").value = savedName;
            document.getElementById("clientPhone").value = savedPhone;
        } else {
            // Новый клиент: показываем только имя и телефон
            step1.classList.remove("hidden");
            step2.classList.add("hidden");
        }
    }
}

// Запускаем проверку сразу при загрузке скрипта
checkClientExists();

// 3. Обработчик кнопки "Далі"
const nextBtn = document.getElementById("nextBtn");
if (nextBtn) {
    nextBtn.addEventListener("click", () => {
        const name = document.getElementById("clientName").value.trim();
        const phone = document.getElementById("clientPhone").value.trim();

        if (!name || !phone) {
            alert("Будь ласка, вкажіть ваше ім'я та телефон");
            return;
        }

        // Сохраняем данные в память браузера
        saveClientData(name, phone);

        // Переключаем экраны: скрываем шаг 1, показываем шаг 2
        document.getElementById("step1").classList.add("hidden");
        document.getElementById("step2").classList.remove("hidden");
    });
}
// =========================================================

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

    // ДОБАВЛЕНО: addressdetails=1, чтобы получить подробные данные о районе
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ua&accept-language=uk,ru&q=${encodeURIComponent(cleanQuery + ", Дніпро")}`;

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
                e.stopPropagation(); // Останавливаем всплытие

                                // Извлекаем сектор: проверяем все возможные поля местности от Nominatim
                const sector = (item.address && (item.address.suburb || item.address.neighbourhood || item.address.quarter || item.address.city_district)) 
                ? (item.address.suburb || item.address.neighbourhood || item.address.quarter || item.address.city_district) 
                : "";

                // === ВОТ ЭТА СТРОКА ПОКАЖЕТ НАМ ВСЮ ПРАВДУ ===
                console.log("Адрес:", displayName, " | Данные Nominatim:", item.address);
                // ==============================================

                if (isFrom) {
                    fromInput.value = displayName;
                    fromLat = item.lat;
                    fromLon = item.lon;
                    fromSector = sector; // <-- Сохраняем сектор
                    fromError.textContent = "";
                } else {
                    toInput.value = displayName;
                    toLat = item.lat;
                    toLon = item.lon;
                    toSector = sector; // <-- Сохраняем сектор
                }

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
        fromError.textContent = "Не вдалося знайти адресу.";
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

            // === АВТОВЫБОР ЦЕНЫ ПО УМОЛЧАНИЮ ===
            const defaultCard = document.querySelector(".price-card.active");
            if (defaultCard) {
                const defaultPriceText = defaultCard.querySelector(".price-card-value").textContent;
                selectedPrice = parseInt(defaultPriceText); // Записываем цену в переменную
            }
            // ====================================
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
document.getElementById("callBtn").addEventListener("click", async () => {
    const clientName = document.getElementById("clientName").value.trim();
    const clientPhone = document.getElementById("clientPhone").value.trim();

    if (!clientName || !clientPhone) {
        alert("Будь ласка, вкажіть ваше ім'я та телефон");
        return;
    }

    if (!selectedPrice) {
        alert("Будь ласка, виберіть тариф");
        return;
    }

    // Сохраняем данные локально (для удобства)
    saveClientData(clientName, clientPhone);

    // Получаем расстояние из routeInfo
    const distanceText = routeInfo.textContent.match(/[\d.]+/);
    const distance = distanceText ? parseFloat(distanceText[0]) : 0;

    // Читаем выбор клиента из обоих новых списков
    const manualFromSector = document.getElementById("fromSectorSelect").value;
    const manualToSector = document.getElementById("toSectorSelect").value;

    // Данные заказа
    const orderData = {
        name: clientName,
        phone: clientPhone,
        from: fromInput.value,
        to: toInput.value,
        // Приоритет: ручной выбор клиента, иначе данные, которые нашел Nominatim
        from_sector: manualFromSector || fromSector, 
        to_sector: manualToSector || toSector, 
        distance: distance,
        price: selectedPrice,
        commission_payer: "client",
        // === ДОБАВЛЕНО: координаты для карт ===
        from_lat: fromLat,
        from_lon: fromLon,
        to_lat: toLat,
        to_lon: toLon
        // ====================================
    };
console.log(JSON.stringify(orderData));
    console.log("Отправляем заказ:", orderData);

    // Меняем текст кнопки на время отправки и блокируем её
    const callBtn = document.getElementById("callBtn");
    callBtn.textContent = "Створюємо замовлення...";
    callBtn.disabled = true;

    try {
        // Отправляем данные в PHP
        const response = await fetch("/api/create_order.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        console.log("Ответ сервера:", result);

        if (result.success) {
            // Сохраняем ID заказа в localStorage (понадобится на странице статуса)
            localStorage.setItem("taxi_current_order_id", result.order_id);
            localStorage.setItem("taxi_current_order_data", JSON.stringify(orderData));

            // === БЛОКИРУЕМ КНОПКУ НАВСЕГДА (до перезагрузки страницы) ===
            callBtn.textContent = "Замовлення створено ✓";
            callBtn.disabled = true;
            callBtn.style.background = "#a0aec0"; // Серый цвет
            callBtn.style.cursor = "not-allowed";
            // ============================================================

            alert(`Замовлення #${result.order_id} створено!\nМи зателефонуємо вам на ${clientPhone}.`);

             // === АВТОМАТИЧЕСКИЙ ПЕРЕХОД НА СТРАНИЦУ СТАТУСА ===
            window.location.href = `order-status.html?id=${result.order_id}`;
            // ==================================================
             
            // window.location.href = "order-status.html";
        } else {
            alert("Помилка: " + (result.error || "Невідома помилка"));
        }
    } catch (error) {
        console.error("Помилка відправки:", error);
        alert("Не вдалося зв'язатися з сервером. Спробуйте пізніше.");
    } finally {
        // Возвращаем кнопку в исходное состояние ТОЛЬКО если заказ НЕ был успешно создан
        // (Если заказ создан, callBtn.disabled === true, и этот блок игнорируется)
        if (!callBtn.disabled) {
            callBtn.textContent = "Викликати таксі";
            callBtn.disabled = false;
            callBtn.style.background = ""; // Сбрасываем серый цвет
            callBtn.style.cursor = "";
        }
    }
});

// === Вывод имени в заголовке ===
const welcomeTitle = document.getElementById("welcomeTitle");
const numberTel = document.getElementById("numberTel");

if (welcomeTitle) {

    const phone = localStorage.getItem("taxi_client_phone");

    if (phone) {

        fetch("/api/get_client.php?phone=" + encodeURIComponent(phone))
            .then(response => response.json())
            .then(data => {

                if (data.name) {
                    welcomeTitle.textContent = "Вітаємо, " + data.name + "!";
                    numberTel.textContent = "Тел: " + data.phone;
                }

            });

    }

}