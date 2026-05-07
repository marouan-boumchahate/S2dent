import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/users';

const cleanupUsers = async () => {
  await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@userupdatecases.test')`);
  await db.query(`DELETE FROM users WHERE email LIKE '%@userupdatecases.test'`);
};

const validBody = (overrides = {}) => ({
  phone: '+905557654321',
  photo_url: 'https://example.com/photo.png',
  notes: 'Updated notes',
  ...overrides,
});

let userColumnCache = null;

const getUserColumns = async () => {
  if (userColumnCache) return userColumnCache;

  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`
  );

  userColumnCache = new Set(rows.map((row) => row.column_name));
  return userColumnCache;
};

const seedTUser = async () => {
  const columns = await getUserColumns();

  const insertCols = [
    'first_name',
    'middle_name',
    'last_name',
    'full_name',
    'date_of_birth',
    'gender',
    'national_id',
    'email',
    'phone',
    'photo_url',
    'notes',
  ];
  const insertVals = [
    'User',
    'Update',
    'Cases',
    'User Update Cases',
    '2000-01-15',
    'male',
    'USER-UPD-001',
    'user.update@userupdatecases.test',
    '+905551234567',
    null,
    null,
  ];

  if (columns.has('nationality')) {
    insertCols.push('nationality');
    insertVals.push('Turkish');
  }

  const placeholders = insertVals.map((_, idx) => `$${idx + 1}`).join(', ');

  const { rows: [u] } = await db.query(
    `INSERT INTO users (${insertCols.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertVals,
  );

  await db.query(
    `INSERT INTO identities (user_id, role, is_active)
     VALUES ($1, $2, $3)`,
    [u.id, 'student', true],
  );

  return u.id;
};

let USER_ID;

beforeEach(async () => {
  await cleanupUsers();
  USER_ID = await seedTUser();
});

afterEach(async () => {
  sinon.restore();
});

describe('PUT /api/users/:id', () => {
  it('returns 200 and the updated user DTO on valid full update', async () => {
    const body = validBody();

    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send(body);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'User updated successfully');

    const { user } = res.body.data;

    assert.equal(user.id, USER_ID);
    assert.equal(user.phone, body.phone);
    assert.equal(user.photo_url, body.photo_url);
    assert.equal(user.notes, body.notes);
    assert.equal(user.email, 'user.update@userupdatecases.test');
    assert.equal(user.full_name, 'User Update Cases');
    assert.equal(user.national_id, 'USER-UPD-001');
  });

  it('returns 200 on partial update (phone only)', async () => {
    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send({ phone: '+905559999999' });

    assert.equal(res.status, 200);

    const { user } = res.body.data;
    assert.equal(user.phone, '+905559999999');
    assert.equal(user.photo_url, null);
    assert.equal(user.notes, null);
  });

  it('returns 404 USER_NOT_FOUND when user does not exist', async () => {
    const res = await request(app)
      .put(`${endpoint}/00000000-0000-0000-0000-000000000000`)
      .send(validBody());

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'USER_NOT_FOUND');
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length > 0);
  });

  it('returns 422 for invalid phone format', async () => {
    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send(validBody({ phone: '05551234567' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'phone');
    assert.ok(field, 'errors should contain a phone entry');
  });

  it('returns 422 when photo_url is not a valid URL', async () => {
    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send(validBody({ photo_url: 'not-a-url' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'photo_url');
    assert.ok(field, 'errors should contain a photo_url entry');
  });

  it('returns 422 when photo_url exceeds 500 chars', async () => {
    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send(validBody({ photo_url: `https://example.com/${'a'.repeat(500)}` }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'photo_url');
    assert.ok(field, 'errors should contain a photo_url entry');
  });

  it('returns 200 and strips unknown keys', async () => {
    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send({
        phone: '+905558888888',
        email: 'evil@hack.test',
        national_id: 'HACK',
        full_name: 'Evil',
      });

    assert.equal(res.status, 200);

    const { user } = res.body.data;
    assert.equal(user.phone, '+905558888888');
    assert.equal(user.email, 'user.update@userupdatecases.test');
    assert.equal(user.national_id, 'USER-UPD-001');
    assert.equal(user.full_name, 'User Update Cases');
  });

  it('returns 500 when database throws unexpectedly during update', async () => {
    const stub = sinon.stub(db, 'query');
    stub.onFirstCall().resolves({ rows: [{ is_active: true }] });
    stub.onSecondCall().rejects(new Error('DB connection lost'));

    const res = await request(app)
      .put(`${endpoint}/${USER_ID}`)
      .send(validBody({ phone: '+905557000000' }));

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});
