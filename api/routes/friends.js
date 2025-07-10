const express = require('express');
const { ObjectId } = require('mongodb');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const { getPresignedUrl } = require('../utils/r2');

const router = express.Router();

// Database helper - will be set when router is initialized
let getDatabase;

const initializeRouter = (dbGetter) => {
    getDatabase = dbGetter;
    return router;
};

router.post('/addFriend', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, friendId, jwtToken
    // outgoing: friends, error

    const { userId, friendId, jwtToken } = req.body;

    if (!userId || !friendId) {
        return sendErrorResponse(res, 'User ID and Friend ID are required', jwtToken, 400);
    }

    try {
        const db = getDatabase();
        const userObjectId = new ObjectId(userId);
        const friendObjectId = new ObjectId(friendId);

        // Check if both users exist to prevent adding non-existent users
        const friendExists = await db.collection('users').countDocuments({ _id: friendObjectId });
        if (friendExists === 0) {
            return sendErrorResponse(res, 'The user you are trying to add does not exist', jwtToken, 404);
        }

        // Add friendId to the user's friends list, preventing duplicates
        const result = await db.collection('users').updateOne(
            { _id: userObjectId },
            { $addToSet: { friends: friendObjectId } }
        );

        // Fetch the updated user to return their new friends list
        const updatedUser = await db.collection('users').findOne(
            { _id: userObjectId },
            { projection: { friends: 1, _id: 0 } }
        );

        sendSuccessResponse(res, { friends: updatedUser.friends || [] }, jwtToken);
    }
    catch(e) {
        console.log('Add friend error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/removeFriend', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, friendId, jwtToken
    // outgoing: friends, error

    const { userId, friendId, jwtToken } = req.body;

    if (!userId || !friendId) {
        return sendErrorResponse(res, 'User ID and Friend ID are required', jwtToken, 400);
    }

    try {
        const db = getDatabase();
        const userObjectId = new ObjectId(userId);
        const friendObjectId = new ObjectId(friendId);

        // Use $pull to remove the friendId from the user's friends array
        const result = await db.collection('users').updateOne(
            { _id: userObjectId },
            { $pull: { friends: friendObjectId } }
        );

        if (result.matchedCount === 0) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        // Fetch the updated user to return their new friends list
        const updatedUser = await db.collection('users').findOne(
            { _id: userObjectId },
            { projection: { friends: 1, _id: 0 } }
        );

        sendSuccessResponse(res, { friends: updatedUser.friends || [] }, jwtToken);
    }
    catch(e) {
        console.log('Remove friend error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/fetchFriends', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: friends (populated and sorted), error

    const { userId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    try {
        const db = getDatabase();
        const userObjectId = new ObjectId(userId);

        const user = await db.collection('users').findOne(
            { _id: userObjectId },
            { projection: { friends: 1, _id: 0 } }
        );

        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        if (!user.friends || user.friends.length === 0) {
            return sendSuccessResponse(res, { friends: [] }, jwtToken);
        }

        const friends = await db.collection('users').find(
            { _id: { $in: user.friends } }
        ).project({
            'profile.displayName': 1,
            'profile.PFP': 1,
            'questCompleted': 1
        }).toArray();

        const friendsWithUrls = await Promise.all(friends.map(async (friend) => {
            const pfpUrl = await getPresignedUrl(friend.profile?.PFP);
            return {
                _id: friend._id,
                displayName: friend.profile?.displayName,
                pfp: pfpUrl,
                questCompleted: friend.questCompleted
            };
        }));
        
        friendsWithUrls.sort((a, b) => {
            if (b.questCompleted !== a.questCompleted) {
                return b.questCompleted - a.questCompleted;
            }
            return a.displayName.localeCompare(b.displayName);
        });

        sendSuccessResponse(res, { friends: friendsWithUrls }, jwtToken);
    }
    catch(e) {
        console.log('Fetch friends error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

module.exports = { router: initializeRouter }; 