// Add this near the top of script.js
const verticalConfig = {
    'retail': {
        icon: 'fa-shopping-cart',
        color: '#000000',
        textColor: '#FFFFFF'
    },
    'bank': {
        icon: 'fa-landmark',
        color: '#00008B',
        textColor: '#FFFFFF'
    },
    'health': {
        icon: 'fa-hospital',
        color: '#006400',
        textColor: '#FFFFFF'
    },
    'education': {
        icon: 'fa-graduation-cap',
        color: '#4B0082',
        textColor: '#FFFFFF'
    },
    'tech': {
        icon: 'fa-microchip',
        color: '#007BFF',
        textColor: '#FFFFFF'
    },
    'default': {
        icon: 'fa-landmark',
        color: '#155e8b',
        textColor: '#FFFFFF'
    }
};

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

// Get location type from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const locationType = urlParams.get('type') || 'bank'; // Default to 'bank' if no type specified

// Function to get location name based on switch state
function getLocationName(originalName, type) {
    if (renameSwitch.checked) {
        // Capitalize first letter of locationType
        const displayType = locationType.charAt(0).toUpperCase() + locationType.slice(1);
        return `Beyond ${displayType}`;
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
    if (!query || query.length < 3) { // Only search if query is 3+ characters
        document.getElementById('suggestions').style.display = 'none';
        return;
    }

    try {
        // Add error handling timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, 
            {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'BeyondLocator/1.0', // Add user agent
                    'Accept-Language': 'en' // Specify language
                }
            }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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
        // Show user-friendly error message
        const suggestions = document.getElementById('suggestions');
        suggestions.innerHTML = '<div class="suggestion-item error">Unable to fetch suggestions. Please try again.</div>';
        suggestions.style.display = 'block';
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

        // Search for locations in the area
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="${locationType}"](around:2000,${lat},${lon}););out body;`;
        const poiResponse = await fetch(overpassUrl);
        const poiData = await poiResponse.json();

        // Process and sort results by distance
        currentResults = poiData.elements.map(element => {
            // Capitalize first letter of locationType for display
            const displayType = locationType.charAt(0).toUpperCase() + locationType.slice(1);
            const type = element.tags.amenity === locationType ? displayType : displayType;
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
    debounceTimer = setTimeout(() => getSuggestions(e.target.value), 500); // Increased to 500ms
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

// Initialize variables
let latencyChart, errorChart, networkPolarChart;
let latencyData = [];
let errorData = [];
const maxDataPoints = 20;
let updateInterval;

// Initialize status section
function initializeStatusSection() {
    const statusToggle = document.getElementById('status-toggle');
    const statusContent = document.getElementById('status-content');
    
    if (!statusToggle || !statusContent) {
        console.error('Status section elements not found');
        return;
    }

    // Get saved state from localStorage
    const isOpen = localStorage.getItem('statusSectionOpen') !== 'false';
    
    if (!isOpen) {
        statusToggle.classList.remove('active');
        statusContent.classList.remove('active');
    }

    // Initialize charts if section is open
    if (isOpen) {
        initializeCharts();
        updateInterval = setInterval(updateCharts, 1000);
    }

    // Add click event listener
    statusToggle.addEventListener('click', () => {
        const isNowOpen = !statusToggle.classList.contains('active');
        
        // Toggle classes
        statusToggle.classList.toggle('active');
        statusContent.classList.toggle('active');
        
        // Save state to localStorage
        localStorage.setItem('statusSectionOpen', isNowOpen);
        
        // Initialize or clear interval based on state
        if (isNowOpen) {
            initializeCharts();
            updateInterval = setInterval(updateCharts, 1000);
        } else {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        }
    });
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStatusSection);
} else {
    initializeStatusSection();
}

function initializeCharts() {
    if (latencyChart || errorChart || networkPolarChart) return;

    // Initialize with static data points for line chart
    const timeLabels = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMinutes(date.getMinutes() - (11 - i));
        return date;
    });

    latencyData = timeLabels.map(() => Math.floor(90 + Math.random() * 10));
    errorData = Array.from({ length: maxDataPoints }, () => Math.floor(Math.random() * 5));

    // Create latency chart (static with animation)
    const latencyCtx = document.getElementById('latencyChart').getContext('2d');
    latencyChart = new Chart(latencyCtx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Network Latency',
                data: latencyData,
                borderColor: 'rgb(6, 33, 127)',
                backgroundColor: 'rgba(6, 33, 127, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 120,
                    title: {
                        display: true,
                        text: 'Latency (ms)'
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });

    // Create error chart (animated)
    const errorCtx = document.getElementById('errorChart').getContext('2d');
    errorChart = new Chart(errorCtx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: maxDataPoints }, (_, i) => `${i + 1}s ago`),
            datasets: [{
                label: 'Network Errors',
                data: errorData,
                backgroundColor: 'rgba(57, 84, 182, 0.8)',
                borderColor: 'rgb(57, 84, 182)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Create network polar area chart
    const polarCtx = document.getElementById('networkPolarChart').getContext('2d');
    networkPolarChart = new Chart(polarCtx, {
        type: 'polarArea',
        data: {
            labels: [
                'Response Time',
                'Bandwidth Usage',
                'Connection Strength',
                'Data Transfer',
                'Network Security',
                'Server Load'
            ],
            datasets: [{
                label: 'Network Metrics',
                data: [
                    85,  // Response Time
                    92,  // Bandwidth Usage
                    78,  // Connection Strength
                    88,  // Data Transfer
                    95,  // Network Security
                    82   // Server Load
                ],
                backgroundColor: [
                    'rgba(6, 33, 127, 0.7)',
                    'rgba(57, 84, 182, 0.7)',
                    'rgba(82, 113, 255, 0.7)',
                    'rgba(116, 143, 252, 0.7)',
                    'rgba(145, 167, 255, 0.7)',
                    'rgba(179, 194, 255, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                r: {
                    ticks: {
                        beginAtZero: true,
                        max: 100,
                        stepSize: 20,
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 14
                        },
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Network Performance Metrics',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                }
            }
        }
    });
}

// Update only the error chart
function updateCharts() {
    if (!errorChart) return;

    // Update error data
    errorData.push(Math.floor(Math.random() * 5));
    if (errorData.length > maxDataPoints) {
        errorData.shift();
    }
    errorChart.data.datasets[0].data = errorData;
    errorChart.update('none');
}

// Update the icon and colors based on location type
function updateBranding() {
    const config = verticalConfig[locationType] || verticalConfig.default;
    
    // Update icon
    const iconElement = document.querySelector('.brand i');
    iconElement.className = `fas ${config.icon}`;
    
    // Update colors
    const brandDiv = document.querySelector('.brand div[role="img"]');
    brandDiv.style.background = config.color;
    
    // Update text color
    iconElement.style.color = config.textColor;
    
    // Update other brand elements if needed
    document.documentElement.style.setProperty('--primary-color', config.color);
}

// Call this after getting locationType
updateBranding();

// Add this function to handle all title/text updates
function updatePageTitles() {
    const displayType = locationType.charAt(0).toUpperCase() + locationType.slice(1);
    
    // Update document title
    document.title = `Beyond ${displayType} Locator`;
    
    // Update meta description
    document.querySelector('meta[name="description"]').content = `Find Beyond ${displayType} locations and track network status`;
    
    // Update app title
    document.querySelector('meta[name="apple-mobile-web-app-title"]').content = `BB ${displayType} Finder`;
    
    // Update page headers
    document.getElementById('locator-title').textContent = `${displayType} Locator`;
    document.getElementById('results-title').textContent = `Nearest ${displayType} Locations`;
    
    // Update switch label
    document.querySelector('.switch-label').textContent = `Rename to Beyond ${displayType}`;
}

// Call updatePageTitles after getting locationType
updatePageTitles();

// Add this function to update the brand section
function updateBrandSection() {
    const displayType = locationType.charAt(0).toUpperCase() + locationType.slice(1);
    
    // Update brand icon and color based on type
    const brandIcon = document.querySelector('.brand i');
    const brandBackground = document.querySelector('.brand div[role="img"]');
    const brandName = document.querySelector('.brand h1');
    
    // Update icon and colors based on type
    const config = verticalConfig[locationType] || verticalConfig.default;
    
    // Update icon class
    brandIcon.className = `fas ${config.icon}`;
    
    // Update background color
    brandBackground.style.background = config.color;
    
    // Update text color
    brandIcon.style.color = config.textColor;
    
    // Update brand name
    brandName.textContent = `Beyond ${displayType}`;
}

// Call this function after getting locationType
updateBrandSection();
