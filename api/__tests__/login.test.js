const request = require('supertest');
const app = require('../../server'); // Adjust path if needed
const { MongoClient } = require('mongodb');

describe('POST /api/login', () => {
  let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(process.env.MONGODB_URI);
    db = await connection.db();
  });

  afterAll(async () => {
    await connection.close();
  });

  it('should succeed with correct credentials', async () => {
    // Replace these with a real user in your test database
    const testUser = {
      login: 'test',
      password: 'test'
    };
    const res = await request(app)
      .post('/api/login')
      .send(testUser)
      .set('Accept', 'application/json');
    if (res.body && res.body.accessToken && res.body.userId && !res.body.error) {
      console.log('PASS: User was able to successfully log in.');
    } else {
      console.log('FAIL: User was NOT able to log in.');
    }
    expect(res.body && res.body.accessToken && res.body.userId && !res.body.error).toBe(true);
  });
});