const express = require('express');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const { getPresignedUrl } = require('../utils/r2');
const User = require('../../models/users');

const router = express.Router();

router.post('/addFriend', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, friendId, jwtToken
    // outgoing: friends, error

    const { userId, friendId, jwtToken } = req.body;

    if (!userId || !friendId) {
        return sendErrorResponse(res, 'User ID and Friend ID are required', jwtToken, 400);
    }

    if (userId === friendId) {
        return sendErrorResponse(res, 'You cannot add yourself as a friend', jwtToken, 400);
    }

    try {
        // Check if friend exists
        const friendExists = await User.countDocuments({ _id: friendId });
        if (friendExists === 0) {
            return sendErrorResponse(res, 'The user you are trying to add does not exist', jwtToken, 404);
        }

        // Add friendId to the user's friends list and return the updated user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { friends: friendId } },
            { new: true, select: 'friends' }
        );

        if (!updatedUser) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

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
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { friends: friendId } },
            { new: true, select: 'friends' }
        );

        if (!updatedUser) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

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
        const user = await User.findById(userId)
            .populate({
                path: 'friends',
                select: 'profile.displayName profile.PFP questCompleted',
                options: {
                    sort: { questCompleted: -1, 'profile.displayName': 1 }
                }
            })
            .select('friends');


        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        if (!user.friends || user.friends.length === 0) {
            return sendSuccessResponse(res, { friends: [] }, jwtToken);
        }

        const friendsWithUrls = await Promise.all(user.friends.map(async (friend) => {
            const pfpUrl = await getPresignedUrl(friend.profile?.PFP);
            return {
                userId: friend._id,
                displayName: friend.profile?.displayName,
                pfp: pfpUrl,
                questCompleted: friend.questCompleted
            };
        }));
        
        // Sorting is now handled by the populate query, but we'll keep this just in case for the final structure.
        // The primary sort is by questCompleted DESC, secondary by displayName ASC.
        friendsWithUrls.sort((a, b) => {
            if (b.questCompleted !== a.questCompleted) {
                return b.questCompleted - a.questCompleted;
            }
            return (a.displayName || '').localeCompare(b.displayName || '');
        });

        sendSuccessResponse(res, { friends: friendsWithUrls }, jwtToken);
    }
    catch(e) {
        console.log('Fetch friends error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

module.exports = router; 