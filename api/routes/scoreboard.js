const express = require('express');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const { getPresignedUrl } = require('../utils/r2');

const router = express.Router();

// Database helper - will be set when router is initialized
let getDatabase;

const initializeRouter = (dbGetter) => {
    getDatabase = dbGetter;
    return router;
};

router.post('/fetchScoreboard', validateJWTMiddleware, async (req, res, next) => {
    // incoming: jwtToken
    // outgoing: scoreboard, error

    const { jwtToken } = req.body;

    try {
        const db = getDatabase();

        const users = await db.collection('users').find({ emailVerified: true }).project({
            'profile.displayName': 1,
            'profile.PFP': 1,
            'questCompleted': 1
        }).toArray();

        const scoreboardData = await Promise.all(users.map(async (user) => {
            const pfpUrl = await getPresignedUrl(user.profile?.PFP);
            return {
                userId: user._id,
                displayName: user.profile?.displayName,
                pfp: pfpUrl,
                questCompleted: user.questCompleted || 0
            };
        }));
        
        scoreboardData.sort((a, b) => {
            if (b.questCompleted !== a.questCompleted) {
                return b.questCompleted - a.questCompleted;
            }
            return (a.displayName || '').localeCompare(b.displayName || '');
        });

        sendSuccessResponse(res, { scoreboard: scoreboardData }, jwtToken);
    }
    catch(e) {
        console.log('Fetch scoreboard error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

module.exports = { router: initializeRouter }; 