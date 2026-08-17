// ======================
// Логика для страницы деталей заказа (reception-order.html)
// ======================
let currentOrder = null;
let statusInterval = null;
const orderPage = document.querySelector(".order-page");

if (orderPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>Помилка: ID замовлення не вказано</h2>";
    } else {
        loadOrderDetails(orderId);
        statusInterval = setInterval(() => checkOrderStatus(orderId), 3000);

      // === Обработчики кликов на адреса для открытия карт ===
        document.getElementById("from-address").addEventListener("click", () => {
            openMapModal("pickup");
        });
        
        document.getElementById("to-address").addEventListener("click", () => {
            openMapModal("dropoff");
        });
        // =====================================================

        const takeBtn = document.getElementById("take-btn");
        if (takeBtn) {
            takeBtn.addEventListener("click", async () => {
                if (!confirm("Ви впевнені, що хочете прийняти це замовлення?")) return;

                takeBtn.textContent = "Обробка...";
                takeBtn.disabled = true;

                try {
                    const driverPhone = localStorage.getItem("driver_phone") || "";
                    const response = await fetch("/api/accept_order.php", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            order_id: orderId,
                            driver_phone: driverPhone
                        })
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
                        // Редирект на список заказов через 1 секунду
                        setTimeout(() => {
                            window.location.href = "driver.html";
                        }, 1000);
                    }
                } catch (error) {
                    console.error("Помилка відправки:", error);
                    alert("Не вдалося зв'язатися з сервером.");
                    takeBtn.textContent = "Беру замовлення";
                    takeBtn.disabled = false;
                }
            });
        }

        // === ВОТ СЮДА ВСТАВЛЯЕТЕ ===
        const driverCancelBtn = document.getElementById("driver-cancel-btn");
        if (driverCancelBtn) {
            driverCancelBtn.addEventListener("click", async () => {
                if (!confirm("Ви впевнені, що хочете відмовитися від замовлення? Замовлення повернеться в список вільних.")) return;

                driverCancelBtn.disabled = true;
                driverCancelBtn.textContent = "Обробка...";

                try {
                    const driverPhone = localStorage.getItem("driver_phone") || "";
                    
                    const response = await fetch("/api/driver_cancel_order.php", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            order_id: orderId,
                            driver_phone: driverPhone
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        alert("Замовлення повернуто в список вільних");
                        window.location.href = "driver.html";
                    } else {
                        alert("Помилка: " + (result.error || "Не вдалося відмовитися"));
                        driverCancelBtn.disabled = false;
                        driverCancelBtn.textContent = "❌ Відмова від замовлення";
                    }
                } catch (error) {
                    console.error("Помилка відправки:", error);
                    alert("Не вдалося зв'язатися з сервером");
                    driverCancelBtn.disabled = false;
                    driverCancelBtn.textContent = "❌ Відмова від замовлення";
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

                // === ПОКАЗ ПРЕДУПРЕЖДЕНИЯ О КЛИЕНТЕ ===
        const lateCancelCount = order.late_cancel_count || 0;
        
        if (lateCancelCount >= 3) {
            const warningCard = document.getElementById("warning-card");
            const warningText = document.getElementById("warning-text");
            const cancelCountEl = document.getElementById("cancel-count");
            
            warningCard.classList.remove("hidden");
            cancelCountEl.textContent = lateCancelCount;
            
            if (lateCancelCount >= 5) {
                // Красный для 5+
                warningCard.style.background = "#f8d7da";
                warningCard.style.borderLeft = "4px solid #dc3545";
                warningText.style.color = "#721c24";
            } else {
                // Оранжевый для 3-4
                warningCard.style.background = "#fff3cd";
                warningCard.style.borderLeft = "4px solid #ff9800";
                warningText.style.color = "#856404";
            }
        }

    } catch (error) {
        console.error("Помилка завантаження деталей:", error);
    }
}

// === Логика модального окна выбора карт ===
let selectedMapType = null; // "pickup" или "dropoff"

function openMapModal(type) {
    selectedMapType = type;
    const modal = document.getElementById("map-modal");
    modal.classList.remove("hidden");
}

// Закрытие модального окна
document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("map-modal").classList.add("hidden");
});

// Закрытие при клике на затемнение (вне окна)
document.getElementById("map-modal").addEventListener("click", (e) => {
    if (e.target.id === "map-modal") {
        document.getElementById("map-modal").classList.add("hidden");
    }
});
// =====================================================

// === Логика кнопок выбора карты ===
document.getElementById("modal-waze").addEventListener("click", () => {
    openMap("waze");
});

document.getElementById("modal-google").addEventListener("click", () => {
    openMap("google");
});

function openMap(provider) {
    const order = currentOrder;
    
    // Определяем координаты назначения
    let destinationLat, destinationLon;
    
    if (selectedMapType === "pickup") {
        // Клик на "Звідки" — едем к клиенту
        destinationLat = order.from_lat;
        destinationLon = order.from_lon;
    } else {
        // Клик на "Куди" — едем к точке назначения
        destinationLat = order.to_lat;
        destinationLon = order.to_lon;
    }
    
    // Если координат нет — используем fallback на текстовые адреса
    if (!destinationLat || !destinationLon) {
        const destinationAddress = selectedMapType === "pickup" ? order.from_address : order.to_address;
        
        if (provider === "waze") {
            window.open(`https://waze.com/ul?q=${encodeURIComponent(destinationAddress)}&navigate=yes`, "_blank");
        } else {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress)}`, "_blank");
        }
    } else {
        // Есть координаты — используем их
        if (provider === "waze") {
            window.open(`https://waze.com/ul?ll=${destinationLat},${destinationLon}&navigate=yes`, "_blank");
        } else {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLon}`, "_blank");
        }
    }
    
    // Закрываем модальное окно
    document.getElementById("map-modal").classList.add("hidden");
}

// === ОПРОС СТАТУСА ЗАКАЗА (для редиректа при отмене клиентом) ===
async function checkOrderStatus(orderId) {
    try {
        const response = await fetch(`/api/get_order_status.php?id=${orderId}`);
        const data = await response.json();

        if (!data.success || !data.order) return;

        const order = data.order;

        // Если клиент отменил заказ
        if (order.status === 'cancelled') {
    // Останавливаем опрос, чтобы alert не показывался повторно
    clearInterval(statusInterval);
    
    const statusEl = document.getElementById("order-status");
    statusEl.textContent = "❌ Клієнт скасував замовлення";
    statusEl.style.background = "#e74c3c";
    statusEl.style.color = "#fff";

    alert("Клієнт скасував замовлення");
    
    setTimeout(() => {
        window.location.href = "driver.html";
    }, 1000);
}
    } catch (error) {
        console.error("Помилка перевірки статусу:", error);
    }
}
// =====================================================
