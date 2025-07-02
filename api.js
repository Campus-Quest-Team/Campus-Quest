require('express');
require('mongodb');

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');

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
    app.post('/api/addcard', async (req, res, next) =>
    {
        // incoming: Card, UserId
        // outgoing: error
        
        const { userId, card, jwtToken } = req.body;

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
        }

        const newCard = {Card:card, UserId:userId};
        var error = '';

        try
        {
            //database name we're using
            const db = client.db('COP4331Cards');
            const result = db.collection('Cards').insertOne(newCard);
        }
        catch(e)
        {
            error = e.toString();
        }

        var refreshedToken = null;
        try
        {
            refreshedToken = token.refresh(jwtToken);
        }
        catch(e)
        {
            console.log(e.message);
        }

        var ret = { error: error, jwtToken: refreshedToken};
        res.status(200).json(ret);
    });

    app.post('/api/login', async (req, res, next) =>
    {
        // incoming: login, password
        // outgoing: id, firstName, lastName, error

        var error = '';

        const { login, password } = req.body;

        //name of DB we're using
        const db = client.db('COP4331Cards');
        const results = await db.collection('Users').find({Login:login, Password:password}).toArray();

        var id = -1;
        var fn = ''; //firstname
        var ln = ''; //lastname

        if(results.length > 0)
        {
            id = results[0].insertedId;
            fn = results[0].FirstName;
            ln = results[0].LastName;

            try
            {
                const token = require("./createJWT.js");
                ret = token.createToken(fn, ln, id);
            }
            catch(e)
            {
                ret = {error:e.message};
            }
        }
        else
        {
            ret = {error:"Login/Password incorrect"};
        }

        //var ret = { id:id, firstName:fn, lastName:ln, error:'' };
        res.status(200).json(ret);
    });

    app.post('/api/searchcards', async (req, res, next) =>
    {
        // incoming: userId, search, jwtToken
        // outgoing: results[], error

        var error = '';

        const { userId, search, jwtToken } = req.body;

        try
        {
            if(token.isExpired(jwtToken))
            {
                var r = {error:'The JWT is no longer valid', jwtToken: ''};
                res.status(200).json(r);
                return;
            }
        }
        catch(e)
        {
            console.log(e.message);
        }

        var _search = search.trim();

        //database name we're using
        const db = client.db('COP4331Cards');
        const results = await db.collection('Cards').find({"Card":{$regex:_search+'.*',$options:'i'}}).toArray();

        var _ret = [];

        for( var i=0; i < results.length; i++)
        {
            _ret.push(results[i].Card);
        }

        var refreshedToken = null;
        try
        {
            refreshedToken = token.refresh(jwtToken);
        }
        catch(e)
        {
            console.log(e.message);
        }

        var ret = { results:_ret, error:error, jwtToken: refreshedToken };
        res.status(200).json(ret);
    });

    app.post('/api/register', async (req, res, next) =>
    {
        // incoming: login, password, firstName, lastName
        // outgoing: id, firstName, lastName, error

        var error = '';

        const { login, password, firstName, lastName } = req.body;

        const db = client.db('COP4331Cards');

        // Check if user already exists
        const existingUser = await db.collection('Users').find({Login:login}).toArray();

        if(existingUser.length > 0)
        {
            var ret = { id:-1, firstName:'', lastName:'', error:'User already exists' };
            res.status(200).json(ret);
            return;
        }

        try
        {
            // Insert new user
            const newUser = {
                Login: login,
                Password: password,
                FirstName: firstName,
                LastName: lastName
            };

            const result = await db.collection('Users').insertOne(newUser);
            const id = result.insertedId;

            var ret = { userId:id, firstName:firstName, lastName:lastName, error:'' };
            res.status(200).json(ret);
        }
        catch(e)
        {
            var ret = { id:-1, firstName:'', lastName:'', error:e.toString() };
            res.status(200).json(ret);
        }
    });

    // Add the new upload-media endpoint
    app.post('/api/upload-media', upload.single('file'), async (req, res, next) =>
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
            return res.status(400).json({ error: 'User ID is required', jwtToken: '' });
        }

        if (!questId) {
            return res.status(400).json({ error: 'Quest ID is required', jwtToken: '' });
        }

        // Validate file
        if (!file) {
            var ret = { error: 'No file provided', jwtToken: '' };
            res.status(400).json(ret);
            return;
        }

        // Determine destination folder and reject unsupported file types
        let folder = '';
        if (file.mimetype.startsWith('image/')) {
            folder = 'image';
        } else if (file.mimetype.startsWith('video/')) {
            folder = 'video';
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload an image or video.' });
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
            const db = client.db('COP4331Cards');
            await db.collection('Media').updateOne(
                { userId: userId, questId: questId },
                {
                    $set: {
                        filePath: objectKey,
                        uploadTimestamp: new Date()
                    }
                },
                { upsert: true }
            );

            var refreshedToken = null;
            try
            {
                refreshedToken = token.refresh(jwtToken);
            }
            catch(e)
            {
                console.log(e.message);
            }

            var ret = { fileUrl: fileUrl, error: '', jwtToken: refreshedToken };
            res.status(200).json(ret);
        }
        catch(e)
        {
            error = e.toString();
            console.log('R2 upload or DB error:', error);
            
            var refreshedToken = null;
            try
            {
                refreshedToken = token.refresh(jwtToken);
            }
            catch(e)
            {
                console.log(e.message);
            }

            var ret = { error: error, jwtToken: refreshedToken };
            res.status(500).json(ret);
        }
    });

    app.post('/api/get-media', async (req, res, next) =>
    {
        // incoming: userId, questId, jwtToken
        // outgoing: signedUrl, error

        const { userId, questId, jwtToken } = req.body;
        var error = '';

        try
        {
            if (token.isExpired(jwtToken)) {
                var r = { error: 'The JWT is no longer valid', jwtToken: '' };
                return res.status(200).json(r);
            }
        }
        catch (e)
        {
            console.log(e.message);
            error = 'Invalid token';
        }

        if (!userId || !questId) {
            return res.status(400).json({ error: 'userId and questId are required' });
        }

        try {
            const db = client.db('COP4331Cards');
            
            const mediaRecord = await db.collection('Media').findOne(
                { userId: userId, questId: questId },
                { sort: { uploadTimestamp: -1 } } 
            );

            if (!mediaRecord) {
                return res.status(404).json({ error: 'No media found for the given user and quest' });
            }

            const command = new GetObjectCommand({
                Bucket: 'campus-quest-media',
                Key: mediaRecord.filePath,
            });

            const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
            
            var refreshedToken = null;
            try {
                refreshedToken = token.refresh(jwtToken);
            } catch (e) {
                console.log(e.message);
            }

            res.status(200).json({ signedUrl: signedUrl, error: '', jwtToken: refreshedToken });

        } catch (e) {
            error = e.toString();
            console.error('Error getting signed URL:', e);

            var refreshedToken = null;
            try {
                refreshedToken = token.refresh(jwtToken);
            } catch (e) {
                console.log(e.message);
            }

            res.status(500).json({ error: error, jwtToken: refreshedToken });
        }
    });
}