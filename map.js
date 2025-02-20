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
        console.log('Loaded JSON Data:', jsonData);

        const stations = jsonData.data.stations;
        console.log('Stations Array:', stations);

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
    })

    map.addLayer({
        id: 'boston-bike-lanes',
        type:'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 4,
            'line-opacity': 0.5
        }
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type:'line',
        source: 'cambridge_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 4,
            'line-opacity': 0.5
        }
    });
})

const stations = jsonData.data.stations;
console.log('Stations Array:', stations);