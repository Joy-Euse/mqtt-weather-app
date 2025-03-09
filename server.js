const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const mqtt = require('mqtt');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = 3000;

// Initialize SQLite Database
const DATABASE_FILE = './weather_db.db';
const db = new sqlite3.Database(DATABASE_FILE, (err) => {
    if (err) {
        return console.error('Failed to connect to SQLite DB:', err.message);
    }
    console.log('SQLite DB connected.');
});

// Create Table if not exists
const createWeatherTable = () => {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS weather_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL,
            humidity REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.run(createTableSQL, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('weather_data table ready.');
        }
    });
};
createWeatherTable();

// MQTT Client Setup
const MQTT_BROKER_URL = 'ws://157.173.101.159:9001';
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on('connect', () => {
    console.log('MQTT connection established.');

    const topics = [
        '/work_group_01/room_temp/temperature',
        '/work_group_01/room_temp/humidity'
    ];

    topics.forEach(topic => mqttClient.subscribe(topic, (err) => {
        if (err) {
            console.error(`Subscription error on ${topic}:`, err.message);
        } else {
            console.log(`Subscribed to topic: ${topic}`);
        }
    }));
});

// Generate Random Weather Data
const getRandomWeatherData = () => {
    return {
        temperature: (Math.random() * 40).toFixed(2),
        humidity: (Math.random() * 100).toFixed(2)
    };
};

// Publish Random Data to MQTT Topics
const publishTestWeatherData = () => {
    const { temperature, humidity } = getRandomWeatherData();

    mqttClient.publish('/work_group_01/room_temp/temperature', temperature.toString());
    mqttClient.publish('/work_group_01/room_temp/humidity', humidity.toString());

    console.log(`Published test data -> Temp: ${temperature}°C, Humidity: ${humidity}%`);
};

// Send data every 5 seconds
setInterval(publishTestWeatherData, 5000);

// Serve static frontend files
app.use(express.static(path.resolve(__dirname, 'public')));

// REST API Endpoint to fetch weather data
app.get('/data', (req, res) => {
    const selectQuery = `
        SELECT * FROM weather_data
        ORDER BY timestamp DESC
        LIMIT 100
    `;

    db.all(selectQuery, (err, rows) => {
        if (err) {
            console.error('Error retrieving data:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Start Express server
app.listen(PORT, () => {
    console.log(`Server is up and running: http://localhost:${PORT}`);
});
