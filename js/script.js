// ======================
// Загрузка заказов для водителя (Динамическая)
// ======================
const ordersContainer = document.querySelector(".orders");

async function loadOrders() {
    if (!ordersContainer) return; // Если мы не на странице водителя, ничего не делаем

    try {
        const response = await fetch("/api/get_orders.php");
        const orders = await response.json();

        if (!Array.isArray(orders)) return;

        // Очищаем контейнер перед отрисовкой нового списка
        ordersContainer.innerHTML = "";

        if (orders.length === 0) {
            ordersContainer.innerHTML = "<p style='text-align:center; color:#777; padding:20px;'>Пока нет свободных заказов</p>";
            return;
        }

        orders.forEach(order => {
            // Форматируем время из created_at (например, "2023-10-25 14:30:00" -> "14:30")
            const time = order.created_at ? order.created_at.substring(11, 16) : "--:--";
            
            // ПОКА используем полные адреса. Позже, когда добавим поля секторов в БД, 
            // мы просто заменим order.from_address на order.from_sector
            const from = order.from_address; 
            const to = order.to_address;
            const price = Math.round(order.offered_price);

            // Создаем HTML карточки в точности как в вашем макете
            const card = document.createElement("div");
            card.className = "order-card";
                                    // Если сектора есть — выводим их крупно, иначе — адреса
            const fromDisplay = order.from_sector || from;
            const toDisplay = order.to_sector || to;
            
            // Если сектор есть — адрес показываем мелко под ним, используя новый CSS класс
            const fromSubline = order.from_sector ? `<div class="order-address-subline">${from}</div>` : '';
            const toSubline = order.to_sector ? `<div class="order-address-subline">${to}</div>` : '';

            card.innerHTML = `
                <div class="route">
                    <div>
                        <strong>${fromDisplay}</strong>
                        ${fromSubline}
                    </div>
                    <span>→</span>
                    <div>
                        <strong>${toDisplay}</strong>
                        ${toSubline}
                    </div>
                </div>
                <div class="info">
                    <span>${time}</span>
                    <span class="price">${price} грн</span>
                </div>
            `;

            // Добавляем обработчик клика: переход на страницу деталей с ID заказа в URL
            card.addEventListener("click", () => {
                window.location.href = `reception-order.html?id=${order.id}`;
            });

            ordersContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Ошибка загрузки заказов:", error);
    }
}

// Запускаем загрузку сразу при открытии страницы
if (ordersContainer) {
    loadOrders();
    // Обновляем список каждые 7 секунд (polling), чтобы видеть новые заказы
    setInterval(loadOrders, 7000);
}


// ======================
// Кнопка "Свободен" (Ваша логика)
// ======================
const statusBtn = document.querySelector(".status-btn");

if (statusBtn) {
    let isFree = true;

    statusBtn.addEventListener("click", () => {
        isFree = !isFree;
        if (isFree) {
            statusBtn.textContent = "Свободен";
            statusBtn.style.background = "#19b65b";
        } else {
            statusBtn.textContent = "Занят";
            statusBtn.style.background = "#e74c3c";
        }
    });
}

// ======================
// Логика для страницы деталей заказа (reception-order.html)
// ======================

// Глобальная переменная (должна быть ВНЕ блоков, чтобы быть доступной везде в этом файле)
let currentOrder = null;

const orderPage = document.querySelector(".order-page");

if (orderPage) {
    // 1. Получаем ID заказа из URL (например, ?id=20)
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>Помилка: ID замовлення не вказано</h2>";
    } else {
        // 2. Загружаем данные заказа при открытии страницы
        loadOrderDetails(orderId);

        // 3. Обработчик кнопки "Беру замовлення"
        const takeBtn = document.getElementById("take-btn");
        takeBtn.addEventListener("click", async () => {
            if (!confirm("Ви впевнені, що хочете прийняти це замовлення?")) return;

            takeBtn.textContent = "Обробка...";
            takeBtn.disabled = true;

            try {
                const response = await fetch("/api/accept_order.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order_id: orderId })
                });

                const result = await response.json();

                if (result.success) {
                    // === МЕНЯЕМ ИНТЕРФЕЙС ВМЕСТО РЕДИРЕКТА ===
                    
                    // 1. Меняем статус в шапке
                    const statusEl = document.getElementById("order-status");
                    statusEl.textContent = "✅ Прийнято вами";
                    statusEl.style.background = "#19b65b"; // Зеленый цвет
                    statusEl.style.color = "#fff";

                    // 2. Скрываем кнопки принятия/отказа
                    document.getElementById("decision-buttons").classList.add("hidden");

                    // 3. Показываем телефон и кнопки действия
                    document.getElementById("client-phone-row").classList.remove("hidden");
                    document.getElementById("action-buttons").classList.remove("hidden");
                    
                    // Подставляем телефон в текст и в ссылку для звонка
                    const phone = currentOrder.client_phone; 
                    document.getElementById("client-phone").textContent = phone;
                    document.getElementById("call-client-btn").href = `tel:${phone}`;

                    alert("Замовлення прийнято! Зателефонуйте клієнту для підтвердження.");
                    
                } else {
                    alert("Помилка: " + (result.error || "Не вдалося прийняти замовлення"));
                    takeBtn.textContent = "Беру замовлення";
                    takeBtn.disabled = false;
                }
            } catch (error) {
                console.error("Помилка відправки:", error);
                alert("Не вдалося зв'язатися з сервером.");
                takeBtn.textContent = "Беру замовлення";
                takeBtn.disabled = false;
            }
        });
    }
}

async function loadOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/get_order_status.php?id=${orderId}`);
        const data = await response.json();

        if (!data.success || !data.order) {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>Замовлення не знайдено</h2>";
            return;
        }

        // Сохраняем в глобальную переменную
        currentOrder = data.order;
        const order = currentOrder; // для удобства использования ниже

        // Заполняем HTML реальными данными из БД
        document.getElementById("order-id").textContent = `Замовлення #${order.id}`;
        document.getElementById("order-status").textContent = order.status === 'searching' ? 'Новий' : order.status;
        
        document.getElementById("from-sector").textContent = order.from_sector || "Район не вказано";
        document.getElementById("from-address").textContent = order.from_address;
        
        document.getElementById("to-sector").textContent = order.to_sector || "Район не вказано";
        document.getElementById("to-address").textContent = order.to_address;
        
        document.getElementById("order-price").textContent = `${Math.round(order.offered_price)} грн`;
        document.getElementById("commission-payer").textContent = order.commission_payer === 'client' ? 'Клієнт' : 'Водій';
        document.getElementById("order-distance").textContent = `${order.distance_km} км`;

        // Формируем ссылку на карты
        document.getElementById("map-link").href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.to_address)}&origin=${encodeURIComponent(order.from_address)}`;

    } catch (error) {
        console.error("Помилка завантаження деталей:", error);
    }
}