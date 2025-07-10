const express = require('express');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const { getPresignedUrl } = require('../utils/r2');
const User = require('../../models/users');

const router = express.Router();

router.post('/fetchScoreboard', validateJWTMiddleware, async (req, res, next) => {
    // incoming: jwtToken
    // outgoing: scoreboard, error

    const { jwtToken } = req.body;

    try {
        const users = await User.find({ emailVerified: true })
            .select('profile.displayName profile.PFP questCompleted')
            .sort({ questCompleted: -1, 'profile.displayName': 1 });

        const scoreboardData = await Promise.all(users.map(async (user) => {
            const pfpUrl = await getPresignedUrl(user.profile?.PFP);
            return {
                userId: user._id,
                displayName: user.profile?.displayName,
                pfp: pfpUrl,
                questCompleted: user.questCompleted || 0
            };
        }));
        
        sendSuccessResponse(res, { scoreboard: scoreboardData }, jwtToken);
    }
    catch(e) {
        console.log('Fetch scoreboard error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

module.exports = router; 