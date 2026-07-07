// ======================
// Кнопка "Свободен"
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
// Карточки заказов
// ======================

const cards = document.querySelectorAll(".order-card");

cards.forEach(card => {

    card.addEventListener("click", () => {

        card.style.transform = "scale(.98)";

        setTimeout(() => {

            card.style.transform = "";

            // Переход на страницу заказа

            window.location.href = "reception-order.html";

        }, 120);

    });

});

// ======================
// Кнопки страницы заказа
// ======================

const takeBtn = document.querySelector(".take-btn");
const priceBtn = document.querySelector(".price-btn");
const cancelBtn = document.querySelector(".cancel-btn");

if (takeBtn) {

    takeBtn.addEventListener("click", () => {

        alert("Заказ принят");

    });

}

if (priceBtn) {

    priceBtn.addEventListener("click", () => {

        alert("Новая цена");

    });

}

if (cancelBtn) {

    cancelBtn.addEventListener("click", () => {

        history.back();

    });

}