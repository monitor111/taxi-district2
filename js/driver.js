// ======================
// 1. ЛОГИКА РЕГИСТРАЦИИ ВОДИТЕЛЯ
// ======================
const registrationModal = document.getElementById("registrationModal");
const carModal = document.getElementById("carModal");
const saveDriverBtn = document.getElementById("saveDriverBtn");
const saveCarBtn = document.getElementById("saveCarBtn");

// Проверяем, есть ли сохраненный телефон водителя
let driverPhone = localStorage.getItem("driver_phone") || "";

async function checkDriverStatus() {
    if (!driverPhone) {
        showRegistrationModal();
        return;
    }

    try {
        const response = await fetch(`/api/check_driver.php?phone=${encodeURIComponent(driverPhone)}`);
        const data = await response.json();

        if (data.status === "not_found" || data.status === "need_name_phone") {
            showRegistrationModal();
        } else if (data.status === "need_car") {
            showCarModal();
        } else if (data.status === "full") {
            // Всё заполнено, можно грузить заказы
            loadDriverName();
            loadOrders();
        }
    } catch (error) {
        console.error("Ошибка проверки водителя:", error);
    }
}

function showRegistrationModal() {
    if (registrationModal) registrationModal.classList.remove("hidden");
    if (driverPhone && document.getElementById("driverPhone")) {
        document.getElementById("driverPhone").value = driverPhone;
    }
}

function showCarModal() {
    if (carModal) carModal.classList.remove("hidden");
}

// Сохранение имени и телефона
if (saveDriverBtn) {
    saveDriverBtn.addEventListener("click", async () => {
        const name = document.getElementById("driverName").value.trim();
        const phone = document.getElementById("driverPhone").value.trim();

        if (!name || !phone) {
            alert("Будь ласка, заповніть ім'я та телефон");
            return;
        }

        await registerDriver({ phone, name });
    });
}

// Сохранение данных авто
if (saveCarBtn) {
    saveCarBtn.addEventListener("click", async () => {
        const car_make = document.getElementById("carMake").value.trim();
        const car_number = document.getElementById("carNumber").value.trim();
        const car_year = document.getElementById("carYear").value.trim();

        if (!car_make || !car_number) {
            alert("Будь ласка, вкажіть марку та номер авто");
            return;
        }

        await registerDriver({ 
            phone: driverPhone, 
            car_make, 
            car_number, 
            car_year 
        });
    });
}

async function registerDriver(data) {
    try {
        const response = await fetch("/api/register_driver.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            localStorage.setItem("driver_phone", data.phone);
            driverPhone = data.phone;
            
            // Скрываем модальные окна
            if (registrationModal) registrationModal.classList.add("hidden");
            if (carModal) carModal.classList.add("hidden");
            
            alert("Дані збережено!");
            checkDriverStatus(); // Проверяем статус снова
        } else {
            alert("Помилка: " + result.error);
        }
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        alert("Не вдалося зв'язатися з сервером");
    }
}

// ======================
// 2. ЗАГРУЗКА ЗАКАЗОВ (Динамическая)
// ======================
const ordersContainer = document.querySelector(".orders");

async function loadOrders() {
    if (!ordersContainer) return;

    try {
        const response = await fetch("/api/get_orders.php");
        const orders = await response.json();

        if (!Array.isArray(orders)) return;

        ordersContainer.innerHTML = "";

        if (orders.length === 0) {
            ordersContainer.innerHTML = "<p style='text-align:center; color:#777; padding:20px;'>Поки немає вільних замовлень</p>";
            return;
        }

        orders.forEach(order => {
            const time = order.created_at ? order.created_at.substring(11, 16) : "--:--";
            const from = order.from_address; 
            const to = order.to_address;
            const price = Math.round(order.offered_price);

            const card = document.createElement("div");
            card.className = "order-card";
            
            const fromDisplay = order.from_sector || from;
            const toDisplay = order.to_sector || to;
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

            card.addEventListener("click", () => {
                window.location.href = `reception-order.html?id=${order.id}`;
            });

            ordersContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Ошибка загрузки заказов:", error);
    }
}

// Запускаем проверку водителя при загрузке страницы
if (ordersContainer) {
    checkDriverStatus();
    setInterval(loadOrders, 7000); // Обновляем список каждые 7 сек
}

// ======================
// 3. КНОПКА "СВОБОДЕН"
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
// 4. ЗАГРУЗКА ИМЕНИ ВОДИТЕЛЯ
// ======================
async function loadDriverName() {
    if (!driverPhone) return;

    try {
        const response = await fetch(`/api/get_driver.php?phone=${encodeURIComponent(driverPhone)}`);
        const data = await response.json();

        const greetingEl = document.getElementById("driver-greeting");
        if (greetingEl && data.name) {
            greetingEl.textContent = `Вітаємо, ${data.name}!`;
        }
    } catch (error) {
        console.error("Ошибка загрузки имени водителя:", error);
    }
}