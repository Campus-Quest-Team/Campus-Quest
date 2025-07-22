const request = require('supertest');
const app = require('../../server'); // Adjust path if needed
const path = require('path');
const { MongoClient } = require('mongodb');

describe('Post Workflow', () => {
  let connection;
  let db;
  let jwtToken, userId, questId, postId, questDescription;

  beforeAll(async () => {
    // --- Connect to the database ---
    connection = await MongoClient.connect(process.env.MONGODB_URI);
    db = await connection.db();

    // --- Step 1: Login ---
    const loginRes = await request(app)
      .post('/api/login')
      .send({ login: 'test', password: 'test' });
    expect(loginRes.body.accessToken).toBeDefined();
    jwtToken = loginRes.body.accessToken;
    userId = loginRes.body.userId;

    // --- Step 2: Get Current Quest ---
    const questRes = await request(app).get('/api/currentQuest');
    expect(questRes.body.currentQuest.questId).toBeDefined();
    questId = questRes.body.currentQuest.questId;
    questDescription = questRes.body.currentQuest.questData.questDescription; // Corrected property name
  });

  afterAll(async () => {
    // --- Clean up and close connection ---
    await connection.close();
  });

  // --- Step 3: Submit a post ---
  it('should submit a new post for the current quest', async () => {
    const mediaFilePath = path.join(__dirname, '../../frontend/public/image.png');
    const res = await request(app)
      .post('/api/submitPost')
      .field('userId', userId)
      .field('questId', questId)
      .field('caption', 'Jest test caption')
      .field('questDescription', questDescription)
      .field('jwtToken', jwtToken)
      .attach('file', mediaFilePath);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.questPostId).toBeDefined();
    postId = res.body.questPostId; // Save for subsequent tests
  });

  // --- Step 4: Check quest completion status ---
  it('should confirm the user has completed the current quest', async () => {
    const res = await request(app)
      .post('/api/hasCompletedCurrentQuest')
      .send({ userId, jwtToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.hasCompleted).toBe(true);
  });
  
  // --- Step 5: Like the post ---
  it('should allow a user to like the post', async () => {
    const res = await request(app)
      .post('/api/likePost')
      .send({ userId, questPostId: postId, jwtToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.liked).toBe(true);
  });

  // --- Step 6: Flag the post ---
  it('should allow a user to flag the post', async () => {
    const res = await request(app)
      .post('/api/flagPost')
      .send({ userId, questPostId: postId, jwtToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.flagged).toBe(true);
  });

  // --- Step 7: Edit the caption ---
  it('should allow the user to edit the post caption', async () => {
    const newCaption = 'This caption was edited by Jest';
    const res = await request(app)
      .post('/api/editCaption')
      .send({ userId, postId, caption: newCaption, jwtToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newCaption).toBe(newCaption);
  });

  // --- Step 8: Delete the post ---
  it('should allow the user to delete their post', async () => {
    const res = await request(app)
      .post('/api/deletePost')
      .send({ userId, postId, jwtToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
}); 