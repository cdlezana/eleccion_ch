// Crear mapa
const map = L.map("map").setView([-26.81, -60.46], 12);

// Capa base
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Objeto para almacenar capas añadidas
const capasMap = {};
let escuelasLayer = null;  // capa de escuelas

// Función para cargar cualquier GeoJSON
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

// Crear checkboxes dinámicos
function crearCheckbox(nombre) {
    const contenedor = document.getElementById("capas");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = nombre;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + nombre));
    contenedor.appendChild(label);

    checkbox.addEventListener("change", async (e) => {
        const nombre = e.target.value;

        if (e.target.checked) {
            if (!capasMap[nombre]) {
                capasMap[nombre] = await cargarCapa("/data/" + nombre);
            }
            capasMap[nombre].addTo(map);

            // Guardamos la capa de escuelas
            if (nombre === "escuelas_sp_completo.geojson") {
                escuelasLayer = capasMap[nombre];
            }

            map.fitBounds(capasMap[nombre].getBounds());

            // Si es barrios, añadir click para conteo de escuelas
            if (nombre.includes("barrios")) {
                capasMap[nombre].eachLayer((layer) => {
                    layer.on("click", function(e) {
                        if (!escuelasLayer) {
                            layer.bindPopup(`<b>${layer.feature.properties.nombre}</b><br>No hay capa de escuelas activada`).openPopup();
                            return;
                        }

                        // Contar escuelas primarias dentro del barrio
                        let count = 0;
                        escuelasLayer.eachLayer((escuela) => {
                            const geom = escuela.feature.geometry;

                            // Procesar solo Point o MultiPoint
                            if (geom.type === "Point") {
                                const pt = {
                                    type: "Feature",
                                    geometry: geom,
                                    properties: escuela.feature.properties
                                };
                                if (pt.properties.nvcprimario === 1 && turf.booleanPointInPolygon(pt, layer.feature)) {
                                    count++;
                                }
                            } else if (geom.type === "MultiPoint") {
                                geom.coordinates.forEach(coord => {
                                    const pt = {
                                        type: "Feature",
                                        geometry: { type: "Point", coordinates: coord },
                                        properties: escuela.feature.properties
                                    };
                                    if (pt.properties.nvcprimario === 1 && turf.booleanPointInPolygon(pt, layer.feature)) {
                                        count++;
                                    }
                                });
                            }
                        });

                        layer.bindPopup(`<b>${layer.feature.properties.nombre}</b><br>Escuelas primarias: ${count}`).openPopup();
                    });
                });
            }

        } else {
            // Quitar capa
            if (capasMap[nombre]) map.removeLayer(capasMap[nombre]);
            if (nombre === "escuelas_sp_completo.geojson") escuelasLayer = null;
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
