const request = require('supertest');
const app = require('../../server'); // Adjust path if needed
const path = require('path');

describe('Profile workflow /api/getProfile, /api/editPFP, /api/editProfile', () => {
  let jwtToken, userId;

  // --- Step 1: Login to get a valid token ---
  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/login')
      .send({ login: 'test', password: 'test' }); // Use a known test user
    expect(loginRes.body.accessToken).toBeDefined();
    jwtToken = loginRes.body.accessToken;
    userId = loginRes.body.userId;
  });

  // --- Step 2: Test getProfile ---
  it('should fetch the user profile', async () => {
    const res = await request(app)
      .post('/api/getProfile')
      .send({ userId, jwtToken })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.profileData).toBeDefined();
    expect(res.body.profileData.displayName).toBeDefined();
  });

  // --- Step 3: Test editPFP ---
  it('should update the profile picture', async () => {
    const pfpFilePath = path.join(__dirname, '../../frontend/public/image.png');
    const res = await request(app)
      .post('/api/editPFP')
      .field('userId', userId)
      .field('jwtToken', jwtToken)
      .attach('file', pfpFilePath);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pfpUrl).toBeDefined();
  });

  // --- Step 4: Test editProfile ---
  it('should update the display name and bio', async () => {
    const profileUpdate = {
      userId,
      jwtToken,
      displayName: 'Jest Tester',
      bio: 'This is a test bio from Jest.'
    };
    const res = await request(app)
      .post('/api/editProfile')
      .send(profileUpdate)
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.updatedProfile.displayName).toBe('Jest Tester');
    expect(res.body.updatedProfile.bio).toBe('This is a test bio from Jest.');
  });
}); 