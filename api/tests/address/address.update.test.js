import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/addresses';

const cleanupAddresses = async () => {
  await db.query('DELETE FROM addresses');
  await db.query(`DELETE FROM users WHERE email LIKE '%@addressupdatecases.test'`);
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
    'notes',
  ];
  const insertVals = [
    'Address',
    'Update',
    'Cases',
    'Address Update Cases',
    '2000-01-15',
    'male',
    'ADDR-UPD-001',
    'address.update@addressupdatecases.test',
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
  return u.id;
};

let USER_ID;

const createAddress = async (overrides = {}) => {
  const res = await request(app)
    .post(endpoint)
    .send(validBody({ user_id: USER_ID, ...overrides }));

  assert.equal(res.status, 201);
  return res.body.data.address;
};

beforeEach(async () => {
  await cleanupAddresses();
  USER_ID = await seedTUser();
});

afterEach(async () => {
  sinon.restore();
});

describe('PUT /api/addresses/:id', () => {
  it('returns 200 and the updated address DTO on valid input', async () => {
    const existing = await createAddress();

    const updateBody = {
      city: 'Ankara',
      country: 'Turkey',
      address_line1: 'Cankaya',
      postal_code: '06000',
    };

    const res = await request(app)
      .put(`${endpoint}/${existing.id}`)
      .send(updateBody);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Address updated successfully');

    const { address } = res.body.data;

    assert.equal(address.id, existing.id);
    assert.equal(address.city, updateBody.city);
    assert.equal(address.country, updateBody.country);
    assert.equal(address.address_line1, updateBody.address_line1);
    assert.equal(address.postal_code, updateBody.postal_code);
    assert.equal(address.address_line2, existing.address_line2);
    assert.equal(address.street, existing.street);
    assert.equal(address.district, existing.district);
    assert.equal(address.state, existing.state);
  });

  it('returns 404 ADDRESS_NOT_FOUND when address does not exist', async () => {
    const res = await request(app)
      .put(`${endpoint}/00000000-0000-0000-0000-000000000000`)
      .send(validBody());

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
  });

  it('returns 422 when body is empty', async () => {
    const existing = await createAddress();

    const res = await request(app)
      .put(`${endpoint}/${existing.id}`)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length > 0);
  });

  it('returns 422 when each required field is missing', async () => {
    const existing = await createAddress();
    const requiredFields = ['city', 'country'];

    for (const field of requiredFields) {
      const body = validBody();
      delete body[field];

      const res = await request(app)
        .put(`${endpoint}/${existing.id}`)
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
    const existing = await createAddress();

    const res = await request(app)
      .put(`${endpoint}/${existing.id}`)
      .send(validBody({ latitude: 100 }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'latitude');
    assert.ok(field, 'errors should contain a latitude entry');
  });

  it('returns 422 when longitude is out of range', async () => {
    const existing = await createAddress();

    const res = await request(app)
      .put(`${endpoint}/${existing.id}`)
      .send(validBody({ longitude: -200 }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'longitude');
    assert.ok(field, 'errors should contain a longitude entry');
  });

  it('returns 422 for field length violations', async () => {
    const existing = await createAddress();

    const lengthViolations = [
      { field: 'address_line1', max: 255 },
      { field: 'address_line2', max: 255 },
      { field: 'street', max: 255 },
      { field: 'district', max: 100 },
      { field: 'state', max: 100 },
      { field: 'postal_code', max: 20 },
      { field: 'city', max: 100 },
      { field: 'country', max: 100 },
    ];

    for (const { field, max } of lengthViolations) {
      const body = validBody({ [field]: 'A'.repeat(max + 1) });

      const res = await request(app)
        .put(`${endpoint}/${existing.id}`)
        .send(body);

      assert.equal(
        res.status,
        422,
        `Expected 422 when "${field}" exceeds ${max} characters`,
      );

      const found = res.body.errors.find((e) => e.field === field);
      assert.ok(found, `Expected a validation error for field: ${field}`);
    }
  });

  it('returns 500 when the database throws unexpectedly during update', async () => {
    const existing = await createAddress();

    const stub = sinon.stub(db, 'query');
    stub.onFirstCall().resolves({ rows: [{ id: existing.id }] });
    stub.onSecondCall().rejects(new Error('DB connection lost'));

    const res = await request(app)
      .put(`${endpoint}/${existing.id}`)
      .send(validBody({ city: 'Izmir', country: 'Turkey' }));

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});
