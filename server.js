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

app.listen(5001); //start Node + Express server on port 5000