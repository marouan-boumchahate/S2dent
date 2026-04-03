import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/users';

const cleanupUsers = async () => {
  await db.query(
    `DELETE FROM students
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE '%@usercases.edu'
     )`,
  );
  await db.query(
    `DELETE FROM addresses
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE '%@usercases.edu'
     )`,
  );
  await db.query(
    `DELETE FROM users
     WHERE email LIKE '%@usercases.edu'`,
  );
};

const validBody = (overrides = {}) => ({
  first_name: 'User',
  middle_name: 'Cases',
  last_name: 'Test',
  date_of_birth: '2000-01-15',
  gender: 'male',
  national_id: 'USER-TEST-001',
  email: 'user.001@usercases.edu',
  phone: '+905551234567',
  photo_url: 'https://example.com/photo.png',
  notes: 'Seed user',
  ...overrides,
});

beforeEach(async () => {
  await cleanupUsers();
});

afterEach(async () => {
  sinon.restore();
});

describe('POST /api/users', () => {
  it('returns 201 and the user DTO on valid input', async () => {
    const body = validBody();

    const res = await request(app)
      .post(endpoint)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'User registered successfully');

    const { user } = res.body.data;
    assert.ok(user.id);
    assert.equal(user.email, body.email.toLowerCase());
    assert.equal(user.national_id, body.national_id);
    assert.equal(user.phone, body.phone);
    assert.equal(user.full_name, `${body.first_name} ${body.middle_name} ${body.last_name}`);
  });

  it('stores nullable optional fields as null when not provided', async () => {
    const body = validBody({
      middle_name: undefined,
      phone: undefined,
      photo_url: undefined,
      notes: undefined,
    });

    const res = await request(app)
      .post(endpoint)
      .send(body);

    assert.equal(res.status, 201);

    const { user } = res.body.data;
    assert.equal(user.full_name, `${body.first_name} ${body.last_name}`);
    assert.equal(user.phone, null);
  });

  it('returns 409 EMAIL_DUPLICATE when email already exists', async () => {
    await request(app)
      .post(endpoint)
      .send(validBody());

    const res = await request(app)
      .post(endpoint)
      .send(validBody({ national_id: 'USER-TEST-002' }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'EMAIL_DUPLICATE');
  });

  it('returns 409 USER_NATIONAL_ID_DUPLICATE when national_id already exists', async () => {
    await request(app)
      .post(endpoint)
      .send(validBody());

    const res = await request(app)
      .post(endpoint)
      .send(validBody({ email: 'user.002@usercases.edu' }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'USER_NATIONAL_ID_DUPLICATE');
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length > 0);
  });

  it('returns 422 for an invalid phone format', async () => {
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ phone: '05551234567' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'phone');
    assert.ok(field, 'errors should contain a phone entry');
  });
});

