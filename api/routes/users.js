const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const token = require('../../createJWT.js');
const { sendResponse, sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const { r2Client, getPresignedUrl, uploadPFPToR2, DeleteObjectCommand } = require('../utils/r2');
const { Resend } = require('resend');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const resend = new Resend(process.env.RESEND_API_KEY);

// Database helper - will be set when router is initialized
let getDatabase;

const initializeRouter = (dbGetter) => {
    getDatabase = dbGetter;
    return router;
};

router.post('/login', async (req, res, next) => {
    // incoming: login, password
    // outgoing: userId, firstName, lastName, error

    const { login, password } = req.body;

    try {
        const db = getDatabase();
        const results = await db.collection('users').find({login: login, password: password}).toArray();

        if(results.length > 0) {
            const user = results[0];
            
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
        const db = getDatabase();

        // Check if user already exists
        const existingUser = await db.collection('users').find({login: login}).toArray();

        if(existingUser.length > 0) {
            return sendResponse(res, { userId: null, firstName: '', lastName: '', error: 'User already exists' });
        }

        // Insert new user with complete structure
        const newUser = {
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
        };

        const result = await db.collection('users').insertOne(newUser);
        const userId = result.insertedId;

        // Create JWT token for the newly registered user
        const ret = token.createToken(firstName, lastName, userId);
        ret.userId = userId;
        ret.firstName = firstName;
        ret.lastName = lastName;
        ret.error = '';

        sendResponse(res, ret);
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
        const db = getDatabase();

        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { 
                projection: { 
                    questCompleted: 1, 
                    'profile.displayName': 1, 
                    'profile.PFP': 1, 
                    questPosts: 1,
                    'profile.bio': 1,
                    _id: 0
                } 
            }
        );

        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        const pfpUrl = await getPresignedUrl(user.profile?.PFP);

        const postsWithUrls = user.questPosts ? await Promise.all(user.questPosts.map(async (post) => {
            const mediaUrl = await getPresignedUrl(post.mediaPath);
            const { mediaPath, ...rest } = post;
            return { ...rest, mediaUrl };
        })) : [];

        const profileData = {
            questCompleted: user.questCompleted,
            displayName: user.profile?.displayName,
            pfp: pfpUrl,
            bio: user.profile?.bio,
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
        const db = getDatabase();

        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { 'profile.PFP': 1 } }
        );

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
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { 'profile.PFP': newPfpPath } }
        );

        if (result.matchedCount === 0) {
            // This case should be rare, but it's good practice to handle it.
            return sendErrorResponse(res, 'User not found during update', jwtToken, 404);
        }

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
        const db = getDatabase();
        
        // Find the user and get current notifications setting
        const user = await db.collection('users').findOne({
            _id: new ObjectId(userId)
        });

        if (!user) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        // Get current notifications setting (default to true if not set)
        const currentNotifications = user.settings && user.settings.notifications !== undefined 
            ? user.settings.notifications 
            : true;

        // Toggle to the inverse
        const newNotifications = !currentNotifications;

        // Update the notifications setting
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: { 'settings.notifications': newNotifications }
            }
        );

        if (result.matchedCount === 0) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

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
        const db = getDatabase();
        const updateFields = {};

        if (displayName) {
            updateFields['profile.displayName'] = displayName;
        }
        if (bio) {
            updateFields['profile.bio'] = bio;
        }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        const updatedUser = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { 'profile.displayName': 1, 'profile.bio': 1, _id: 0 } }
        );

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
        const db = getDatabase();

        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { 'profile.PFP': 1, questPosts: 1 } }
        );

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
        await db.collection('users').updateMany(
            { 'friends.friendId': new ObjectId(userId) },
            { $pull: { friends: { friendId: new ObjectId(userId) } } }
        );

        // Delete the user from the database
        const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount === 0) {
            // This should not happen if we found the user before
            return sendErrorResponse(res, 'Failed to delete user from database.', jwtToken, 500);
        }

        sendSuccessResponse(res, { success: true, message: 'User deleted successfully' }, jwtToken);

    } catch(e) {
        console.log('Delete User error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/forgot-password', async (req, res, next) => {
    // incoming: email
    // outgoing: success, message, error

    const { email } = req.body;

    if (!email) {
        return sendErrorResponse(res, 'Email is required', null, 400);
    }

    try {
        const db = getDatabase();

        // Find user by email
        const user = await db.collection('users').findOne({ email: email });

        if (!user) {
            // For security, don't reveal if email exists or not
            return sendSuccessResponse(res, { 
                success: true, 
                message: 'If an account with that email exists, a password reset link has been sent.' 
            });
        }

        // Generate password reset token
        const resetToken = token.createToken(user.firstName, user.lastName, user._id);
        const resetTokenString = resetToken.accessToken;

        // Store reset token in database with one hour expiration
        const resetTokenExpiry = new Date(Date.now() + 3600000);
        
        await db.collection('users').updateOne(
            { _id: user._id },
            { 
                $set: { 
                    passwordResetToken: resetTokenString,
                    passwordResetExpiry: resetTokenExpiry
                }
            }
        );

        // Send password reset email
        try {
            const resetLink = `http://supercoolfun.site/reset-password?token=${resetTokenString}`;
            
            const emailBody = `
                <h1>Password Reset Request for Campus Quest</h1>
                <p>Hello ${user.login},</p>
                <p>We received a request to reset your password for your Campus Quest account.</p>
                <p>Click the button below to reset your password:</p>
                <button style="background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px;">
                    <a href="${resetLink}" style="color: white; text-decoration: none;"><strong>Reset My Password</strong></a>
                </button>
                <p>This link will expire in 1 hour for security purposes.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>Best regards,<br>The Campus Quest Team</p>
            `;

            await resend.emails.send(
                {
                    from: 'Campus Quest Team <no-reply@supercoolfun.site>',
                    to: email,
                    subject: 'Reset Your Campus Quest Password',
                    html: emailBody,
                },
                {
                    idempotencyKey: resetTokenString,
                }
            );
        } catch (emailError) {
            console.log('Email sending failed:', emailError.toString());
            // Don't fail the request if email fails, just log it
        }

        sendSuccessResponse(res, { 
            success: true, 
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

    } catch(e) {
        console.log('Forgot password error:', e.toString());
        sendErrorResponse(res, e.toString(), null, 500);
    }
});

router.post('/reset-password', async (req, res, next) => {
    // incoming: resetToken, newPassword
    // outgoing: success, message, error

    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
        return sendErrorResponse(res, 'Reset token and new password are required', null, 400);
    }

    try {
        const db = getDatabase();

        // Find user with valid reset token
        const user = await db.collection('users').findOne({
            passwordResetToken: resetToken,
            passwordResetExpiry: { $gt: new Date() }
        });

        if (!user) {
            return sendErrorResponse(res, 'Invalid or expired reset token', null, 400);
        }

        // Update password and clear reset token
        await db.collection('users').updateOne(
            { _id: user._id },
            { 
                $set: { password: newPassword },
                $unset: { 
                    passwordResetToken: "",
                    passwordResetExpiry: ""
                }
            }
        );

        sendSuccessResponse(res, { 
            success: true, 
            message: 'Password has been reset successfully' 
        });

    } catch(e) {
        console.log('Reset password error:', e.toString());
        sendErrorResponse(res, e.toString(), null, 500);
    }
})

module.exports = { router: initializeRouter }; 