const express = require('express');
const { ObjectId } = require('mongoose').Types;
const multer = require('multer');
const token = require('../../createJWT.js');
const { sendResponse, sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const { validateJWTMiddleware } = require('../middleware/auth');
const { r2Client, getPresignedUrl, uploadFileToR2, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('../utils/r2');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Mongoose Models
const User = require('../../models/users');
const Media = require('../../models/media');
const Quest = require('../../models/quests');
const CurrentQuest = require('../../models/CurrentQuest.js');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/uploadMedia', upload.single('file'), validateJWTMiddleware, async (req, res, next) => {
    // incoming: file, userId, questid, jwtToken
    // outgoing: fileUrl, error

    const { jwtToken, userId, questId } = req.body;
    const file = req.file;
    var error = '';

    // Validate JWT token
    try {
        if(token.isExpired(jwtToken)) {
            var r = {error:'The JWT is no longer valid', jwtToken:''};
            res.status(200).json(r);
            return;
        }
    }
    catch(e) {
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

    try {
        const objectKey = await uploadFileToR2(req.file, userId, questId);
        const fileUrl = `${process.env.R2_PUBLIC_URL}/${objectKey}`;

        // Update or insert media info in MongoDB. This prevents duplicate records for the same file path.
        await Media.updateOne(
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
    catch(e) {
        console.log('R2 upload or DB error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/getMedia', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, questId, jwtToken
    // outgoing: signedUrl, error

    const { userId, questId, jwtToken } = req.body;

    if (!userId || !questId) {
        return sendErrorResponse(res, 'userId and questId are required', jwtToken, 400);
    }

    try {
        const mediaRecord = await Media.findOne({ userId, questId }).sort({ uploadTimestamp: -1 });

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

router.post('/submitPost', upload.single('file'), validateJWTMiddleware, async (req, res, next) => {
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

    try {
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
        const result = await User.findByIdAndUpdate(
            userId,
            {
                $push: { questPosts: questPost },
                $inc: { questCompleted: 1 }
            }
        );

        if (!result) {
            return sendErrorResponse(res, 'User not found', jwtToken, 404);
        }

        sendSuccessResponse(res, { success: true, questPostId: questPost._id }, jwtToken);
    }
    catch(e) {
        console.log('Submit post error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/likePost', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, questPostId, jwtToken
    // outgoing: success, liked, likeCount, error

    const { userId, questPostId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    if (!questPostId) {
        return sendErrorResponse(res, 'Quest Post ID is required', jwtToken, 400);
    }

    try {
        const userWithPost = await User.findOne({ 'questPosts._id': questPostId });

        if (!userWithPost) {
            return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
        }
        
        const post = userWithPost.questPosts.id(questPostId);
        
        if (!post) {
             return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
        }

        let liked = false;
        const userIndex = post.likedBy.indexOf(userId);

        if (userIndex > -1) {
            // Unlike
            post.likedBy.splice(userIndex, 1);
            post.likes = Math.max(0, post.likes - 1);
            liked = false;
        } else {
            // Like
            post.likedBy.push(userId);
            post.likes += 1;
            liked = true;
        }

        await userWithPost.save();
        
        sendSuccessResponse(res, { success: true, liked: liked, likeCount: post.likes }, jwtToken);
    }
    catch(e) {
        console.log('Like post error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/flagPost', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, questPostId, jwtToken
    // outgoing: success, flagged, needsReview, error

    const { userId, questPostId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    if (!questPostId) {
        return sendErrorResponse(res, 'Quest Post ID is required', jwtToken, 400);
    }

    try {
        const userWithPost = await User.findOne({ 'questPosts._id': questPostId });

        if (!userWithPost) {
            return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
        }

        const post = userWithPost.questPosts.id(questPostId);
        
        if (!post) {
            return sendErrorResponse(res, 'Quest post not found', jwtToken, 404);
        }

        let flagged = false;
        let needsReview = false;

        const userAlreadyFlagged = post.flaggedBy.includes(userId);

        if (userAlreadyFlagged) {
            flagged = true;
        } else {
            post.flaggedBy.push(userId);
            post.flagged += 1;
            await userWithPost.save();
            flagged = true;
        }
        
        needsReview = post.flaggedBy.length >= 3;

        sendSuccessResponse(res, { success: true, flagged: flagged, needsReview: needsReview }, jwtToken);
    }
    catch(e) {
        console.log('Flag post error:', e.toString());
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/rotateQuest', async (req, res, next) => {
    // This endpoint handles the quest rotation logic
    // Can be called manually or by a cron job

    try {
        // Step 1: Find all quests where isCycled is false
        let availableQuests = await Quest.find({ isCycled: false });
        
        // Step 2: If no quests available, reset all quests to false
        if (availableQuests.length === 0) {
            await Quest.updateMany({}, { $set: { isCycled: false } });
            
            // Fetch quests again after reset
            availableQuests = await Quest.find({ isCycled: false });
            
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
            questData: selectedQuest.toObject() // Store the full quest data for reference
        };
        
        await CurrentQuest.create(currentQuestDoc);
        
        // Step 5: Mark the selected quest as cycled
        await Quest.findByIdAndUpdate(selectedQuest._id, { $set: { isCycled: true } });
        
        console.log(`Rotated quest: ${selectedQuest._id} at ${currentQuestDoc.timestamp}`);
        
        sendResponse(res, {
            success: true,
            selectedQuestId: selectedQuest._id,
            timestamp: currentQuestDoc.timestamp,
            availableQuestsRemaining: availableQuests.length - 1
        });
        
    }
    catch(e) {
        console.error('Quest rotation error:', e);
        sendResponse(res, { 
            success: false, 
            error: e.toString(),
            timestamp: new Date()
        }, 500);
    }
});

router.get('/getCurrentQuest', async (req, res, next) => {
    // Get the current active quest
    try {
        const currentQuest = await CurrentQuest.findOne().sort({ timestamp: -1 });
        
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
            questDescription: currentQuest.questData?.questDescription,
            timestamp: new Date()
        });
        
    }
    catch(e) {
        console.error('Get current quest error:', e);
        sendResponse(res, { 
            success: false, 
            error: e.toString(),
            timestamp: new Date()
        }, 500);
    }
});

router.post('/getFeed', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: feed, error

    const { userId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    try {
        // Define the date range for "today"
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
sendSuccessResponse
        // Aggregation pipeline to build the feed
        const pipeline = [
            // Match users who are not the requester and are verified
            {
                $match: {
                    _id: { $ne: new ObjectId(userId) },
                    emailVerified: true
                }
            },
            // Unwind the questPosts array
            {
                $unwind: '$questPosts'
            },
            // Filter posts to today's date
            {
                $match: {
                    'questPosts.timeStamp': {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                }
            },
            // Sort by most recent post
            {
                $sort: {
                    'questPosts.timeStamp': -1
                }
            },
            // Project the required fields
            {
                $project: {
                    _id: 0,
                    post: '$questPosts',
                    creator: {
                        userId: '$_id',
                        displayName: '$profile.displayName',
                        pfpPath: '$profile.PFP'
                    }
                }
            }
        ];

        const feedItems = await User.aggregate(pipeline);

        // Generate signed URLs for media and PFPs
        const processedFeed = await Promise.all(feedItems.map(async (item) => {
            const mediaUrl = await getPresignedUrl(item.post.mediaPath);
            const pfpUrl = await getPresignedUrl(item.creator.pfpPath);
            
            // Destructure to rename _id to postId and remove mediaPath and userId
            const { _id: postId, userId, mediaPath, ...restOfPost } = item.post;

            return {
                postId: postId,
                ...restOfPost,
                mediaUrl: mediaUrl,
                creator: {
                    userId: item.creator.userId,
                    displayName: item.creator.displayName,
                    pfpUrl: pfpUrl
                }
            };
        }));

        sendSuccessResponse(res, { feed: processedFeed }, jwtToken);

    } catch (e) {
        console.error('Get feed error:', e);
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/deletePost', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, postId, jwtToken
    // outgoing: success, message, error

    const { userId, postId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }
    if (!postId) {
        return sendErrorResponse(res, 'Post ID is required', jwtToken, 400);
    }

    try {
        // Find the user and the specific post to ensure it exists before we do anything.
        const user = await User.findOne({ _id: userId, 'questPosts._id': postId });

        if (!user) {
            return sendErrorResponse(res, 'Post not found or you do not have permission to delete it.', jwtToken, 404);
        }

        const postToDelete = user.questPosts.id(postId);
        const mediaPath = postToDelete.mediaPath;

        // Step 1: Delete the media from R2 if a path exists.
        if (mediaPath) {
            try {
                const deleteParams = {
                    Bucket: 'campus-quest-media',
                    Key: mediaPath,
                };
                const command = new DeleteObjectCommand(deleteParams);
                await r2Client.send(command);
                console.log(`Successfully deleted media from R2: ${mediaPath}`);
            } catch (deleteError) {
                // Log the error but continue, as the main goal is to remove the post from the database.
                console.error(`Failed to delete media from R2: ${mediaPath}. Proceeding with DB deletion.`, deleteError.toString());
            }
        }

        // Step 2: Pull the post from the array and decrement the quest count.
        await User.updateOne(
            { _id: userId },
            {
                $pull: { questPosts: { _id: postId } },
                $inc: { questCompleted: -1 }
            }
        );

        sendSuccessResponse(res, { success: true, message: 'Post deleted successfully.' }, jwtToken);

    } catch (e) {
        console.error('Delete post error:', e);
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/editCaption', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, postId, caption, jwtToken
    // outgoing: success, postId, newCaption, error

    const { userId, postId, caption, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }
    if (!postId) {
        return sendErrorResponse(res, 'Post ID is required', jwtToken, 400);
    }

    // Caption can be an empty string, but we should handle null/undefined.
    const newCaption = caption !== undefined && caption !== null ? caption : '';

    try {
        const result = await User.updateOne(
            { 
                _id: userId, 
                'questPosts._id': postId 
            },
            { 
                $set: { 'questPosts.$.caption': newCaption } 
            }
        );

        if (result.matchedCount === 0) {
            return sendErrorResponse(res, 'Post not found or you do not have permission to edit it.', jwtToken, 404);
        }

        // If modifiedCount is 0, it might just mean the caption was the same.
        // We can still consider this a success.
        sendSuccessResponse(res, { success: true, postId: postId, newCaption: newCaption }, jwtToken);

    } catch (e) {
        console.error('Edit caption error:', e);
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

router.post('/hasCompletedCurrentQuest', validateJWTMiddleware, async (req, res, next) => {
    // incoming: userId, jwtToken
    // outgoing: success, hasCompleted, post, error

    const { userId, jwtToken } = req.body;

    if (!userId) {
        return sendErrorResponse(res, 'User ID is required', jwtToken, 400);
    }

    try {
        const user = await User.findById(userId).select('questPosts');

        if (!user || !user.questPosts || user.questPosts.length === 0) {
            return sendSuccessResponse(res, { success: true, hasCompleted: false, post: null }, jwtToken);
        }

        // Sort posts by timestamp descending to get the most recent one
        const sortedPosts = user.questPosts.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp));
        const mostRecentPost = sortedPosts[0];

        // Check if the most recent post was created today
        const postDate = new Date(mostRecentPost.timeStamp);
        const today = new Date();

        const isToday = postDate.getFullYear() === today.getFullYear() &&
                      postDate.getMonth() === today.getMonth() &&
                      postDate.getDate() === today.getDate();

        if (isToday) {
            sendSuccessResponse(res, { success: true, hasCompleted: true, post: mostRecentPost.toObject() }, jwtToken);
        } else {
            sendSuccessResponse(res, { success: true, hasCompleted: false, post: null }, jwtToken);
        }

    } catch (e) {
        console.error('Has completed current quest error:', e);
        sendErrorResponse(res, e.toString(), jwtToken, 500);
    }
});

module.exports = router; 