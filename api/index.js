const express = require('express');
const mongoose = require('mongoose');

// Import all route modules
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const scoreboardRoutes = require('./routes/scoreboard');
const emailRoutes = require('./routes/email');

// This function will be called from server.js to initialize the API
const initializeAPI = (app) => {
    
    // Set up route prefixes
    app.use('/api', userRoutes); 
    app.use('/api', postRoutes);
    app.use('/api', friendRoutes); 
    app.use('/api', scoreboardRoutes);
    app.use('/api', emailRoutes); 
    
};

module.exports = initializeAPI; 