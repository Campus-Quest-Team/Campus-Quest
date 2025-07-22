const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGODB_URI;
const client = new MongoClient(url);
client.connect();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Use the new modular API structure
const initializeAPI = require('./api');
const apiRouter = initializeAPI(client);
app.use('/api', apiRouter);

app.use((req, res, next) =>
{
    //can we please fix access control origin before presentation. having all IPs allowed is BAD.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    next();
});

const cron = require('node-cron');
const fetch = require('node-fetch');

// === CRON SCHEDULE CONFIGURATION ===
// Default: '0 0 * * *' = every day at 12:00 AM
// For testing, you can change to e.g. '*/1 * * * *' (every minute)
const ROTATE_QUEST_CRON_SCHEDULE = '0 0 * * *';
const ROTATE_QUEST_ENDPOINT = 'http://localhost:5001/api/rotateQuest';

// Set up the cron job to call rotateQuest
cron.schedule(ROTATE_QUEST_CRON_SCHEDULE, async () => {
    try {
        const response = await fetch(ROTATE_QUEST_ENDPOINT, { method: 'POST' });
        const data = await response.text();
        console.log(`[CRON] rotateQuest called at ${new Date().toISOString()}:`, data);
    } catch (err) {
        console.error('[CRON] Error calling rotateQuest:', err);
    }
});

app.listen(5001); //start Node + Express server on port 5000