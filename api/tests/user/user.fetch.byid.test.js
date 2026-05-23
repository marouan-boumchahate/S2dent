import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpointBase = '/api/users';

const cleanupUsers = async () => {
  await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@userfetchbyid.test')`);
  await db.query(`DELETE FROM users WHERE email LIKE '%@userfetchbyid.test'`);
};

const seedUser = async (opts = {}) => {
  const {
    email = `user.${Date.now()}@userfetchbyid.test`,
    full_name = 'Fetch ById User',
    national_id = `NB-${Date.now()}`,
    withIdentity = true,
    role = 'student',
  } = opts;

  const first_name = 'Fetch';
  const middle_name = null;
  const last_name = 'ById';
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

describe('GET /api/users/:id', () => {
  beforeEach(async () => {
    await cleanupUsers();
  });

  afterEach(async () => {
    await cleanupUsers();
  });

  it('returns the user profile when called by an academy token', async () => {
    const user = await seedUser({ withIdentity: true });
    const academyToken = issueAccessToken({ role: 'academy' });

    const res = await request(app)
      .get(`${endpointBase}/${user.id}`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'User retrieved successfully');

    const { user: detail } = res.body.data;
    assert.equal(detail.id, user.id);
    assert.equal(detail.email, user.email);
  });

  it('returns 403 when a student token calls the user by id route', async () => {
    const user = await seedUser({ withIdentity: true });
    const token = issueAccessToken({ role: 'student', uid: user.id });

    const res = await request(app)
      .get(`${endpointBase}/${user.id}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('returns 404 when the requested user has no active identity', async () => {
    const user = await seedUser({ withIdentity: false });
    const academyToken = issueAccessToken({ role: 'academy' });

    const res = await request(app)
      .get(`${endpointBase}/${user.id}`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'USER_NOT_FOUND');
  });
});
