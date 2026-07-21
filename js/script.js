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