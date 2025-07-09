require('express');
require('mongodb');

//Resend API
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

//AWS API for R2 bucket
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const { ObjectId } = require('mongodb');

// Add this configuration after the existing imports
const upload = multer({ storage: multer.memoryStorage() });

// Configure R2 client
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT, // Your R2 endpoint URL
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

exports.setApp = function(app, client)
{
    var token = require('./createJWT.js');
    
    // Helper functions to reduce redundancy
    const validateJWT = (jwtToken) => {
        try {
            if(token.isExpired(jwtToken)) {
                return { valid: false, error: 'The JWT is no longer valid' };
            }
            return { valid: true };
        } catch(e) {
            console.log(e.message);
            return { valid: false, error: 'Invalid token' };
        }
    };

    const refreshToken = (jwtToken) => {
        try {
            return token.refresh(jwtToken);
        } catch(e) {
            console.log(e.message);
            return null;
        }
    };

    const sendResponse = (res, data, status = 200) => {
        res.status(status).json(data);
    };

    const sendErrorResponse = (res, error, jwtToken = null, status = 200) => {
        const refreshedToken = refreshToken(jwtToken);
        sendResponse(res, { error: error, jwtToken: refreshedToken }, status);
    };

    const sendSuccessResponse = (res, data, jwtToken = null, status = 200) => {
        const refreshedToken = refreshToken(jwtToken);
        sendResponse(res, { ...data, jwtToken: refreshedToken }, status);
    };

    const getDatabase = () => client.db('campusQuest');

    const getPresignedUrl = async (key) => {
        if (!key) {
            return null;
        }

        if (key === 'images/pfp-default.png') {
            return `${process.env.R2_PUBLIC_URL}/${key}`;
        }

        try {
            const command = new GetObjectCommand({
                Bucket: 'campus-quest-media',
                Key: key,
            });
            return await getSignedUrl(r2Client, command, { expiresIn: 900 });
        } catch (e) {
            console.error(`Failed to get signed URL for key: ${key}`, e);
            return null;
        }
    };

    // Helper function for uploading files to R2
    const uploadFileToR2 = async (file, userId, questId) => {
        if (!file) {
            throw new Error('No file provided for upload.');
        }

        // Determine destination folder and reject unsupported file types
        let folder = '';
        if (file.mimetype.startsWith('image/')) {
            folder = 'images';
        } else if (file.mimetype.startsWith('video/')) {
            folder = 'videos';
        } else {
            throw new Error('Unsupported file type. Please upload an image or video.');
        }

        // Generate filename without timestamp.
        const fileExtension = file.originalname.split('.').pop();
        const baseFileName = `questId-${questId}-userId-${userId}.${fileExtension}`;
        const objectKey = `${folder}/${baseFileName}`;

        // Upload to R2
        const uploadParams = {
            Bucket: 'campus-quest-media',
            Key: objectKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(uploadParams);
        await r2Client.send(command);

        return objectKey;
    };

    // Helper function for uploading PFP to R2
    const uploadPFPToR2 = async (file, userId) => {
        if (!file) {
            throw new Error('No file provided for upload.');
        }

        // PFP must be an image
        if (!file.mimetype.startsWith('image/')) {
            throw new Error('Unsupported file type. Please upload an image.');
        }

        const fileExtension = file.originalname.split('.').pop();
        const objectKey = `images/${userId}-pfp.${fileExtension}`;

        const uploadParams = {
            Bucket: 'campus-quest-media',
            Key: objectKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(uploadParams);
        await r2Client.send(command);

        return objectKey;
    };

    // Middleware for JWT validation
    const validateJWTMiddleware = (req, res, next) => {
        const { jwtToken } = req.body;
        if (!jwtToken) {
            return sendErrorResponse(res, 'JWT token is required', null, 400);
        }

        const validation = validateJWT(jwtToken);
        if (!validation.valid) {
            return sendErrorResponse(res, validation.error, jwtToken, 200);
        }

        next();
    };

    app.post('/api/login', async (req, res, next) =>
    {
        // incoming: login, password
        // outgoing: userId, firstName, lastName, error

        const { login, password } = req.body;

        try {
            const db = getDatabase();
            const results = await db.collection('users').find({login: login, password: password}).toArray();

            if(results.length > 0)
            {
                const user = results[0];
                
                // Check if email is verified
                if(!user.emailVerified)
                {
                    return sendResponse(res, {error: "Email not yet verified"});
                }

                const userId = user._id;
                const fn = user.firstName;
                const ln = user.lastName;

                const ret = token.createToken(fn, ln, userId);
                ret.userId = userId;
                sendResponse(res, ret);
            }
            else
            {
                sendResponse(res, {error: "Login/Password incorrect"});
            }
        } catch(e) {
            sendErrorResponse(res, e.message);
        }
    });

    app.post('/api/register', async (req, res, next) =>
    {
        // incoming: login, password, firstName, lastName, email
        // outgoing: userId, firstName, lastName, error

        const { login, password, firstName, lastName, email } = req.body;

        try {
            const db = getDatabase();

            // Check if user already exists
            const existingUser = await db.collection('users').find({login: login}).toArray();

            if(existingUser.length > 0)
            {
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

            sendResponse(res, { userId: userId, firstName: firstName, lastName: lastName, error: '' });
        } catch(e) {
            sendResponse(res, { userId: null, firstName: '', lastName: '', error: e.toString() });
        }
    });

    // Add the new upload-media endpoint
    app.post('/api/uploadMedia', upload.single('file'), validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: file, userId, questid, jwtToken
        // outgoing: fileUrl, error

        const { jwtToken, userId, questId } = req.body;
        const file = req.file;
        var error = '';

        // Validate JWT token
        try
        {
            if(token.isExpired(jwtToken))
            {
                var r = {error:'The JWT is no longer valid', jwtToken:''};
                res.status(200).json(r);
                return;
            }
        }
        catch(e)
        {
            console.log(e.message);
            error = 'Invalid token';
        }

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        if (!questId) {
            return sendErrorResponse(res, 'Quest ID is required', jwtToken, 400);
        }

        // Validate file
        if (!file) {
            return sendErrorResponse(res, 'No file provided', jwtToken, 400);
        }

        try
        {
            const objectKey = await uploadFileToR2(req.file, userId, questId);
            const fileUrl = `${process.env.R2_PUBLIC_URL}/${objectKey}`;

            // Update or insert media info in MongoDB. This prevents duplicate records for the same file path.
            const db = getDatabase();
            await db.collection('media').updateOne(
                { userId: userId, questId: questId },
                {
                    $set: {
                        filePath: objectKey,
                        uploadTimestamp: new Date()
                    }
                },
                { upsert: true }
            );

            sendSuccessResponse(res, { fileUrl: fileUrl, error: '' }, jwtToken);
        }
        catch(e)
        {
            console.log('R2 upload or DB error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/getMedia', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, questId, jwtToken
        // outgoing: signedUrl, error

        const { userId, questId, jwtToken } = req.body;

        if (!userId || !questId) {
            return sendErrorResponse(res, 'userId and questId are required', jwtToken, 400);
        }

        try {
            const db = getDatabase();
            
            const mediaRecord = await db.collection('media').findOne(
                { userId: userId, questId: questId },
                { sort: { uploadTimestamp: -1 } } 
            );

            if (!mediaRecord) {
                return sendErrorResponse(res, 'No media found for the given user and quest', jwtToken, 404);
            }

            const command = new GetObjectCommand({
                Bucket: 'campus-quest-media',
                Key: mediaRecord.filePath,
            });

            const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
            
            sendSuccessResponse(res, { signedUrl: signedUrl, error: '' }, jwtToken);
        } catch (e) {
            console.error('Error getting signed URL:', e);
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/submitPost', upload.single('file'), validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, questId, caption, questDescription, file, jwtToken
        // outgoing: success, error

        const { userId, questId, caption, questDescription, jwtToken } = req.body;
        const file = req.file;

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        if (!questId) {
            return sendErrorResponse(res, 'Quest ID is required', jwtToken, 400);
        }
        
        if (!file) {
            return sendErrorResponse(res, 'File is required for submission', jwtToken, 400);
        }

        try
        {
            const db = getDatabase();
            
            // Step 1: Generate a unique ID for the post *before* uploading.
            const questPostId = new ObjectId();

            // Step 2: Determine file type and construct the permanent file path.
            let folder = '';
            if (file.mimetype.startsWith('image/')) {
                folder = 'images';
            } else if (file.mimetype.startsWith('video/')) {
                folder = 'videos';
            } else {
                throw new Error('Unsupported file type. Please upload an image or video.');
            }
            
            const fileExtension = file.originalname.split('.').pop();
            const mediaPath = `${folder}/${userId}-${questPostId}.${fileExtension}`;
            
            // Step 3: Upload the file to R2 with its permanent name.
            const uploadParams = {
                Bucket: 'campus-quest-media',
                Key: mediaPath,
                Body: file.buffer,
                ContentType: file.mimetype,
            };
            const command = new PutObjectCommand(uploadParams);
            await r2Client.send(command);

            // Step 4: Create the complete quest post object.
            const questPost = {
                _id: questPostId,
                questId: questId,
                userId: userId,
                mediaPath: mediaPath,
                caption: caption || '',
                questDescription: questDescription || '',
                likes: 0,
                flagged: 0,
                timeStamp: new Date(),
                likedBy: [],
                flaggedBy: []
            };

            // Step 5: Update the user document.
            const result = await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                {
                    $push: { questPosts: questPost },
                    $inc: { questCompleted: 1 }
                }
            );

            if (result.matchedCount === 0) {
                return sendErrorResponse(res, 'User not found', jwtToken, 404);
            }

            sendSuccessResponse(res, { success: true, questPostId: questPost._id }, jwtToken);
        }
        catch(e)
        {
            console.log('Submit post error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/likePost', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, questPostId, jwtToken
        // outgoing: success, liked (new like count), error

        const { userId, questPostId, jwtToken } = req.body;

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        if (!questPostId) {
            return sendErrorResponse(res, 'Quest Post ID is required', jwtToken, 400);
        }

        try
        {
            const db = getDatabase();
            
            // Find the user document that contains the quest post
            const user = await db.collection('users').findOne({
                'questPosts._id': new ObjectId(questPostId)
            });

            if (!user) {
                return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
            }

            // Find the specific quest post
            const questPost = user.questPosts.find(post => post._id.toString() === questPostId);
            
            if (!questPost) {
                return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
            }

            let liked = false;
            let updateOperation = {};

            // Check if user is already in likedBy array
            const userAlreadyLiked = questPost.likedBy && questPost.likedBy.includes(userId);

            if (userAlreadyLiked) {
                // Unlike: remove user from likedBy array and decrement likes
                updateOperation = {
                    $pull: { 'questPosts.$.likedBy': userId },
                    $inc: { 'questPosts.$.likes': -1 }
                };
                liked = false;
            } else {
                // Like: add user to likedBy array and increment likes
                updateOperation = {
                    $push: { 'questPosts.$.likedBy': userId },
                    $inc: { 'questPosts.$.likes': 1 }
                };
                liked = true;
            }

            // Update the quest post
            const result = await db.collection('users').updateOne(
                { 
                    _id: user._id,
                    'questPosts._id': new ObjectId(questPostId)
                },
                updateOperation
            );

            if (result.matchedCount === 0) {
                return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
            }

            sendSuccessResponse(res, { success: true, liked: liked }, jwtToken);
        }
        catch(e)
        {
            console.log('Like post error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/flagPost', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, questPostId, jwtToken
        // outgoing: success, flagged, needsReview, error

        const { userId, questPostId, jwtToken } = req.body;

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        if (!questPostId) {
            return sendErrorResponse(res, 'Quest Post ID is required', jwtToken, 400);
        }

        try
        {
            const db = getDatabase();
            
            // Find the user document that contains the quest post
            const user = await db.collection('users').findOne({
                'questPosts._id': new ObjectId(questPostId)
            });

            if (!user) {
                return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
            }

            // Find the specific quest post
            const questPost = user.questPosts.find(post => post._id.toString() === questPostId);
            
            if (!questPost) {
                return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
            }

            let flagged = false;
            let needsReview = false;

            // Check if user is already in flaggedBy array
            const userAlreadyFlagged = questPost.flaggedBy && questPost.flaggedBy.includes(userId);

            if (userAlreadyFlagged) {
                // User already flagged this post, do nothing
                flagged = true;
                needsReview = questPost.flaggedBy && questPost.flaggedBy.length >= 3;
            } else {
                // Add user to flaggedBy array
                const result = await db.collection('users').updateOne(
                    { 
                        _id: user._id,
                        'questPosts._id': new ObjectId(questPostId)
                    },
                    {
                        $push: { 'questPosts.$.flaggedBy': userId },
                        $inc: { 'questPosts.$.flagged': 1 }
                    }
                );

                if (result.matchedCount === 0) {
                    return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
                }

                flagged = true;
                
                // Check if we need to set needsReview (3 or more flags)
                const newFlagCount = (questPost.flaggedBy ? questPost.flaggedBy.length : 0) + 1;
                needsReview = newFlagCount >= 3;
            }

            sendSuccessResponse(res, { success: true, flagged: flagged, needsReview: needsReview }, jwtToken);
        }
        catch(e)
        {
            console.log('Flag post error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/editPFP', upload.single('file'), validateJWTMiddleware, async (req, res, next) =>
    {
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

        try
        {
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
        catch(e)
        {
            console.log('Edit PFP error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/getProfile', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, jwtToken
        // outgoing: profileData, error

        const { userId, jwtToken } = req.body;

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        try
        {
            const db = getDatabase();

            const user = await db.collection('users').findOne(
                { _id: new ObjectId(userId) },
                { 
                    projection: { 
                        questCompleted: 1, 
                        'profile.displayName': 1, 
                        'profile.PFP': 1, 
                        questPosts: 1,
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
                questPosts: postsWithUrls.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp))
            };

            sendSuccessResponse(res, { profileData }, jwtToken);
        }
        catch(e)
        {
            console.log('Get profile error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/addFriend', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, friendId, jwtToken
        // outgoing: friends, error

        const { userId, friendId, jwtToken } = req.body;

        if (!userId || !friendId) {
            return sendErrorResponse(res, 'User ID and Friend ID are required', jwtToken, 400);
        }

       /* if (userId === friendId) {
            return sendErrorResponse(res, 'Cannot add yourself as a friend', jwtToken, 400);
        }*/

        try
        {
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
        catch(e)
        {
            console.log('Add friend error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/removeFriend', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, friendId, jwtToken
        // outgoing: friends, error

        const { userId, friendId, jwtToken } = req.body;

        if (!userId || !friendId) {
            return sendErrorResponse(res, 'User ID and Friend ID are required', jwtToken, 400);
        }

        try
        {
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
        catch(e)
        {
            console.log('Remove friend error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/fetchFriends', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, jwtToken
        // outgoing: friends (populated and sorted), error

        const { userId, jwtToken } = req.body;

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        try
        {
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
        catch(e)
        {
            console.log('Fetch friends error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/fetchScoreboard', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: jwtToken
        // outgoing: scoreboard, error

        const { jwtToken } = req.body;

        try
        {
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
        catch(e)
        {
            console.log('Fetch scoreboard error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/toggleNotifications', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, jwtToken
        // outgoing: success, notifications, error

        const { userId, jwtToken } = req.body;

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        try
        {
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
        catch(e)
        {
            console.log('Toggle notifications error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/rotateQuest', async (req, res, next) =>
    {
        // This endpoint handles the quest rotation logic
        // Can be called manually or by a cron job

        try
        {
            const db = getDatabase();
            
            // Step 1: Find all quests where isCycled is false
            let availableQuests = await db.collection('quests').find({ isCycled: false }).toArray();
            
            // Step 2: If no quests available, reset all quests to false
            if (availableQuests.length === 0) {
                await db.collection('quests').updateMany(
                    {},
                    { $set: { isCycled: false } }
                );
                
                // Fetch quests again after reset
                availableQuests = await db.collection('quests').find({ isCycled: false }).toArray();
                
                console.log(`Reset all quests. Found ${availableQuests.length} quests available.`);
            }
            
            // Step 3: Pick a random quest from available ones
            if (availableQuests.length === 0) {
                return sendResponse(res, { 
                    success: false, 
                    error: 'No quests available in the database',
                    timestamp: new Date()
                });
            }
            
            const randomIndex = Math.floor(Math.random() * availableQuests.length);
            const selectedQuest = availableQuests[randomIndex];
            
            // Step 4: Insert into currentquest table
            const currentQuestDoc = {
                questId: selectedQuest._id,
                timestamp: new Date(),
                questData: selectedQuest // Store the full quest data for reference
            };
            
            await db.collection('currentquest').insertOne(currentQuestDoc);
            
            // Step 5: Mark the selected quest as cycled
            await db.collection('quests').updateOne(
                { _id: selectedQuest._id },
                { $set: { isCycled: true } }
            );
            
            console.log(`Rotated quest: ${selectedQuest._id} at ${currentQuestDoc.timestamp}`);
            
            sendResponse(res, {
                success: true,
                selectedQuestId: selectedQuest._id,
                timestamp: currentQuestDoc.timestamp,
                availableQuestsRemaining: availableQuests.length - 1
            });
            
        }
        catch(e)
        {
            console.error('Quest rotation error:', e);
            sendResponse(res, { 
                success: false, 
                error: e.toString(),
                timestamp: new Date()
            }, 500);
        }
    });

    app.get('/api/currentQuest', async (req, res, next) =>
    {
        // Get the current active quest
        try
        {
            const db = getDatabase();
            
            const currentQuest = await db.collection('currentquest')
                .findOne({}, { sort: { timestamp: -1 } });
            
            if (!currentQuest) {
                return sendResponse(res, { 
                    success: false, 
                    error: 'No current quest found',
                    timestamp: new Date()
                });
            }
            
            sendResponse(res, {
                success: true,
                currentQuest: currentQuest,
                questDescription: currentQuest.questData?.description,
                timestamp: new Date()
            });
            
        }
        catch(e)
        {
            console.error('Get current quest error:', e);
            sendResponse(res, { 
                success: false, 
                error: e.toString(),
                timestamp: new Date()
            }, 500);
        }
    });
    
    app.post('/api/emailSend', async (req, res, next) => {
        //incoming: login, email, userId, jwtToken
        //outgoing: data { id }, error, jwtToken { accessToken }
        //the data field is email information provided by Resend API

        const { login, email, userId, jwtToken } = req.body; //email goes into to: object, login is for personalization

        //generate unique verification link using userId and jwtToken
        //for dev just replace with localhost
        const verificationLink = `http://supercoolfun.site/verify?UserId=${userId}&Token=${jwtToken}`;

        //set up email body
        //this is very simple and uses vanilla html
        //we can use React email to format the HTML better, but that also requires like 5 modules
        //because React doesn't play well with vanilla html/js. ever.
        const emailBody = `
            <h1>Welcome to Campus Quest, ${login}!</h1>
            <p>You're almost ready to begin your journey! Please verify your email by clicking the button below:</p>
            <button><a href=${verificationLink}><strong>Verify My Account</strong></a></button
        `

        try {
            //leave this block alone and just edit the emailBody above
            //idempotencyKey is for security
            //the contents can't be tampered with on resends after sending an email with the same key
            const emailData = await resend.emails.send(
                {
                    from: 'Campus Quest Team <no-reply@supercoolfun.site>',
                    to: email,
                    subject: 'Verify your Campus Quest account',
                    html: emailBody,
                },
                {
                    idempotencyKey: jwtToken,
                },
            );

            sendSuccessResponse(res, emailData, jwtToken, 200);
        } catch (error) {
            sendErrorResponse(res, emailData);
            console.log(error);
        }
    });
    
    app.post('/api/emailVerification', validateJWTMiddleware, async (req, res, next) => {
        // incoming: userId, jwtToken
        // outgoing: error, jwtToken
        // the middleware automatically checks expiry, code below just ensures the emailVerified value is updated

        const { userId, jwtToken } = req.body;

        if(!userId) {
            sendErrorResponse(res, 'Missing userId');
            return;
        }

        //find associated user in the database and set emailVerified to true
        try {
            const db = getDatabase();
            const results = await db.collection('users').updateOne({_id:new ObjectId(userId)}, {$set: { emailVerified: true}});

            if(results.matchedCount == 0) {
                sendErrorResponse(res, 'User does not exist');
                return;
            }
        } catch(e) {
            sendErrorResponse(res, e.message);
        }

        sendSuccessResponse(res, {error:''}, jwtToken, 200);
    });

    app.post('/api/editProfile', validateJWTMiddleware, async (req, res, next) => {
        // incoming: userId, displayName, bio, jwtToken
        // outgoing: error, jwtToken

        const { userId, displayName, bio, jwtToken } = req.body;

        if(!userId) {
            sendErrorResponse(res, 'Missing userId');
            return;
        }

        if(!displayName && !bio) {
            sendErrorResponse(res, 'At least one field (displayName or bio) must be provided');
            return;
        }

        try {
            const db = getDatabase();

            let updateObj = {};
            if(displayName) {
                updateObj['profile.displayName'] = displayName;
            }
            if(bio) {
                updateObj['profile.bio'] = bio;
            }

            const results = await db.collection('users').updateOne(
                {_id: new ObjectId(userId)},
                {$set: updateObj}
            );

            if(results.matchedCount == 0) {
                sendErrorResponse(res, 'User does not exist');
                return;
            }

            sendSuccessResponse(res, {error: ''}, jwtToken, 200);
        } catch(e) {
            sendErrorResponse(res, e.message);
        }
    });

    app.post('/api/deleteUser', validateJWTMiddleware, async (req, res, next) => {
        // incoming: userId, jwtToken
        // outgoing: error, jwtToken

        const { userId, jwtToken } = req.body;

        if(!userId) {
            sendErrorResponse(res, 'Missing userId');
            return;
        }

        try {
            const db = getDatabase();

            const user = await db.collection('users').findOne({_id: new ObjectId(userId)});

            if(!user) {
                sendErrorResponse(res, 'User does not exist');
                return;
            }

            // Delete user's media files from database
            await db.collection('media').deleteMany({userId: userId});

            // Delete the user from users collection
            const deleteResult = await db.collection('users').deleteOne({_id: new ObjectId(userId)});

            if(deleteResult.deletedCount === 0) {
                sendErrorResponse(res, 'Failed to delete user');
                return;
            }

            sendSuccessResponse(res, {error: '', message: 'User successfully deleted'}, jwtToken, 200);
        } catch(e) {
            sendErrorResponse(res, e.message);
        }
    });
}