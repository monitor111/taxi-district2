// ======================
// Логика для страницы деталей заказа (reception-order.html)
// ======================
let currentOrder = null;
const orderPage = document.querySelector(".order-page");

if (orderPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>Помилка: ID замовлення не вказано</h2>";
    } else {
        loadOrderDetails(orderId);

        const takeBtn = document.getElementById("take-btn");
        if (takeBtn) {
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
                        const statusEl = document.getElementById("order-status");
                        statusEl.textContent = "✅ Прийнято вами";
                        statusEl.style.background = "#19b65b";
                        statusEl.style.color = "#fff";

                        document.getElementById("decision-buttons").classList.add("hidden");
                        document.getElementById("client-phone-row").classList.remove("hidden");
                        document.getElementById("action-buttons").classList.remove("hidden");
                        
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
}

async function loadOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/get_order_status.php?id=${orderId}`);
        const data = await response.json();

        if (!data.success || !data.order) {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>Замовлення не знайдено</h2>";
            return;
        }

        currentOrder = data.order;
        const order = currentOrder;

        document.getElementById("order-id").textContent = `Замовлення #${order.id}`;
        document.getElementById("order-status").textContent = order.status === 'searching' ? 'Новий' : order.status;
        
        document.getElementById("from-sector").textContent = order.from_sector || "Район не вказано";
        document.getElementById("from-address").textContent = order.from_address;
        
        document.getElementById("to-sector").textContent = order.to_sector || "Район не вказано";
        document.getElementById("to-address").textContent = order.to_address;
        
        document.getElementById("order-price").textContent = `${Math.round(order.offered_price)} грн`;
        document.getElementById("commission-payer").textContent = order.commission_payer === 'client' ? 'Клієнт' : 'Водій';
        document.getElementById("order-distance").textContent = `${order.distance_km} км`;

        document.getElementById("map-link").href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.to_address)}&origin=${encodeURIComponent(order.from_address)}`;

    } catch (error) {
        console.error("Помилка завантаження деталей:", error);
    }
}