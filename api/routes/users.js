const express = require('express');
const multer = require('multer');
const token = require('../../createJWT.js');
const { sendResponse, sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const { r2Client, getPresignedUrl, uploadPFPToR2, DeleteObjectCommand } = require('../utils/r2');
const User = require('../../models/users');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/login', async (req, res, next) => {
    // incoming: login, password
    // outgoing: userId, firstName, lastName, error

    const { login, password } = req.body;

    try {
        const user = await User.findOne({ login, password });

        if(user) {
            // Check if email is verified
            if(!user.emailVerified) {
                return sendResponse(res, {error: "Email not yet verified"});
            }

            const userId = user._id;
            const fn = user.firstName;
            const ln = user.lastName;

            const ret = token.createToken(fn, ln, userId);
            ret.userId = userId;
            sendResponse(res, ret);
        }
        else {
            sendResponse(res, {error: "Login/Password incorrect"});
        }
    } catch(e) {
        sendErrorResponse(res, e.message);
    }
});

router.post('/register', async (req, res, next) => {
    // incoming: login, password, firstName, lastName, email
    // outgoing: userId, firstName, lastName, error

    const { login, password, firstName, lastName, email } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ login });

        if(existingUser) {
            return sendResponse(res, { userId: null, firstName: '', lastName: '', error: 'User already exists' });
        }

        // Insert new user with complete structure
        const newUser = new User({
            login: login,
            password: password,
            email: email || null,
            emailVerified: false,
            questCompleted: 0,
            mobileDeviceToken: null,
            firstName: firstName,
            lastName: lastName,
            profile: {
                displayName: `${firstName} ${lastName}`,
                PFP: 'images/pfp-default.png',
                bio: "Make your bio here",
            },
            settings: {
                notifications: true
            },
            createdAt: new Date(),
            questPosts: [],
            friends: []
        });

        const result = await newUser.save();
        const userId = result._id;

        sendResponse(res, { userId: userId, firstName: firstName, lastName: lastName, error: '' });
    } catch(e) {
        sendResponse(res, { userId: null, firstName: '', lastName: '', error: e.toString() });
    }
});

