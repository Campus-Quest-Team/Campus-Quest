const request = require('supertest');
const app =require('../../server');
const { MongoClient, ObjectId } = require('mongodb');

describe('Friends Workflow', () => {
    let connection;
    let db;
    let mainUserToken, mainUserId;
    let friendUserId;

    beforeAll(async () => {
        // --- Connect to the database ---
        connection = await MongoClient.connect(process.env.MONGODB_URI);
        db = await connection.db();

        // --- Step 1: Login as the main user ---
        const loginRes = await request(app)
            .post('/api/login')
            .send({ login: 'test', password: 'test' });
        expect(loginRes.body.accessToken).toBeDefined();
        mainUserToken = loginRes.body.accessToken;
        mainUserId = loginRes.body.userId;
        
        // --- Step 2: Find another user to be the friend ---
        // This assumes another user exists. For a more robust test, you could create one here.
        const friendUser = await db.collection('users').findOne({ login: { $ne: 'test' } });
        expect(friendUser).toBeDefined();
        friendUserId = friendUser._id.toString();
    });

    afterAll(async () => {
        // --- Clean up and close connection ---
        // Ensure the main user has no friends from this test
        await db.collection('users').updateOne(
            { _id: new ObjectId(mainUserId) },
            { $set: { friends: [] } }
        );
        await connection.close();
    });

    // --- Main Test Workflow ---
    it('should add a new friend and then remove them successfully', async () => {
        // --- Step 3: Add Friend ---
        const addRes = await request(app)
            .post('/api/addFriend')
            .send({ userId: mainUserId, friendId: friendUserId, jwtToken: mainUserToken });
        
        expect(addRes.statusCode).toBe(200);
        expect(addRes.body.friends).toContain(friendUserId);

        // --- Step 4: Fetch Friends to Verify Addition ---
        const fetchRes1 = await request(app)
            .post('/api/fetchFriends')
            .send({ userId: mainUserId, jwtToken: mainUserToken });

        expect(fetchRes1.statusCode).toBe(200);
        const friendIds = fetchRes1.body.friends.map(f => f._id);
        expect(friendIds).toContain(friendUserId);

        // --- Step 5: Remove Friend ---
        const removeRes = await request(app)
            .post('/api/removeFriend')
            .send({ userId: mainUserId, friendId: friendUserId, jwtToken: mainUserToken });
        
        expect(removeRes.statusCode).toBe(200);
        expect(removeRes.body.friends).not.toContain(friendUserId);

        // --- Step 6: Fetch Friends to Verify Removal ---
        const fetchRes2 = await request(app)
            .post('/api/fetchFriends')
            .send({ userId: mainUserId, jwtToken: mainUserToken });

        expect(fetchRes2.statusCode).toBe(200);
        const finalFriendIds = fetchRes2.body.friends.map(f => f._id);
        expect(finalFriendIds).not.toContain(friendUserId);
    });
}); 