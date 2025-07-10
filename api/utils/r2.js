const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Configure R2 client
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

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

module.exports = {
    r2Client,
    getPresignedUrl,
    uploadFileToR2,
    uploadPFPToR2,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
}; 