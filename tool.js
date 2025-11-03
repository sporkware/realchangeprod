// tool.js - a script for the paper selling route generator

let map;
let service;
let infowindow;
let directionsRenderer;

// Main initialization function called by Google Maps API script
function initMap() {
    // A default location (center of the US) for when no location is provided yet
    const defaultCenter = { lat: 39.8283, lng: -98.5795 };

    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultCenter,
        zoom: 4
    });

    infowindow = new google.maps.InfoWindow();
    service = new google.maps.places.PlacesService(map);
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Setup event listeners for UI elements
    const currentLocationBtn = document.getElementById('current-location-btn');
    currentLocationBtn.addEventListener('click', getUserGeolocation);

    const timeOfDaySelector = document.getElementById('time-of-day');
    timeOfDaySelector.addEventListener('change', getUserGeolocation);


    // Setup Places Autocomplete for the search box
    const input = document.getElementById('location-search');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.setFields(['geometry', 'name']);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            window.alert("No details available for input: '" + place.name + "'");
            return;
        }
        updateMapAndFindStores(place.geometry.location);
    });
}

// Function to get the user's current geolocation
function getUserGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            updateMapAndFindStores(new google.maps.LatLng(pos.lat, pos.lng));
        }, () => {
            handleLocationError(true, infowindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infowindow, map.getCenter());
    }
}

// Function to center the map and trigger a search for stores
function updateMapAndFindStores(location) {
    map.setCenter(location);
    map.setZoom(14); // A bit more zoomed out to see the area
    findNearbyStores(location);
}


function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

// Function to find grocery stores near a given location
function findNearbyStores(location) {
    const routeList = document.getElementById('route-list');
    const spinner = document.getElementById('loading-spinner');

    spinner.style.display = 'block';
    routeList.innerHTML = '';
    directionsRenderer.setDirections({routes: []}); // Clear previous route from map

    const timeOfDay = document.getElementById('time-of-day').value;
    let keyword = 'grocery';
    switch (timeOfDay) {
        case 'morning':
            keyword = 'grocery coffee breakfast bakery';
            break;
        case 'afternoon':
            keyword = 'grocery lunch deli sandwich';
            break;
        case 'evening':
            keyword = 'grocery dinner hot food';
            break;
    }

    const request = {
        location: location,
        radius: '1609', // 1 mile in meters
        type: ['grocery_or_supermarket'],
        keyword: keyword
    };

    service.nearbySearch(request, (results, status) => {
        spinner.style.display = 'none';
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            if (results.length > 1) {
                createRouteFromStores(results, location);
            } else {
                routeList.innerHTML = '<li>Not enough grocery stores found within 1 mile to create a route.</li>';
            }
        } else {
             routeList.innerHTML = '<li>No grocery stores found within 1 mile.</li>';
        }
    });
}

// Create and calculate the walking route
function createRouteFromStores(stores, startLocation) {
    const directionsService = new google.maps.DirectionsService();
    const spinner = document.getElementById('loading-spinner');

    spinner.style.display = 'block';

    // The user's location is the start and end of the trip
    const origin = startLocation;
    const destination = startLocation;

    // All found stores become waypoints
    const waypoints = stores.map(store => ({
        location: store.geometry.location,
        stopover: true
    }));

    directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: true, // This is key for an efficient route
        travelMode: 'WALKING'
    }, (response, status) => {
        spinner.style.display = 'none';
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            displayRouteLegs(response);
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}

// Display the calculated route segments in the list
function displayRouteLegs(response) {
    const route = response.routes[0];
    const routeList = document.getElementById('route-list');
    routeList.innerHTML = ''; // Clear "searching" message

    // The optimized order of waypoints is in the response
    const waypointOrder = route.waypoint_order;

    // Add the first leg: from user's start to the first store
    let leg = route.legs[0];
    let li = document.createElement('li');
    li.innerHTML = `<b>Start at your location</b> and walk to <b>${leg.end_address}</b>: ${leg.distance.text}, ${leg.duration.text}`;
    routeList.appendChild(li);

    // Add legs between stores
    for (let i = 0; i < waypointOrder.length; i++) {
        leg = route.legs[i+1];
        li = document.createElement('li');
        li.innerHTML = `From <b>${leg.start_address}</b> walk to <b>${leg.end_address}</b>: ${leg.distance.text}, ${leg.duration.text}`;
        routeList.appendChild(li);
    }
}
