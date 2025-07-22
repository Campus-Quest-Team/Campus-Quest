const request = require('supertest');
const app = require('../../server');
const { MongoClient } = require('mongodb');

describe('Scoreboard and Friends List Workflow', () => {
    let connection;
    let db;
    let jwtToken, userId;

    beforeAll(async () => {
        // --- Connect to the database ---
        connection = await MongoClient.connect(process.env.MONGODB_URI);
        db = await connection.db();

        // --- Step 1: Login to get a valid token ---
        const loginRes = await request(app)
            .post('/api/login')
            .send({ login: 'test', password: 'test' });
        expect(loginRes.body.accessToken).toBeDefined();
        jwtToken = loginRes.body.accessToken;
        userId = loginRes.body.userId;
    });

    afterAll(async () => {
        // --- Clean up and close connection ---
        await connection.close();
    });

    // --- Step 2: Test fetchFriends endpoint ---
    it('should fetch the current user\'s friends list', async () => {
        const res = await request(app)
            .post('/api/fetchFriends')
            .send({ userId, jwtToken });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.friends).toBeInstanceOf(Array);
    });

    // --- Step 3: Test fetchScoreboard endpoint ---
    it('should fetch the global scoreboard', async () => {
        const res = await request(app)
            .post('/api/fetchScoreboard')
            .send({ jwtToken });

        expect(res.statusCode).toBe(200);
        expect(res.body.scoreboard).toBeInstanceOf(Array);

        // Verify the structure of the first user in the scoreboard
        if (res.body.scoreboard.length > 0) {
            const firstEntry = res.body.scoreboard[0];
            expect(firstEntry).toHaveProperty('userId');
            expect(firstEntry).toHaveProperty('displayName');
            expect(firstEntry).toHaveProperty('pfp');
            expect(firstEntry).toHaveProperty('questCompleted');
        }
    });
}); 