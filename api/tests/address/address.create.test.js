import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/addresses';

const cleanupAddresses = async () => {
  await db.query('DELETE FROM addresses');
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

beforeEach(async () => {
  await cleanupAddresses();
});

afterEach(async () => {
  sinon.restore();
});

describe('POST /api/addresses', () => {
  it('returns 201 and the address DTO on valid input', async () => {
    const body = validBody();

    const res = await request(app)
      .post(endpoint)
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
      .send(validBody({ latitude: 100 }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'latitude');
    assert.ok(field, 'errors should contain a latitude entry');
  });

  it('returns 422 when longitude is out of range', async () => {
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ longitude: -200 }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'longitude');
    assert.ok(field, 'errors should contain a longitude entry');
  });

  it('returns 422 for an invalid postal_code length', async () => {
    const tooLongPostalCode = 'A'.repeat(21);

    const res = await request(app)
      .post(endpoint)
      .send(validBody({ postal_code: tooLongPostalCode }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'postal_code');
    assert.ok(field, 'errors should contain a postal_code entry');
  });

  it('returns 500 when the database throws unexpectedly', async () => {
    sinon.stub(db, 'query').rejects(new Error('DB connection lost'));

    const res = await request(app)
      .post(endpoint)
      .send(validBody());

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});

