// Initialize map
const map = L.map('map').setView([40.7128, -74.0060], 13); // Default to NYC coordinates

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
}).addTo(map);

// Initialize markers array to keep track of markers
let markers = [];
let currentResults = [];

// Initialize rename switch from local storage
const renameSwitch = document.getElementById('rename-switch');
renameSwitch.checked = localStorage.getItem('renameToBeyondBank') !== 'false';

// Save switch state to local storage
renameSwitch.addEventListener('change', (e) => {
    localStorage.setItem('renameToBeyondBank', e.target.checked);
    // Update current results if any
    if (currentResults.length > 0) {
        updateResultsList(currentResults);
        updateMarkers(currentResults);
    }
});

// Initial animation
gsap.to('.container', {
    opacity: 1,
    duration: 1,
    ease: 'power2.out'
});

// Function to get location name based on switch state
function getLocationName(originalName, type) {
    if (renameSwitch.checked) {
        return 'Beyond Bank';
    }
    return originalName || type;
}

// Function to clear existing markers
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Function to add a marker with animation
function addMarker(lat, lon, title, details) {
    const marker = L.marker([lat, lon])
        .bindPopup(`<strong>${title}</strong><br>${details}`)
        .addTo(map);
    markers.push(marker);

    // Animate marker popup
    gsap.from(marker.getElement(), {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: 'back.out'
    });

    return marker;
}

// Function to update markers
function updateMarkers(results) {
    clearMarkers();
    results.forEach(result => {
        const name = getLocationName(result.name, result.type);
        addMarker(result.lat, result.lon, name, `${result.type} - ${result.distance.toFixed(2)}km away`);
    });
}

// Function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Function to update results list
function updateResultsList(results) {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';
    
    results.forEach((result, index) => {
        const distance = result.distance.toFixed(2);
        const name = getLocationName(result.name, result.type);
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <h3>${name}</h3>
            <p>${distance} km away</p>
        `;
        
        // Add click event to zoom to location
        div.addEventListener('click', () => {
            map.setView([result.lat, result.lon], 17);
            markers[index].openPopup();
            
            // Animate the clicked item
            gsap.to(div, {
                backgroundColor: '#e3f2fd',
                duration: 0.3,
                yoyo: true,
                repeat: 1
            });
        });
        
        resultsList.appendChild(div);
    });
}

// Function to handle address suggestions
async function getSuggestions(query) {
    if (!query) {
        document.getElementById('suggestions').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        const suggestions = document.getElementById('suggestions');
        suggestions.innerHTML = '';
        
        if (data.length > 0) {
            suggestions.style.display = 'block';
            
            data.slice(0, 5).forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = item.display_name;
                
                div.addEventListener('click', () => {
                    document.getElementById('search-input').value = item.display_name;
                    suggestions.style.display = 'none';
                    searchLocation(item.lat, item.lon);
                });
                
                suggestions.appendChild(div);
            });
        } else {
            suggestions.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

// Function to search for ATMs and banks
async function searchLocation(predefinedLat, predefinedLon) {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    
    if (!query && !predefinedLat) return;

    try {
        // Animate search button
        gsap.to('#search-btn', {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });

        let lat, lon;
        
        if (predefinedLat && predefinedLon) {
            lat = predefinedLat;
            lon = predefinedLon;
        } else {
            // Get coordinates for the searched location
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
            const response = await fetch(nominatimUrl);
            const data = await response.json();
            
            if (data.length === 0) return;
            
            lat = data[0].lat;
            lon = data[0].lon;
        }
        
        // Center map on searched location
        map.setView([lat, lon], 14);

        // Clear existing markers
        clearMarkers();

        // Search for ATMs and banks in the area
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="atm"](around:2000,${lat},${lon});node["amenity"="bank"](around:2000,${lat},${lon}););out body;`;
        const poiResponse = await fetch(overpassUrl);
        const poiData = await poiResponse.json();

        // Process and sort results by distance
        currentResults = poiData.elements.map(element => {
            const type = element.tags.amenity === 'atm' ? 'ATM' : 'Bank';
            const name = element.tags.name || type;
            const distance = calculateDistance(lat, lon, element.lat, element.lon);
            
            return {
                name,
                type,
                lat: element.lat,
                lon: element.lon,
                distance
            };
        });

        // Sort by distance and take top 5
        currentResults.sort((a, b) => a.distance - b.distance);
        currentResults = currentResults.slice(0, 5);

        // Add markers and update results list
        updateMarkers(currentResults);
        updateResultsList(currentResults);

    } catch (error) {
        console.error('Error:', error);
    }
}

// Event listeners
document.getElementById('search-btn').addEventListener('click', () => searchLocation());
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchLocation();
});

// Add input event listener for suggestions
let debounceTimer;
document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => getSuggestions(e.target.value), 300);
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) {
        document.getElementById('suggestions').style.display = 'none';
    }
});

// Animate search box on focus
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('focus', () => {
    gsap.to('.search-box', {
        scale: 1.02,
        duration: 0.3,
        ease: 'power2.out'
    });
});

searchInput.addEventListener('blur', () => {
    gsap.to('.search-box', {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
    });
});
