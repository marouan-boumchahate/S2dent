import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/addresses';

const cleanupAddresses = async () => {
  await db.query('DELETE FROM addresses');
  await db.query(`DELETE FROM users WHERE email LIKE '%@addresscases.test'`);
};

const validBody = (overrides = {}) => ({
  city: 'Istanbul',
  country: 'Turkey',
  address_line1: 'Kadikoy',
  address_line2: 'Apt 5',
  street: 'Ataturk Caddesi',
  district: 'Kadikoy',
  state: 'Istanbul',
  postal_code: '34000',
  latitude: 41.0082,
  longitude: 28.9784,
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
  ];
  const insertVals = [
    'Address',
    'Cases',
    'Test',
    'Address Cases Test',
    '2000-01-15',
    'male',
    'ADDR-TEST-001',
    'address.001@addresscases.test',
    '+905551234567',
    null,
  ];

  if (columns.has('nationality')) {
    insertCols.push('nationality');
    insertVals.push('Turkish');
  }

  if (columns.has('notes')) {
    insertCols.push('notes');
    insertVals.push(null);
  }

  const placeholders = insertVals.map((_, idx) => `$${idx + 1}`).join(', ');

  const { rows: [u] } = await db.query(
    `INSERT INTO users (${insertCols.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertVals,
  );
  return u.id;
};

let USER_ID;
let ACADEMY_TOKEN;

const issueAccessToken = (payload = {}) => signTokens(
  { sub: '0x0000000000000000000000000000000000000001', role: 'academy', ...payload },
  undefined,
  true,
).accessToken;

before(async () => {
  await cleanupAddresses();
  USER_ID = await seedTUser();
  ACADEMY_TOKEN = issueAccessToken({ rid: USER_ID });
});

beforeEach(async () => {
  await cleanupAddresses();
  USER_ID = await seedTUser();
  ACADEMY_TOKEN = issueAccessToken({ rid: USER_ID });
});

afterEach(async () => {
  sinon.restore();
});

describe('POST /api/addresses', () => {
  it('returns 201 and the address DTO on valid input', async () => {
    const body = validBody({ user_id: USER_ID });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Address created successfully');

    const { address } = res.body.data;

    assert.ok(address.id);
    assert.equal(address.city, body.city);
    assert.equal(address.country, body.country);
    assert.equal(address.address_line1, body.address_line1);
    assert.equal(address.address_line2, body.address_line2);
    assert.equal(address.street, body.street);
    assert.equal(address.district, body.district);
    assert.equal(address.state, body.state);
    assert.equal(address.postal_code, body.postal_code);
    assert.equal(parseFloat(address.latitude), body.latitude);
    assert.equal(parseFloat(address.longitude), body.longitude);
  });

  it('stores nullable optional fields as null when not provided', async () => {
    const body = validBody({
      user_id: USER_ID,
      address_line1: undefined,
      address_line2: undefined,
      street: undefined,
      district: undefined,
      state: undefined,
      postal_code: undefined,
      latitude: undefined,
      longitude: undefined,
    });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 201);

    const { address } = res.body.data;

    assert.equal(address.address_line1, null);
    assert.equal(address.address_line2, null);
    assert.equal(address.street, null);
    assert.equal(address.district, null);
    assert.equal(address.state, null);
    assert.equal(address.postal_code, null);
    assert.equal(address.latitude, null);
    assert.equal(address.longitude, null);
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length > 0);
  });

  it('returns 422 when each required field is missing', async () => {
    const requiredFields = ['city', 'country'];

    for (const field of requiredFields) {
      const body = validBody();
      delete body[field];

      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
        .send(body);

      assert.equal(
        res.status,
        422,
        `Expected 422 when "${field}" is missing`,
      );

      const found = res.body.errors.find((e) => e.field === field);
      assert.ok(found, `Expected a validation error for field: ${field}`);
    }
  });

  it('returns 422 when latitude is out of range', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ latitude: 100 }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'latitude');
    assert.ok(field, 'errors should contain a latitude entry');
  });

  it('returns 422 when longitude is out of range', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ longitude: -200 }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'longitude');
    assert.ok(field, 'errors should contain a longitude entry');
  });

  it('returns 422 for an invalid postal_code length', async () => {
    const tooLongPostalCode = 'A'.repeat(21);

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ postal_code: tooLongPostalCode }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'postal_code');
    assert.ok(field, 'errors should contain a postal_code entry');
  });

  it('returns 500 when the database throws unexpectedly', async () => {
    sinon.stub(db, 'query').rejects(new Error('DB connection lost'));

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ user_id: USER_ID }));

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});

