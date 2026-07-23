// Получаем ID заказа из URL (например, ?id=15)
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('id');

if (!orderId) {
    document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>Помилка: ID замовлення не вказано</h2>";
} else {
    // Обновляем номер в шапке
    document.getElementById("header-order-id").textContent = `Замовлення #${orderId}`;
    
    // Запускаем опрос сервера сразу и затем каждые 4 секунды
    checkStatus();
    setInterval(checkStatus, 4000);
}

async function checkStatus() {
    try {
        const response = await fetch(`/api/get_order_status.php?id=${orderId}`);
        const data = await response.json();

        if (!data.success || !data.order) return;

        const order = data.order;

        // 1. Обновляем детали маршрута (заполняем пустые места реальными данными)
        document.getElementById("route-from").textContent = order.from_address;
        document.getElementById("route-to").textContent = order.to_address;
        document.getElementById("route-distance").textContent = `${order.distance_km} км`;
        document.getElementById("route-price").textContent = `${Math.round(order.offered_price)} грн`;

        // 2. Управляем видимостью блоков в зависимости от статуса
        const statusText = document.getElementById("status-text");
        const statusSubtext = document.getElementById("status-subtext");
        const statusCard = document.getElementById("status-card");
        const driverBlock = document.getElementById("driver-block");
        const negotiationBlock = document.getElementById("negotiation-block");
        const cancelBtn = document.getElementById("btn-cancel");

        if (order.status === 'searching') {
            statusText.textContent = "Пошук водія...";
            statusSubtext.textContent = "Ваше замовлення бачать водії району";
            statusCard.className = "status-card searching";
            
            driverBlock.classList.add("hidden");
            negotiationBlock.classList.add("hidden");
            cancelBtn.classList.remove("hidden");

        } else if (order.status === 'accepted') {
            statusText.textContent = "Водій знайдений!";
            statusSubtext.textContent = "Водій вже прямує до вас";
            statusCard.className = "status-card accepted"; // Можно добавить зеленый стиль в CSS
            
            driverBlock.classList.remove("hidden"); // Показываем блок водителя
            negotiationBlock.classList.add("hidden");
            cancelBtn.classList.add("hidden"); // Отменить уже сложнее, скрываем кнопку (или меняем на "Связаться")

            // Здесь позже подставим реальные данные водителя из БД
            document.getElementById("driver-name").textContent = "Водій прийняв замовлення";
            document.getElementById("driver-car").textContent = "Деталі авто уточнюються...";

        } else if (order.status === 'cancelled') {
            statusText.textContent = "Замовлення скасовано";
            statusSubtext.textContent = "Ви можете створити нове замовлення";
            statusCard.className = "status-card cancelled";
            
            driverBlock.classList.add("hidden");
            cancelBtn.classList.add("hidden");
        }

    } catch (error) {
        console.error("Помилка отримання статусу:", error);
    }
}

// Обработка кнопки отмены (пока просто заглушка)
document.getElementById("btn-cancel").addEventListener("click", async () => {
    if (confirm("Ви впевнені, що хочете скасувати замовлення?")) {
        // Здесь позже будет fetch запрос к api/cancel_order.php
        alert("Функція скасування в розробці");
    }
});