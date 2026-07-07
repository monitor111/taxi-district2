// Кнопка "Свободен"

const statusBtn = document.querySelector(".status-btn");

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

// Нажатие на заказ

const cards = document.querySelectorAll(".order-card");

cards.forEach(card => {

    card.addEventListener("click", () => {

        card.style.transform = "scale(.98)";

        setTimeout(() => {

            card.style.transform = "";

        }, 120);

        // Здесь позже откроется страница заказа

    });

});