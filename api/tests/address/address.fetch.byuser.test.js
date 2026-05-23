import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import crypto from 'crypto';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/addresses';

const ACADEMY_EMAIL = 'seed.fetch.academy@addressfetch.test';
const PROFESSOR_EMAIL = 'seed.fetch.professor@addressfetch.test';
const STUDENT_EMAIL = 'seed.fetch.student@addressfetch.test';
const NO_ADDRESS_EMAIL = 'seed.address.fetch.none@addressfetch.test';

const ACADEMY_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PROFESSOR_WALLET = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const STUDENT_WALLET = '0xcccccccccccccccccccccccccccccccccccccccc';

const buildAcademyNumber = (suffix) => `ACD_ADDR_${suffix}`;
const uniqueSuffix = () => crypto.randomBytes(4).toString('hex');

let userColumnCache = null;

const getUserColumns = async () => {
  if (userColumnCache) return userColumnCache;

  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`,
  );

  userColumnCache = new Set(rows.map((row) => row.column_name));
  return userColumnCache;
};

const issueAccessToken = (payload = {}) => signTokens(
  { sub: payload.sub || ACADEMY_WALLET, role: payload.role || 'academy', ...payload },
  undefined,
  true,
).accessToken;

const seedAcademy = async () => {
  const suffix = uniqueSuffix();
  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
        academy_number, name, short_name, type,
        email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     RETURNING id`,
    [
      buildAcademyNumber(suffix),
      `Address Fetch Academy ${suffix}`,
      `AFA${suffix.slice(0, 3)}`.toUpperCase(),
      ACADEMY_EMAIL,
      `Address Fetch Academy Legal ${suffix}`,
      `REG-${suffix}`,
      `TAX-${suffix}`,
    ],
  );

  return academy.id;
};

const seedUser = async (email, seedPrefix) => {
  const suffix = uniqueSuffix();
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
    seedPrefix,
    'Address',
    'Fetch',
    `${seedPrefix} Address Fetch ${suffix}`,
    '1990-01-01',
    'female',
    `${seedPrefix.toUpperCase()}-${suffix}`,
    email,
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

  const { rows: [user] } = await db.query(
    `INSERT INTO users (${insertCols.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertVals,
  );

  return user.id;
};

const createAddress = async ({ academyId = null, userId = null, overrides = {} } = {}) => {
  const payload = {
    academy_id: academyId,
    user_id: userId,
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
  };

  const { rows: [address] } = await db.query(
    `INSERT INTO addresses (
        user_id,
        academy_id,
        address_line1,
        address_line2,
        street,
        district,
        state,
        postal_code,
        city,
        country,
        latitude,
        longitude
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      payload.user_id,
      payload.academy_id,
      payload.address_line1,
      payload.address_line2,
      payload.street,
      payload.district,
      payload.state,
      payload.postal_code,
      payload.city,
      payload.country,
      payload.latitude,
      payload.longitude,
    ],
  );

  return address;
};

const cleanup = async () => {
  await db.query(
    `DELETE FROM addresses
     WHERE academy_id IN (SELECT id FROM academies WHERE email = $1)
        OR user_id IN (SELECT id FROM users WHERE email = ANY($2))`,
    [ACADEMY_EMAIL, [PROFESSOR_EMAIL, STUDENT_EMAIL, NO_ADDRESS_EMAIL]],
  );

  await db.query(
    `DELETE FROM users WHERE email = ANY($1)`,
    [[PROFESSOR_EMAIL, STUDENT_EMAIL, NO_ADDRESS_EMAIL]],
  );

  await db.query(
    `DELETE FROM academies WHERE email = $1`,
    [ACADEMY_EMAIL],
  );
};

let ACADEMY_ID;
let PROFESSOR_USER_ID;
let STUDENT_USER_ID;
let NO_ADDRESS_USER_ID;

let ACADEMY_TOKEN;
let PROFESSOR_TOKEN;
let STUDENT_TOKEN;
let NO_ADDRESS_TOKEN;

before(async () => {
  await cleanup();
  ACADEMY_ID = await seedAcademy();
  PROFESSOR_USER_ID = await seedUser(PROFESSOR_EMAIL, 'Professor');
  STUDENT_USER_ID = await seedUser(STUDENT_EMAIL, 'Student');
  NO_ADDRESS_USER_ID = await seedUser(NO_ADDRESS_EMAIL, 'Missing');

  ACADEMY_TOKEN = issueAccessToken({ role: 'academy', pid: ACADEMY_ID, sub: ACADEMY_WALLET });
  PROFESSOR_TOKEN = issueAccessToken({ role: 'professor', uid: PROFESSOR_USER_ID, sub: PROFESSOR_WALLET });
  STUDENT_TOKEN = issueAccessToken({ role: 'student', uid: STUDENT_USER_ID, sub: STUDENT_WALLET });
  NO_ADDRESS_TOKEN = issueAccessToken({ role: 'student', uid: NO_ADDRESS_USER_ID, sub: STUDENT_WALLET });
});

after(async () => {
  await cleanup();
});

describe('GET /api/addresses', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM addresses');
  });

  afterEach(async () => {
    sinon.restore();
  });

  it('success.academy returns the academy address', async () => {
    const seeded = await createAddress({ academyId: ACADEMY_ID });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Address fetched successfully');
    assert.equal(res.body.data.address.id, seeded.id);
    assert.equal(res.body.data.address.city, seeded.city);
    assert.equal(res.body.data.address.country, seeded.country);
  });

  it('success.professor returns the professor address', async () => {
    const seeded = await createAddress({ userId: PROFESSOR_USER_ID });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${PROFESSOR_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.address.id, seeded.id);
    assert.equal(res.body.data.address.address_line1, seeded.address_line1);
  });

  it('success.student returns the student address', async () => {
    const seeded = await createAddress({ userId: STUDENT_USER_ID });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.address.id, seeded.id);
    assert.equal(res.body.data.address.postal_code, seeded.postal_code);
  });

  it('failure.notFound returns 404 when user has no address', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${NO_ADDRESS_TOKEN}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
  });

  it('failure.unauthorized returns 401 without a token', async () => {
    const res = await request(app)
      .get(endpoint);

    assert.equal(res.status, 401);
  });
});

