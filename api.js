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

    app.post('/api/addcard', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: Card, UserId
        // outgoing: error
        
        const { userId, card, jwtToken } = req.body;
        const newCard = {Card: card, UserId: userId};
        var error = '';

        try
        {
            const db = getDatabase();
            await db.collection('Cards').insertOne(newCard);
        }
        catch(e)
        {
            error = e.toString();
        }

        sendSuccessResponse(res, { error: error }, jwtToken);
    });

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
                const userId = results[0]._id;
                const fn = results[0].firstName;
                const ln = results[0].lastName;

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

    app.post('/api/searchcards', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, search, jwtToken
        // outgoing: results[], error

        const { userId, search, jwtToken } = req.body;
        const _search = search.trim();

        try {
            const db = getDatabase();
            const results = await db.collection('Cards').find({"Card":{$regex:_search+'.*',$options:'i'}}).toArray();

            const _ret = results.map(result => result.Card);
            sendSuccessResponse(res, { results: _ret, error: '' }, jwtToken);
        } catch(e) {
            sendErrorResponse(res, e.toString(), jwtToken);
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
                    PFP: null
                },
                settings: {
                    notifications: true
                },
                createdAt: new Date(),
                questPosts: []
            };

            const result = await db.collection('users').insertOne(newUser);

            const ret = token.createToken(firstName, lastName, result.insertedId);

            sendResponse(res, ret);
        } catch(e) {
            sendResponse(res, { userId: null, firstName: '', lastName: '', error: e.toString() });
        }
    });

    // Add the new upload-media endpoint
    app.post('/api/upload-media', validateJWTMiddleware, upload.single('file'), async (req, res, next) =>
    {
        // incoming: file, userId, questid, jwtToken
        // outgoing: fileUrl, error

        const { jwtToken, userId, questId } = req.body;
        const file = req.file;

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

        // Determine destination folder and reject unsupported file types
        let folder = '';
        if (file.mimetype.startsWith('image/')) {
            folder = 'image';
        } else if (file.mimetype.startsWith('video/')) {
            folder = 'video';
        } else {
            return sendErrorResponse(res, 'Unsupported file type. Please upload an image or video.', jwtToken, 400);
        }

        // Generate filename without timestamp. WARNING: This will overwrite previous uploads for the same quest/user.
        const fileExtension = file.originalname.split('.').pop();
        const baseFileName = `questId-${questId}-userId-${userId}.${fileExtension}`;
        const objectKey = `${folder}/${baseFileName}`;

        try
        {
            // Upload to R2
            const uploadParams = {
                Bucket: 'campus-quest-media',
                Key: objectKey,
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            const command = new PutObjectCommand(uploadParams);
            await r2Client.send(command);

            // Generate file URL for the API response
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

    app.post('/api/get-media', validateJWTMiddleware, async (req, res, next) =>
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

    app.post('/api/submitQuest', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, questId, mediaPath, jwtToken
        // outgoing: success, error

        const { userId, questId, mediaPath, jwtToken } = req.body;

        if (!userId) {
            return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
        }

        if (!questId) {
            return sendErrorResponse(res, 'Quest ID is required', jwtToken, 400);
        }

        if (!mediaPath) {
            return sendErrorResponse(res, 'Media path is required', jwtToken, 400);
        }

        try
        {
            const db = getDatabase();
            
            // Create the quest post object
            const questPost = {
                questId: questId,
                userId: userId,
                mediaPath: mediaPath,
                likes: 0,
                flagged: 0,
                timeStamp: new Date(),
                likedBy: [],
                flaggedBy: []
            };

            // Update the user document: add quest post to questPosts array and increment questCompleted
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
            console.log('Submit quest error:', e.toString());
            sendErrorResponse(res, e.toString(), jwtToken, 500);
        }
    });

    app.post('/api/likePost', validateJWTMiddleware, async (req, res, next) =>
    {
        // incoming: userId, questPostId, jwtToken
        // outgoing: success, liked, error

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
    
    app.post('/api/email-send', async (req, res, next) => {
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
    
    app.post('/api/email-verification', validateJWTMiddleware, async (req, res, next) => {
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
}