router.post('/getProfile', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: profileData, error

    const { userId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    try {
        const user = await User.findById(userId).select('questCompleted profile.displayName profile.PFP questPosts');

        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        const pfpUrl = await getPresignedUrl(user.profile?.PFP);

        const postsWithUrls = user.questPosts ? await Promise.all(user.questPosts.map(async (post) => {
            const mediaUrl = await getPresignedUrl(post.mediaPath);
            const { mediaPath, ...rest } = post.toObject(); // use toObject() for mongoose subdocuments
            return { ...rest, mediaUrl };
        })) : [];

        const profileData = {
            questCompleted: user.questCompleted,
            displayName: user.profile?.displayName,
            pfp: pfpUrl,
            questPosts: postsWithUrls.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp))
        };

        sendSuccessResponse(res, { profileData }, jwtToken);
    }
    catch(e) {
        console.log('Get profile error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/editPFP', upload.single('file'), validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, file, jwtToken
    // outgoing: success, pfpUrl, error

    const { userId, jwtToken } = req.body;
    const file = req.file;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    if (!file) {
        return sendErrorResponse(res, 'File is required for PFP', jwtToken, 400);
    }

    try {
        const user = await User.findById(userId).select('profile.PFP');

        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        // Step 1: Delete the old PFP if it's not the default one.
        const oldPfpPath = user.profile && user.profile.PFP;
        if (oldPfpPath && oldPfpPath !== 'images/pfp-default.png') {
            try {
                const deleteParams = {
                    Bucket: 'campus-quest-media',
                    Key: oldPfpPath,
                };
                const command = new DeleteObjectCommand(deleteParams);
                await r2Client.send(command);
                console.log(`Successfully deleted old PFP: ${oldPfpPath}`);
            } catch (deleteError) {
                // Log the error but continue, as the file might already be gone.
                console.error('Failed to delete old PFP from R2, proceeding with upload:', deleteError.toString());
            }
        }

        // Step 2: Upload the new PFP after the old one has been handled.
        const newPfpPath = await uploadPFPToR2(file, userId);

        // Step 3: Update the database with the new PFP path.
        user.profile.PFP = newPfpPath;
        await user.save();

        // Step 4: Return the signed URL for the new PFP.
        const signedUrl = await getPresignedUrl(newPfpPath);

        sendSuccessResponse(res, { success: true, pfpUrl: signedUrl }, jwtToken);
    }
    catch(e) {
        console.log('Edit PFP error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/toggleNotifications', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: success, notifications, error

    const { userId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        // Get current notifications setting (default to true if not set)
        const currentNotifications = user.settings && user.settings.notifications !== undefined 
            ? user.settings.notifications 
            : true;

        // Toggle to the inverse
        const newNotifications = !currentNotifications;
        user.settings.notifications = newNotifications;
        await user.save();

        sendSuccessResponse(res, { success: true, notifications: newNotifications }, jwtToken);
    }
    catch(e) {
        console.log('Toggle notifications error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/editProfile', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, displayName, bio, jwtToken
    // outgoing: success, updatedProfile, error

    const { userId, displayName, bio, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    if (!displayName && !bio) {
        return sendErrorResponse(res, 'At least one field (displayName or bio) is required to update.', jwtToken, 400);
    }

    try {
        const updateFields = {};

        if (displayName) {
            updateFields['profile.displayName'] = displayName;
        }
        if (bio) {
            updateFields['profile.bio'] = bio;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, select: 'profile.displayName profile.bio' }
        );

        if (!updatedUser) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        sendSuccessResponse(res, { success: true, updatedProfile: updatedUser.profile }, jwtToken);

    } catch(e) {
        console.log('Edit Profile error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/deleteUser', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: success, message, error
    
    // This deletes the user from the database and all their media including pfp and quest posts. This also removes the user from all friends lists.

    const { userId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    try {
        const user = await User.findById(userId).select('profile.PFP questPosts');

        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        const objectsToDelete = [];

        // Add PFP to delete list if it's not the default one
        const pfpPath = user.profile && user.profile.PFP;
        if (pfpPath && pfpPath !== 'images/pfp-default.png') {
            objectsToDelete.push({ Key: pfpPath });
        }

        // Add quest post media to delete list
        if (user.questPosts && user.questPosts.length > 0) {
            user.questPosts.forEach(post => {
                if (post.mediaPath) {
                    objectsToDelete.push({ Key: post.mediaPath });
                }
            });
        }

        // Delete objects from R2 if there are any
        if (objectsToDelete.length > 0) {
            try {
                 for (const object of objectsToDelete) {
                    const deleteParams = {
                        Bucket: 'campus-quest-media',
                        Key: object.Key,
                    };
                    const command = new DeleteObjectCommand(deleteParams);
                    await r2Client.send(command);
                    console.log(`Successfully deleted from R2: ${object.Key}`);
                }
            } catch (deleteError) {
                console.error('Failed to delete objects from R2:', deleteError.toString());
                return sendErrorResponse(res, 'Failed to delete user media from storage.', jwtToken, 500);
            }
        }
        
        // Remove user from friends lists of other users
        await User.updateMany(
            { friends: userId },
            { $pull: { friends: userId } }
        );

        // Delete the user from the database
        const result = await User.findByIdAndDelete(userId);

        if (!result) {
            // This should not happen if we found the user before
            return sendErrorResponse(res, 'Failed to delete user from database.', jwtToken, 500);
        }

        sendSuccessResponse(res, { success: true, message: 'User deleted successfully' }, jwtToken);

    } catch(e) {
        console.log('Delete User error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

module.exports = router; 