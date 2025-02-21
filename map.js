mapboxgl.accessToken = 'pk.eyJ1IjoiYWNoaW5uYW0wOSIsImEiOiJjbTdkczl5aWkwNjZsMmxwdjYyZm05bWYxIn0.KpnVs490NHpEUV8m-PiAag';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
});

map.on('load', () => {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

    d3.json(jsonurl).then((jsonData) => {
        let stations = jsonData.data.stations;

        const trafficDataUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

        d3.csv(trafficDataUrl).then((trafficData) => {
            let trips = trafficData;

            const departures = d3.rollup(
                trips,
                (v) => v.length,
                (d) => d.start_station_id
            );

            const arrivals = d3.rollup(
                trips,
                (v) => v.length,
                (d) => d.end_station_id
            );

            stations = stations.map((station) => {
                let id = station.short_name;
                station.arrivals = arrivals.get(id) ?? 0;
                station.departures = departures.get(id) ?? 0;
                station.totalTraffic = station.arrivals + station.departures;
                return station;
            });

            console.log("Updated Stations with Traffic Data:", stations);

            const svg = d3.select('#map').select('svg');

            const radiusScale = d3
                .scaleSqrt()
                .domain([0, d3.max(stations, d => d.totalTraffic)])
                .range([0, 25]);

            const circles = svg.selectAll('circle')
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

            console.log(svg.selectAll('circle title').nodes())
            

            function getCoords(station) {
                const point = map.project([station.lon, station.lat]);
                return { cx: point.x, cy: point.y };
            }

            function updatePositions() {
                circles
                    .attr('cx', d => getCoords(d).cx)
                    .attr('cy', d => getCoords(d).cy);
            }

            updatePositions();

            map.on('move', updatePositions);
            map.on('zoom', updatePositions);
            map.on('resize', updatePositions);
            map.on('moveend', updatePositions);

        }).catch(error => {
            console.error('Error loading traffic data:', error);
        });

    }).catch(error => {
        console.error('Error loading JSON:', error);
    });

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
        type:'line',
        source:'boston_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 4,
            'line-opacity': 0.5
        }
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type:'line',
        source:'cambridge_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 4,
            'line-opacity': 0.5
        }
    });
});

let timeFilter = -1;

const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);
    return date.toLocaleString('en-US', {timeStyle: 'short'});
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

timeSlider.addEventListener('input', updateTimeDisplay);

updateTimeDisplay();