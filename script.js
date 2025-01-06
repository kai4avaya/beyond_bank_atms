// HARD CODED THEMES
const themeConfig = {
    'retail': {
        color: '#000000',
        secondaryColor: '#404040',
        textColor: '#FFFFFF',
        items: 'Stores',
        icon: 'fa-store',
        brandName: 'Beyond-Retail'
    },
    'healthcare': {
        color: '#006400',
        secondaryColor: '#008000',
        textColor: '#FFFFFF',
        items: 'Hospitals',
        icon: 'fa-hospital',
        brandName: 'Beyond-Healthcare'
    },
    'tech': {
        color: '#007BFF',
        secondaryColor: '#0056b3',
        textColor: '#FFFFFF',
        items: 'Centers',
        icon: 'fa-microchip',
        brandName: 'Beyond-Tech'
    },
    'travel': {
        color: '#00CED1',
        secondaryColor: '#008B8B',
        textColor: '#000000',
        items: 'Locations',
        icon: 'fa-plane',
        brandName: 'Beyond-Travel'
    },
    'bank': {
        color: '#00008B',
        secondaryColor: '#000066',
        textColor: '#FFFFFF',
        items: 'ATMs',
        icon: 'fa-landmark',
        brandName: 'Beyond-Bank'
    }
};


const iconMappings = {
    'computer': 'fa-computer',
    'computers': 'fa-computer',
    'tech': 'fa-microchip',
    'college': 'fa-graduation-cap',
    'school': 'fa-school',
    'education': 'fa-graduation-cap',
    'food': 'fa-utensils',
    'restaurant': 'fa-utensils',
    'gym': 'fa-dumbbell',
    'fitness': 'fa-dumbbell',
    'office': 'fa-building',
    'default': 'fa-building'
};

// Add fallback icons array
const fallbackIcons = [
    'fa-building',
    'fa-location-dot',
    'fa-map-pin',
    'fa-clipboard-list',
    'fa-bookmark'
];
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

// URL UPDATER

let businessType = 'Bank'; // Default value


function getIconForType(type) {
    // Check direct match
    const lowercaseType = type.toLowerCase();
    if (iconMappings[lowercaseType]) {
        return iconMappings[lowercaseType];
    }
    
    // Check if any mapping key is contained in the type
    const matchingKey = Object.keys(iconMappings).find(key => 
        lowercaseType.includes(key)
    );
    if (matchingKey) {
        return iconMappings[matchingKey];
    }
    
    // Return random fallback icon
    return fallbackIcons[Math.floor(Math.random() * fallbackIcons.length)];
}

function generateThemeColors(seed) {
    const hash = seed.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    return {
        color: `hsl(${hue}, 60%, 30%)`,
        secondaryColor: `hsl(${hue}, 60%, 20%)`,
        textColor: '#FFFFFF'
    };
}

function getOrCreateTheme(type) {
    if (themeConfig[type.toLowerCase()]) {
        return themeConfig[type.toLowerCase()];
    }
    
    const { color, secondaryColor, textColor } = generateThemeColors(type);
    const icon = getIconForType(type);
    
    return {
        color,
        secondaryColor,
        textColor,
        items: 'Locations',
        icon,
        brandName: `Beyond-${type.charAt(0).toUpperCase() + type.slice(1)}`
    };
}
function updateThemeColors(type) {
    const theme = getOrCreateTheme(type);
    document.documentElement.style.setProperty('--primary-color', theme.color);
    document.documentElement.style.setProperty('--secondary-color', theme.secondaryColor);
    document.documentElement.style.setProperty('--text-color', theme.textColor);
    
    // Update brand icon colors
    const brandIcon = document.querySelector('.brand [role="img"]');
    if (brandIcon) {
        brandIcon.style.background = theme.color;
    }

        const icon = document.querySelector('.brand i.fas');
    if (icon) {
        icon.style.color = theme.textColor;
    }
}
function handleBusinessType() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    if (type) {
        // Capitalize first letter of type
        businessType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        const theme = getOrCreateTheme(businessType);
        
        // Update theme and branding
        updateThemeColors(businessType);
        updateIcon(theme.icon);
        updateBusinessTypeDisplay(theme.items);
        
        // Update global business type
        window.businessType = businessType;
    }
}


function updateIcon(iconClass) {
    const brandIcon = document.querySelector('.brand i.fas');
    if (brandIcon) {
        brandIcon.className = `fas ${iconClass}`;
    }
}
function updateBusinessTypeDisplay(itemName) {
    // Get theme config for current type, including dynamically generated ones
    const theme = getOrCreateTheme(businessType);
    
    // Update page title
    document.title = `${theme.brandName} ${itemName} Locator`;
    
    // Update header text
    const header = document.querySelector('.search-container h2');
    if (header) {
        header.textContent = `${theme.brandName} ${itemName}`;
    }
    
    // Update brand name in header
    const brandName = document.querySelector('.brand h1');
    if (brandName) {
        brandName.textContent = theme.brandName;
    }
    
    // Update results header
    const resultsHeader = document.querySelector('.results-container h2');
    if (resultsHeader) {
        resultsHeader.textContent = `Nearest ${theme.brandName} ${itemName}`;
    }
    
    // Update switch label
    const switchLabel = document.querySelector('.switch-label');
    if (switchLabel) {
        switchLabel.textContent = `Rename to ${theme.brandName}`;
    }
}

function getLocationName(originalName, type) {
    const config = themeConfig[businessType.toLowerCase()];
    if (renameSwitch.checked) {
        return config.brandName;
    }
    return originalName || `${config.brandName} ${config.items}`;
}


// function updateThemeColors(type) {
//     const theme = themeConfig[type];
//     if (!theme) return;
    
//     // Update document colors
//     document.documentElement.style.setProperty('--primary-color', theme.color);
//     document.documentElement.style.setProperty('--text-color', theme.textColor);
    
//     // Update brand icon colors
//     const brandIcon = document.querySelector('.brand [role="img"]');
//     if (brandIcon) {
//         brandIcon.style.background = theme.color;
//     }
    
//     // Update icon color
//     const icon = document.querySelector('.brand i.fas');
//     if (icon) {
//         icon.style.color = theme.textColor;
//     }
// }

// Add to window load event
window.addEventListener('load', handleBusinessType);