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
            statusCard.className = "status-card accepted"; 
            
            driverBlock.classList.remove("hidden"); 
            negotiationBlock.classList.add("hidden");
            cancelBtn.classList.remove("hidden"); 

            // === ПОДСТАВЛЯЕМ РЕАЛЬНЫЕ ДАННЫЕ ВОДИТЕЛЯ ===
            
            // Строка 1: Имя водителя
            document.getElementById("driver-name").textContent = order.driver_name || "Водій";
            
            // Строки 2, 3 и 4: Авто, Год и Кликабельный телефон
            const carMakeAndNumber = [order.car_make, order.car_number].filter(Boolean).join(", ");
            const carYear = order.car_year || "";
            const driverPhone = order.driver_phone || "";
            
            let carHTML = "";
            
            if (carMakeAndNumber) {
                carHTML += `<div style="font-size:14px; color:#555; margin-bottom:4px;">🚗 ${carMakeAndNumber}</div>`;
            }
            if (carYear) {
                carHTML += `<div style="font-size:13px; color:#888; margin-bottom:8px;">📅 ${carYear} р.</div>`;
            }
            if (driverPhone) {
                // Телефон как 3-я строка, но кликабельная (откроет набор номера на мобильном)
                carHTML += `<a href="tel:${driverPhone}" style="display:block; font-size:16px; color:#19b65b; font-weight:700; text-decoration:none;">📞 ${driverPhone}</a>`;
            }
            
            if (carHTML) {
                document.getElementById("driver-car").innerHTML = carHTML;
            } else {
                document.getElementById("driver-car").textContent = "Деталі авто уточнюються...";
            }

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

// Обработка кнопки отмены
document.getElementById("btn-cancel").addEventListener("click", async () => {
    if (!confirm("Ви впевнені, що хочете скасувати замовлення?")) return;

    const btn = document.getElementById("btn-cancel");
    btn.disabled = true;
    btn.textContent = "Скасування...";

    try {
        const clientPhone = localStorage.getItem("taxi_client_phone") || "";
        
        const response = await fetch("/api/client_cancel_order.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                order_id: orderId,
                client_phone: clientPhone
            })
        });

        const result = await response.json();

        if (result.success) {
            alert("Замовлення скасовано!");
            window.location.href = "client.html";
        } else {
            alert("Помилка: " + (result.error || "Не вдалося скасувати замовлення"));
            btn.disabled = false;
            btn.textContent = "Скасувати замовлення";
        }
    } catch (error) {
        console.error("Помилка відправки:", error);
        alert("Не вдалося зв'язатися з сервером");
        btn.disabled = false;
        btn.textContent = "Скасувати замовлення";
    }
});