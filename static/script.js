
// ----------------------------------
// 1. Initialize OpenStreetMap
// ----------------------------------

const map = L.map("map").setView(
    [16.54588378517661, 81.51918504220544],
    14
);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
}).addTo(map);

// Hospital markers and routes
const mapLayers = L.layerGroup().addTo(map);

// Temporary emergency location marker
const selectionLayer = L.layerGroup().addTo(map);

// Location selection status
let isMapSelectionActive = false;


// ----------------------------------
// 2. Common Location Function
// ----------------------------------

function setEmergencyLocation(latitude, longitude, message) {

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 || lat > 90 ||
        lon < -180 || lon > 180
    ) {
        alert("Invalid location coordinates.");
        return;
    }

    document.getElementById("latitude").value = lat;
    document.getElementById("longitude").value = lon;

    const status = document.getElementById("locationStatus");

    status.textContent = message;
    status.className = "success";

    // Remove previous selected location marker
    selectionLayer.clearLayers();

    // Add selected emergency location marker
    const selectedMarker = L.marker([lat, lon]).addTo(selectionLayer);

    selectedMarker.bindPopup(
        "<b>Selected Emergency Location</b>"
    );

    map.setView([lat, lon], 16);

    selectedMarker.openPopup();
}


// ----------------------------------
// 3. Search Emergency Address
// ----------------------------------


document.getElementById("searchAddress").addEventListener(
    "click",
    async function () {

        const address = document
            .getElementById("emergencyAddress")
            .value.trim();

        const button = document.getElementById("searchAddress");
        const status = document.getElementById("locationStatus");

        if (address === "") {
            alert("Please enter an emergency address or landmark.");
            return;
        }

        button.disabled = true;
        button.textContent = "Searching Location...";

        status.textContent = "Searching for the location...";
        status.className = "";

        try {

            // Search using original address first
            const searchQueries = [
                address,
                address + ", Andhra Pradesh, India"
            ];

            let locations = [];

            for (const query of searchQueries) {

                const searchURL =
                    "https://nominatim.openstreetmap.org/search?" +
                    "format=jsonv2&limit=5&countrycodes=in&q=" +
                    encodeURIComponent(query);

                const response = await fetch(searchURL);

                if (!response.ok) {
                    throw new Error(
                        "Location search service is unavailable. Please try again."
                    );
                }

                locations = await response.json();

                if (locations && locations.length > 0) {
                    break;
                }

                // Wait briefly before retrying
                await new Promise(resolve => setTimeout(resolve, 1200));
            }

            // If no location is found
            if (!locations || locations.length === 0) {

                throw new Error(
                    "Location not found. Try entering a nearby landmark, area, or city name."
                );

            }

            // If multiple locations are found, ask user to choose
            let selectedLocation = locations[0];

            if (locations.length > 1) {

                const choices = locations.map(
                    (location, index) =>
                        `${index + 1}. ${location.display_name}`
                ).join("\n\n");

                const choice = prompt(
                    "Multiple locations found. Select the correct location by entering its number:\n\n" +
                    choices
                );

                if (choice === null) {
                    status.textContent = "Location selection cancelled.";
                    status.className = "";
                    return;
                }

                const selectedIndex = Number(choice) - 1;

                if (
                    !Number.isInteger(selectedIndex) ||
                    selectedIndex < 0 ||
                    selectedIndex >= locations.length
                ) {
                    throw new Error(
                        "Invalid selection. Please search again."
                    );
                }

                selectedLocation = locations[selectedIndex];

            }

            // Extract coordinates
            const latitude = Number(selectedLocation.lat);
            const longitude = Number(selectedLocation.lon);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                throw new Error("Invalid coordinates received.");
            }

            // Fill coordinates and display marker
            setEmergencyLocation(
                latitude,
                longitude,
                "Location found: " +
                selectedLocation.display_name +
                ". Please verify the map marker."
            );

        } catch (error) {

            status.textContent = error.message;
            status.className = "error";

            console.error("Address search error:", error);

        } finally {

            button.disabled = false;
            button.textContent = "🔍 Search Location";

        }

    }
);


// ----------------------------------
// 4. Use Current Location
// ----------------------------------

document.getElementById("useCurrentLocation").addEventListener(
    "click",
    function () {

        const status = document.getElementById("locationStatus");
        const button = document.getElementById("useCurrentLocation");

        if (!navigator.geolocation) {

            status.textContent =
                "Your browser does not support location detection.";

            status.className = "error";
            return;
        }

        button.disabled = true;
        button.textContent = "Detecting Location...";

        status.textContent =
            "Please allow location permission in your browser.";

        status.className = "";

        navigator.geolocation.getCurrentPosition(

            function (position) {

                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                setEmergencyLocation(
                    latitude,
                    longitude,
                    "Current device location detected. Confirm that this is the emergency location."
                );

                button.disabled = false;
                button.textContent = "📍 Use My Current Location";

            },

            function (error) {

                let message = "Unable to detect your location.";

                if (error.code === error.PERMISSION_DENIED) {
                    message = "Location permission denied. Please allow location access.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    message = "Current location is unavailable.";
                } else if (error.code === error.TIMEOUT) {
                    message = "Location request timed out. Please try again.";
                }

                status.textContent = message;
                status.className = "error";

                button.disabled = false;
                button.textContent = "📍 Use My Current Location";

            },

            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }

        );

    }
);


