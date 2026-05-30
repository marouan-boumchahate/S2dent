import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import crypto from 'crypto';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/addresses';

const ACADEMY_EMAIL = 'seed.fetchById.academy@addressfetch.test';
const PROFESSOR_EMAIL = 'seed.fetchById.professor@addressfetch.test';
const STUDENT_EMAIL = 'seed.fetchById.student@addressfetch.test';

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
  {
    sub: payload.sub || ACADEMY_WALLET,
    role: payload.role || 'admin',
    uid: payload.uid || payload.rid || ACADEMY_ID,
    rid: payload.rid || payload.uid || ACADEMY_ID,
    ...payload,
  },
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
    [ACADEMY_EMAIL, [PROFESSOR_EMAIL, STUDENT_EMAIL]],
  );

  await db.query(
    `DELETE FROM users WHERE email = ANY($1)`,
    [[PROFESSOR_EMAIL, STUDENT_EMAIL]],
  );

  await db.query(
    `DELETE FROM academies WHERE email = $1`,
    [ACADEMY_EMAIL],
  );
};

let ACADEMY_ID;
let PROFESSOR_USER_ID;
let STUDENT_USER_ID;

let ACADEMY_TOKEN;
let PROFESSOR_TOKEN;
let STUDENT_TOKEN;

before(async () => {
  await cleanup();
  ACADEMY_ID = await seedAcademy();
  PROFESSOR_USER_ID = await seedUser(PROFESSOR_EMAIL, 'Professor');
  STUDENT_USER_ID = await seedUser(STUDENT_EMAIL, 'Student');

  ACADEMY_TOKEN = issueAccessToken({ role: 'admin', uid: ACADEMY_ID, rid: ACADEMY_ID, sub: ACADEMY_WALLET });
  PROFESSOR_TOKEN = issueAccessToken({ role: 'professor', uid: PROFESSOR_USER_ID, rid: PROFESSOR_USER_ID, sub: PROFESSOR_WALLET });
  STUDENT_TOKEN = issueAccessToken({ role: 'student', uid: STUDENT_USER_ID, rid: STUDENT_USER_ID, sub: STUDENT_WALLET });
});

after(async () => {
  await cleanup();
});

describe('GET /api/addresses/:id', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM addresses');
  });

  afterEach(async () => {
    sinon.restore();
  });

  it('success.admin returns the address by id for admin token', async () => {
    const seeded = await createAddress({ userId: STUDENT_USER_ID });

    const res = await request(app)
      .get(`${endpoint}/${seeded.id}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.address.id, seeded.id);
    assert.equal(res.body.data.address.address_line2, seeded.address_line2);
  });

  it('failure.forbidden returns 403 for professor or student tokens', async () => {
    const seeded = await createAddress({ userId: STUDENT_USER_ID });

    const professorRes = await request(app)
      .get(`${endpoint}/${seeded.id}`)
      .set('Authorization', `Bearer ${PROFESSOR_TOKEN}`);

    assert.equal(professorRes.status, 403);
    assert.equal(professorRes.body.code, 'FORBIDDEN');

    const studentRes = await request(app)
      .get(`${endpoint}/${seeded.id}`)
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    assert.equal(studentRes.status, 403);
    assert.equal(studentRes.body.code, 'FORBIDDEN');
  });

  it('failure.notFound returns 404 for a missing address id', async () => {
    const res = await request(app)
      .get(`${endpoint}/00000000-0000-0000-0000-000000000001`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
  });

  it('failure.unauthorized returns 401 without a token', async () => {
    const seeded = await createAddress({ userId: STUDENT_USER_ID });

    const res = await request(app)
      .get(`${endpoint}/${seeded.id}`);

    assert.equal(res.status, 401);
  });
});
