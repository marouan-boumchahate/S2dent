import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/departments';

const SEED_EMAIL = 'seed.department@seed.internal';
const SEED_WALLET = '0xdddddddddddddddddddddddddddddddddddddddd';
const SEED_ACADEMY_NUMBER = 'ACD_DEPT_0001';

let ACADEMY_ID;
let ACADEMY_TOKEN;

const issueAccessToken = (payload = {}) => signTokens(
  { sub: SEED_WALLET.toLowerCase(), role: 'academy', rid: ACADEMY_ID, ...payload },
  undefined,
  true,
).accessToken;

const seedAcademy = async () => {
  const identifiers = [SEED_EMAIL, SEED_ACADEMY_NUMBER];

  await db.query(
    `DELETE FROM students
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM professors
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1
        OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM academies
     WHERE email = $1
        OR academy_number = $2`,
    identifiers,
  );

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
        email,
        academy_number,
        name,
        short_name,
        type,
        legal_name,
        registration_number,
        tax_id
     )
     VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8
     )
     RETURNING id`,
    [
      SEED_EMAIL,
      SEED_ACADEMY_NUMBER,
      'Seed Department Academy',
      'SDA',
      'university',
      'Seed Department Academy A.S.',
      'REG-DEPT-001',
      'TAX-DEPT-001',
    ],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
     VALUES ($1, $2, $3, 'academy', TRUE)
     ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, academy_id = EXCLUDED.academy_id`,
    [academy.id, SEED_WALLET, '0x0488d7b532' + 'a'.repeat(120)],
  );

  return academy.id;
};

const cleanupDepartments = async () => {
  await db.query(
    `DELETE FROM departments
     WHERE name LIKE 'Dept Test %'`,
  );
};

const teardownSeed = async () => {
  const identifiers = [SEED_EMAIL, SEED_ACADEMY_NUMBER];

  await db.query(
    `DELETE FROM identities
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM students
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM professors
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1
        OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM academies
     WHERE email = $1
        OR academy_number = $2`,
    identifiers,
  );
};

const validBody = (overrides = {}) => ({
  academy_id: ACADEMY_ID,
  code: 'CENG',
  name: 'Dept Test Computer Engineering',
  faculty: 'Engineering',
  total_years: 4,
  description: 'Test department',
  is_active: true,
  ...overrides,
});

before(async () => {
  ACADEMY_ID = await seedAcademy();
  ACADEMY_TOKEN = issueAccessToken();
});

beforeEach(async () => {
  await cleanupDepartments();
});

afterEach(async () => {
  sinon.restore();
});

after(async () => {
  await cleanupDepartments();
  await teardownSeed();
});


describe('POST /api/departments', () => {
  it('returns 201 and the department DTO on valid input', async () => {
    const body = validBody();

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Department created successfully');

    const { department } = res.body.data;
    assert.ok(department.id);
    assert.equal(department.academy_id, body.academy_id);
    assert.equal(department.code, body.code);
    assert.equal(department.name, body.name);
    assert.equal(department.faculty, body.faculty);
    assert.equal(department.total_years, body.total_years);
    assert.equal(department.description, body.description);
    assert.equal(department.is_active, body.is_active);
  });

  it('returns 404 ACADEMY_NOT_FOUND when academy_id does not exist', async () => {
    const missingToken = issueAccessToken({ rid: '00000000-0000-0000-0000-000000000000' });
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${missingToken}`)
      .send(validBody());

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
  });

  it('returns 409 DEPARTMENT_CODE_DUPLICATE when code already exists for academy', async () => {
    await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ code: 'DUP', name: 'Dept Test One' }));

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ code: 'DUP', name: 'Dept Test Two' }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'DEPARTMENT_CODE_DUPLICATE');
  });

  it('returns 409 DEPARTMENT_NAME_DUPLICATE when name already exists for academy', async () => {
    await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ code: 'DUP1', name: 'Dept Test Same Name' }));

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ code: 'DUP2', name: 'Dept Test Same Name' }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'DEPARTMENT_NAME_DUPLICATE');
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
});

