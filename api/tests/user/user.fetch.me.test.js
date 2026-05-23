import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/users/me';

const cleanupUsers = async () => {
  await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@userfetchme.test')`);
  await db.query(`DELETE FROM users WHERE email LIKE '%@userfetchme.test'`);
};

const seedUser = async (opts = {}) => {
  const {
    email = `user.${Date.now()}@userfetchme.test`,
    full_name = 'Fetch Me User',
    national_id = `NF-${Date.now()}`,
    withIdentity = true,
    role = 'student',
  } = opts;

  const first_name = 'Fetch';
  const middle_name = null;
  const last_name = 'Me';
  const date_of_birth = '1990-01-01';
  const gender = 'male';
  const nationality = 'Testland';

  const { rows: [u] } = await db.query(
    `INSERT INTO users (first_name, middle_name, last_name, full_name, date_of_birth, gender, national_id, nationality, email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, email, full_name, national_id`,
    [first_name, middle_name, last_name, full_name, date_of_birth, gender, national_id, nationality, email]
  );

  if (withIdentity) {
    await db.query(`INSERT INTO identities (user_id, role, issued_at) VALUES ($1, $2, NOW())`, [u.id, role]);
  }

  return u;
};

const issueAccessToken = (payload = {}) => signTokens(
  { sub: '0x0000000000000000000000000000000000000001', ...payload },
  undefined,
  true,
).accessToken;

describe('GET /api/users/me', () => {
  beforeEach(async () => {
    await cleanupUsers();
  });

  afterEach(async () => {
    await cleanupUsers();
  });

  it('returns the authenticated user profile for student role', async () => {
    const user = await seedUser({ withIdentity: true, role: 'student' });
    const token = issueAccessToken({ role: 'student', uid: user.id });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'User profile retrieved successfully');

    const { user: detail } = res.body.data;
    assert.equal(detail.id, user.id);
    assert.equal(detail.email, user.email);
  });

  it('returns 403 when an academy token calls the user /me route', async () => {
    const user = await seedUser({ withIdentity: true, role: 'student' });
    const academyToken = issueAccessToken({ role: 'academy' });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('returns 404 when the user identity is missing or revoked', async () => {
    const user = await seedUser({ withIdentity: false });
    const token = issueAccessToken({ role: 'student', uid: user.id });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'USER_NOT_FOUND');
  });
});
