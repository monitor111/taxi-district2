// Проверка

console.log("client.js подключен");

let streets = [];

let selectedStreet = "";

let fromLat = "";
let fromLon = "";

let toLat = "";
let toLon = "";

fetch("../streets.json")
    .then(response => response.json())
    .then(data => {

        streets = data;

        console.log("Улиц загружено:", streets.length);

    });

// Поле "Откуда"

const fromInput = document.getElementById("from");
const fromList = document.getElementById("from-list");
const fromError = document.getElementById("from-error");

// Поле "Куда"

const toInput = document.getElementById("to");
const toList = document.getElementById("to-list");
const calcBtn = document.getElementById("calcBtn");
const routeInfo = document.getElementById("routeInfo");

fromInput.addEventListener("input", () => {

    if (fromInput.value.length < 3) {

        return;

    }

    if (selectedStreet !== "") {

        const house = fromInput.value.replace(selectedStreet, "").trim();

        fromLat = "";
        fromLon = "";

        if (house === "") {
            return;
        }

        fetch(
            "https://nominatim.openstreetmap.org/search?format=json" +
            "&limit=1" +
            "&countrycodes=ua" +
            "&q=" + encodeURIComponent(selectedStreet + " " + house + ", Дніпро")
        )
            .then(response => response.json())
            .then(data => {

                console.log(data);

                if (
                    data.length > 0 &&
                    (data[0].addresstype === "building" || data[0].addresstype === "house")
                ) {

                    fromLat = data[0].lat;
                    fromLon = data[0].lon;

                    fromError.textContent = "";
                    console.log("Координаты:", fromLat, fromLon);

                }

                else {

                    fromError.textContent = "Будинок не знайдено";

                }

            });

        return;

    }

    const result = streets.filter(street =>
        street.toLowerCase().includes(fromInput.value.toLowerCase())
    );

    fromList.innerHTML = "";

    result.forEach(street => {

        const div = document.createElement("div");

        div.textContent = street;

        div.addEventListener("click", () => {

            fromInput.value = street;

            selectedStreet = street;

            fromList.innerHTML = "";

        });

        fromList.appendChild(div);

    });

});

// Куда
toInput.addEventListener("input", () => {

    if (toInput.value.length < 3) {

        toList.innerHTML = "";
        return;

    }

    fetch(
        "https://nominatim.openstreetmap.org/search?format=json" +
        "&limit=5" +
        "&countrycodes=ua" +
        "&q=" + encodeURIComponent(toInput.value + ", Дніпро")
    )

        .then(response => response.json())

        .then(data => {

            toList.innerHTML = "";

            data.forEach(item => {

                console.log(item);

                const div = document.createElement("div");

                div.textContent = item.display_name.split(",").slice(0, 2).join(", ");

                div.addEventListener("click", () => {

                    toInput.value = item.display_name.split(",").slice(0, 2).join(", ");

                    toLat = item.lat;
                    toLon = item.lon;

                    toList.innerHTML = "";

                    console.log("Куди:", toLat, toLon);

                });

                toList.appendChild(div);

            });

        });

});

calcBtn.addEventListener("click", () => {

    console.log("FROM:", fromLat, fromLon);

    console.log("TO:", toLat, toLon);

    fetch(
        "https://router.project-osrm.org/route/v1/driving/" +
        fromLon + "," + fromLat + ";" +
        toLon + "," + toLat +
        "?overview=false"
    )

        .then(response => response.json())

        .then(data => {

            console.log(data);

            const distanceKm = (data.routes[0].distance / 1000).toFixed(1);

            routeInfo.textContent = "Відстань: " + distanceKm + " км";

        });

});