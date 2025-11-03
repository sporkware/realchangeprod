// tool.js - a script for the paper selling route generator

let map;
let service;
let infowindow;

function initMap() {
    infowindow = new google.maps.InfoWindow();

    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map = new google.maps.Map(document.getElementById('map'), {
                center: pos,
                zoom: 15
            });

            const request = {
                location: pos,
                radius: '1609', // 1 mile in meters
                type: ['grocery_or_supermarket']
            };

            service = new google.maps.places.PlacesService(map);
            service.nearbySearch(request, callback);

        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

function callback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        const waypoints = [];
        for (let i = 1; i < results.length; i++) {
            waypoints.push({
                location: results[i].geometry.location,
                stopover: true
            });
        }
        calculateAndDisplayRoute(results[0].geometry.location, results[0].geometry.location, waypoints);
    }
}

function calculateAndDisplayRoute(origin, destination, waypoints) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: 'WALKING'
    }, function(response, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            const route = response.routes[0];
            const routeList = document.getElementById('route-list');
            routeList.innerHTML = '';
            for (let i = 0; i < route.legs.length; i++) {
                const routeSegment = route.legs[i];
                const li = document.createElement('li');
                li.innerHTML = `<b>${routeSegment.start_address}</b> to <b>${routeSegment.end_address}</b>: ${routeSegment.distance.text}, ${routeSegment.duration.text}`;
                routeList.appendChild(li);
            }
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}
