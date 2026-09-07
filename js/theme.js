const themeToggle = document.getElementById("theme-toggle");

// Загружаем сохранённую тему
const savedTheme = localStorage.getItem("taxi_theme");

if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");

    if (themeToggle) {
        themeToggle.textContent = "☀️";
    }
}

// Переключение темы
if (themeToggle) {
    themeToggle.addEventListener("click", () => {

        const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";

        if (isDark) {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("taxi_theme", "light");
            themeToggle.textContent = "🌙";
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("taxi_theme", "dark");
            themeToggle.textContent = "☀️";
        }

    });
}