// ----------------------------------
// 5. Select Emergency Location on Map
// ----------------------------------

document.getElementById("selectOnMap").addEventListener(
    "click",
    function () {

        const button = document.getElementById("selectOnMap");
        const status = document.getElementById("locationStatus");

        isMapSelectionActive = !isMapSelectionActive;

        if (isMapSelectionActive) {

            button.textContent = "Cancel Map Selection";

            status.textContent =
                "Now click on the map where the emergency occurred.";

            status.className = "";

            map.getContainer().style.cursor = "crosshair";

        } else {

            button.textContent = "🗺️ Select Location on Map";

            status.textContent = "Map selection cancelled.";

            status.className = "";

            map.getContainer().style.cursor = "";

        }

    }
);


// Listen for map clicks

map.on("click", function (event) {

    if (!isMapSelectionActive) {
        return;
    }

    const latitude = event.latlng.lat;
    const longitude = event.latlng.lng;

    setEmergencyLocation(
        latitude,
        longitude,
        "Emergency location selected on the map. Please verify the marker."
    );

    isMapSelectionActive = false;

    document.getElementById("selectOnMap").textContent =
        "🗺️ Select Location on Map";

    map.getContainer().style.cursor = "";

});


// ----------------------------------
// 6. Emergency Location Marker
// ----------------------------------

function addEmergencyMarker(latitude, longitude) {

    const emergencyIcon = L.divIcon({

        className: "emergency-custom-marker",

        html: `
            <div style="
                width: 22px;
                height: 22px;
                background: #ff0000;
                border: 4px solid white;
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(255,0,0,0.8);
            "></div>
        `,

        iconSize: [22, 22],
        iconAnchor: [11, 11]

    });

    const emergencyMarker = L.marker(
        [latitude, longitude],
        {
            icon: emergencyIcon,
            zIndexOffset: 1000
        }
    ).addTo(mapLayers);

    emergencyMarker.bindPopup(
        "<b>🔴 Emergency Location</b>"
    );

}


// ----------------------------------
// 7. Find Recommended Hospitals
// ----------------------------------

