// Crear mapa
const map = L.map("map").setView([-26.81, -60.46], 12);

// Capa base
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Objeto para almacenar capas añadidas
const capasMap = {};

// Función para cargar un GeoJSON y devolver la capa
function cargarCapa(url, color="blue") {
    return fetch(url)
        .then(res => res.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                style: { color: color, weight: 2 },
                onEachFeature: (feature, layer) => {
                    const props = Object.entries(feature.properties)
                        .map(([k,v]) => `${k}: ${v}`).join("<br>");
                    layer.bindPopup(props);
                }
            });
            return layer;
        });
}

// Función para crear los checkboxes
function crearCheckbox(nombre) {
    const contenedor = document.getElementById("capas");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = nombre;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + nombre));
    contenedor.appendChild(label);

    // Evento al cambiar checkbox
    checkbox.addEventListener("change", async (e) => {
        const nombre = e.target.value;
        if (e.target.checked) {
            // Añadir capa al mapa
            if (!capasMap[nombre]) {
                capasMap[nombre] = await cargarCapa("/data/" + nombre);
            }
            capasMap[nombre].addTo(map);
            map.fitBounds(capasMap[nombre].getBounds());
        } else {
            // Quitar capa del mapa
            if (capasMap[nombre]) {
                map.removeLayer(capasMap[nombre]);
            }
        }
    });
}

// Cargar listado de capas desde backend
fetch("/api/capas")
    .then(res => res.json())
    .then(data => {
        data.capas.forEach(nombre => crearCheckbox(nombre));
    })
    .catch(err => console.error("Error cargando listado de capas:", err));
