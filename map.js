mapboxgl.accessToken = 'pk.eyJ1IjoiYWNoaW5uYW0wOSIsImEiOiJjbTdkczl5aWkwNjZsMmxwdjYyZm05bWYxIn0.KpnVs490NHpEUV8m-PiAag';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
});

let timeFilter = -1;
let stations = [];
let trips = [];
let circles;
let radiusScale;

// Returns minutes since midnight for a given date.
function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// Filters trips to include only those with start or end times within ±60 minutes of selectedTime.
function filterTripsByTime(selectedTime, allTrips) {
    if (selectedTime === -1) return allTrips;
    return allTrips.filter(trip => {
        const startDiff = Math.abs(trip.startMinutes - selectedTime);
        const endDiff = Math.abs(trip.endMinutes - selectedTime);
        return (startDiff <= 60 || endDiff <= 60);
    });
}

// Recomputes station traffic and updates circle sizes and titles.
function updateStationsAndCircles() {
    const filteredTrips = filterTripsByTime(timeFilter, trips);
    const departures = d3.rollup(filteredTrips, v => v.length, d => d.start_station_id);
    const arrivals = d3.rollup(filteredTrips, v => v.length, d => d.end_station_id);

    stations.forEach(station => {
        const id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
    });

    radiusScale.domain([0, d3.max(stations, d => d.totalTraffic)]);
    circles.transition().duration(500)
      .attr('r', d => radiusScale(d.totalTraffic))
      .select('title')
      .text(d => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
}

map.on('load', () => {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    d3.json(jsonurl).then(jsonData => {
        stations = jsonData.data.stations;

        const trafficDataUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
        d3.csv(trafficDataUrl).then(trafficData => {
            trafficData.forEach(trip => {
                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);
                trip.startMinutes = minutesSinceMidnight(trip.started_at);
                trip.endMinutes = minutesSinceMidnight(trip.ended_at);
            });

            trips = trafficData;
            const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
            const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

            stations = stations.map(station => {
                const id = station.short_name;
                station.arrivals = arrivals.get(id) ?? 0;
                station.departures = departures.get(id) ?? 0;
                station.totalTraffic = station.arrivals + station.departures;
                return station;
            });

            const svg = d3.select('#map').select('svg');
            radiusScale = d3.scaleSqrt()
                .domain([0, d3.max(stations, d => d.totalTraffic)])
                .range([0, 25]);

            circles = svg.selectAll('circle')
                .data(stations)
                .enter()
                .append('circle')
                .attr('r', d => radiusScale(d.totalTraffic))
                .attr('fill', 'steelblue')
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('opacity', 0.6)
                .each(function(d) {
                    d3.select(this)
                        .append('title')
                        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
                });

            function getCoords(station) {
                const point = map.project([station.lon, station.lat]);
                return { cx: point.x, cy: point.y };
            }
            function updatePositions() {
                circles.attr('cx', d => getCoords(d).cx)
                    .attr('cy', d => getCoords(d).cy);
            }
            updatePositions();
            map.on('move', updatePositions);
            map.on('zoom', updatePositions);
            map.on('resize', updatePositions);
            map.on('moveend', updatePositions);
        }).catch(error => console.error('Error loading traffic data:', error));
    }).catch(error => console.error('Error loading JSON:', error));

    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson?...'
    });

    map.addLayer({
        id: 'boston-bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 4,
            'line-opacity': 0.5
        }
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 4,
            'line-opacity': 0.5
        }
    });
});

const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

// Formats minutes into a time string.
function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);
    return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);
    if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
    } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
    }
}

timeSlider.addEventListener('input', () => {
    updateTimeDisplay();
    updateStationsAndCircles();
});

updateTimeDisplay();
