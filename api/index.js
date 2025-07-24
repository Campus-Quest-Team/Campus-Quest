const express = require('express');

// Import all route modules
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const scoreboardRoutes = require('./routes/scoreboard');
const emailRoutes = require('./routes/email');

// This function will be called from server.js to initialize the API
const initializeAPI = (client) => {
    const router = express.Router();
    
    // Create database getter function
    const getDatabase = () => client.db('campusQuest');
    
    // Initialize all route modules with database access
    const userRouter = userRoutes.router(getDatabase);
    const postRouter = postRoutes.router(getDatabase);
    const friendRouter = friendRoutes.router(getDatabase);
    const scoreboardRouter = scoreboardRoutes.router(getDatabase);
    const emailRouter = emailRoutes.router(getDatabase);
    
    // Set up route prefixes
    router.use('/', userRouter); // /login, /register, /getProfile, /editPFP, /toggleNotifications
    router.use('/', postRouter); // /submitPost, /likePost, /flagPost, /rotateQuest, /currentQuest, /uploadMedia, /getMedia
    router.use('/', friendRouter); // /addFriend, /removeFriend, /fetchFriends
    router.use('/', scoreboardRouter); // /fetchScoreboard
    router.use('/email', emailRouter); // /email/emailSend, /email/emailVerification
    
    return router;
};

module.exports = initializeAPI; 