document.getElementById("findHospitals").addEventListener(
    "click",
    async function () {

        const latitude = document.getElementById("latitude").value;
        const longitude = document.getElementById("longitude").value;
        const emergency = document.getElementById("emergency").value;

        const resultsDiv = document.getElementById("results");
        const button = document.getElementById("findHospitals");

        if (latitude === "" || longitude === "" || emergency === "") {

            alert("Please select an emergency location and emergency type.");
            return;

        }

        const originLat = Number(latitude);
        const originLon = Number(longitude);

        if (
            !Number.isFinite(originLat) ||
            !Number.isFinite(originLon) ||
            originLat < -90 || originLat > 90 ||
            originLon < -180 || originLon > 180
        ) {

            alert("Please enter valid latitude and longitude!");
            return;

        }

        button.disabled = true;
        button.textContent = "Finding Hospitals...";

        resultsDiv.innerHTML = `
            <h2>Hospital Recommendations</h2>
            <p>Finding suitable hospitals. Please wait...</p>
        `;

        // Clear previous markers and routes
        mapLayers.clearLayers();
        selectionLayer.clearLayers();

        try {

            // Send details to Flask backend

            const response = await fetch("/recommend", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    latitude: originLat,
                    longitude: originLon,
                    emergency_type: emergency
                })

            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Unable to find hospitals.");
            }

            const hospitals = data.hospitals || [];

            // Add emergency marker even if no hospitals match

            addEmergencyMarker(originLat, originLon);

            if (hospitals.length === 0) {

                resultsDiv.innerHTML = `
                    <h2>Hospital Recommendations</h2>
                    <p>No matching hospitals found. Please verify hospital services.</p>
                `;

                map.setView([originLat, originLon], 14);

                return;

            }


            // ----------------------------------
            // 8. Display Hospital Information
            // ----------------------------------

            let output = `

                <div class="recommendation-heading">

                    <div>
                        <h2>Top Hospital Recommendations</h2>
                        <p>Hospitals ranked by estimated road travel time</p>
                    </div>

                    <span class="result-count">
                        ${hospitals.length} Matches
                    </span>

                </div>

                <div class="hospital-list">

            `;


            hospitals.forEach(function (hospital, index) {

                const rankClass = index === 0
                    ? "rank-first"
                    : "rank-other";

                const rankLabel = index === 0
                    ? "TOP MATCH"
                    : "RECOMMENDED";

                output += `

                    <div class="premium-hospital-card">

                        <div class="hospital-card-top">

                            <div class="hospital-title">

                                <span class="rank-badge ${rankClass}">
                                    #${hospital.rank}
                                </span>

                                <div>
                                    <h3>${hospital.facility}</h3>

                                    <p class="hospital-id">
                                        Hospital ID: ${hospital.hosp_id}
                                    </p>
                                </div>

                            </div>

                            <span class="match-label">
                                ${rankLabel}
                            </span>

                        </div>

                        <div class="hospital-address">
                            <span>📍</span>
                            <p>${hospital.address || "Address not available"}</p>
                        </div>

                        <div class="hospital-metrics">

                            <div class="metric-box">

                                <span class="metric-icon">🛣️</span>

                                <div>
                                    <small>Road Distance</small>

                                    <strong>
                                        ${Number(hospital.road_distance_km).toFixed(2)} km
                                    </strong>
                                </div>

                            </div>

                            <div class="metric-box">

                                <span class="metric-icon">⏱️</span>

                                <div>
                                    <small>Estimated Travel Time</small>

                                    <strong>
                                        ${Number(hospital.travel_time_min).toFixed(2)} min
                                    </strong>
                                </div>

                            </div>

                        </div>

                        <div class="service-status">
                            <span>✓</span>
                            Publicly listed matching service
                        </div>

                    </div>

                `;

            });


            output += `</div>`;

            output += `

                <p class="verification-info">

                    <strong>Service verification required:</strong>

                    ${
                        (data.unknown_hospitals || []).join(", ") ||
                        "No additional unknown records"
                    }

                </p>

            `;

            resultsDiv.innerHTML = output;


            // ----------------------------------
            // 9. Add Hospital Markers
            // ----------------------------------

            const allCoordinates = [
                [originLat, originLon]
            ];

            hospitals.forEach(function (hospital) {

                const hospitalLat = Number(hospital.lat);
                const hospitalLon = Number(hospital.lon);

                if (
                    !Number.isFinite(hospitalLat) ||
                    !Number.isFinite(hospitalLon)
                ) {
                    return;
                }

                const marker = L.marker(
                    [hospitalLat, hospitalLon]
                ).addTo(mapLayers);

                marker.bindPopup(`

                    <b>Rank ${hospital.rank}: ${hospital.facility}</b><br>

                    Distance:
                    ${Number(hospital.road_distance_km).toFixed(2)} km<br>

                    Estimated time:
                    ${Number(hospital.travel_time_min).toFixed(2)} min

                `);

                allCoordinates.push([hospitalLat, hospitalLon]);

            });


            // ----------------------------------
            // 10. Draw Road Routes using OSRM
            // ----------------------------------

            const routeColors = [
                "#16a085",
                "#2874a6",
                "#8e44ad"
            ];

            const routePromises = hospitals.map(
                async function (hospital, index) {

                    const hospitalLat = Number(hospital.lat);
                    const hospitalLon = Number(hospital.lon);

                    if (
                        !Number.isFinite(hospitalLat) ||
                        !Number.isFinite(hospitalLon) ||
                        hospitalLat < -90 || hospitalLat > 90 ||
                        hospitalLon < -180 || hospitalLon > 180
                    ) {

                        console.warn(
                            "Invalid hospital coordinates:",
                            hospital.facility
                        );

                        return;

                    }

                    const routeURL =
                        `https://router.project-osrm.org/route/v1/driving/` +
                        `${originLon},${originLat};${hospitalLon},${hospitalLat}` +
                        `?overview=full&geometries=geojson`;

                    try {

                        const routeResponse = await fetch(routeURL);

                        if (!routeResponse.ok) {
                            throw new Error(
                                "OSRM HTTP error: " + routeResponse.status
                            );
                        }

                        const routeData = await routeResponse.json();

                        if (
                            routeData.code !== "Ok" ||
                            !Array.isArray(routeData.routes) ||
                            !routeData.routes[0] ||
                            !routeData.routes[0].geometry ||
                            !Array.isArray(
                                routeData.routes[0].geometry.coordinates
                            )
                        ) {

                            console.warn(
                                "No valid route returned:",
                                hospital.facility
                            );

                            return;

                        }

                        const coordinates =
                            routeData.routes[0].geometry.coordinates.map(
                                function (point) {
                                    return [point[1], point[0]];
                                }
                            );

                        if (coordinates.length < 2) {

                            console.warn(
                                "Route has insufficient coordinates."
                            );

                            return;

                        }

                        const routeLine = L.polyline(coordinates, {

                            color: routeColors[index % routeColors.length],
                            weight: 6,
                            opacity: 0.9

                        });

                        routeLine.addTo(mapLayers);

                        console.log(
                            "ROUTE SUCCESS:",
                            hospital.facility
                        );

                    } catch (routeError) {

                        console.error(
                            "ROUTE ERROR:",
                            hospital.facility,
                            routeError
                        );

                    }

                }
            );


            // Wait for all route requests
            await Promise.all(routePromises);


            // ----------------------------------
            // 11. Zoom Map to Emergency Location
            // ----------------------------------

            map.setView([originLat, originLon], 14);

        } catch (error) {

            resultsDiv.innerHTML = `

                <h2>Hospital Recommendations</h2>
                <p>Error: ${error.message}</p>

            `;

            console.error(error);

        } finally {

            button.disabled = false;
            button.textContent = "Find Recommended Hospitals →";

        }

    }
);
