import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/departments';

const SEED_EMAIL = 'seed.department@seed.internal';
const SEED_WALLET = '0xdddddddddddddddddddddddddddddddddddddddd';
const SEED_ACADEMY_NUMBER = 'ACD_DEPT_0001';

let ACADEMY_ID;

const seedAcademy = async () => {
  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT academies.id
       FROM academies
       JOIN users ON academies.user_id = users.id
       WHERE users.email = $1
     )`,
    [SEED_EMAIL],
  );

  await db.query(
    `DELETE FROM academies
     USING users
     WHERE academies.user_id = users.id
       AND users.email = $1`,
    [SEED_EMAIL],
  );

  await db.query(`DELETE FROM users WHERE email = $1`, [SEED_EMAIL]);

  const { rows: [user] } = await db.query(
    `INSERT INTO users (email, wallet_address, role)
     VALUES ($1, $2, 'academy_admin')
     RETURNING id`,
    [SEED_EMAIL, SEED_WALLET],
  );

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (user_id, academy_number, name, short_name, type, country, city)
     VALUES ($1, $2, 'Seed Department Academy', 'SDA', 'university', 'Turkey', 'Istanbul')
     RETURNING id`,
    [user.id, SEED_ACADEMY_NUMBER],
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
  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT academies.id
       FROM academies
       JOIN users ON academies.user_id = users.id
       WHERE users.email = $1
     )`,
    [SEED_EMAIL],
  );

  await db.query(
    `DELETE FROM academies
     USING users
     WHERE academies.user_id = users.id
       AND users.email = $1`,
    [SEED_EMAIL],
  );

  await db.query(`DELETE FROM users WHERE email = $1`, [SEED_EMAIL]);
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
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ academy_id: '00000000-0000-0000-0000-000000000000' }));

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
  });

  it('returns 409 DEPARTMENT_CODE_DUPLICATE when code already exists for academy', async () => {
    await request(app)
      .post(endpoint)
      .send(validBody({ code: 'DUP', name: 'Dept Test One' }));

    const res = await request(app)
      .post(endpoint)
      .send(validBody({ code: 'DUP', name: 'Dept Test Two' }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'DEPARTMENT_CODE_DUPLICATE');
  });

  it('returns 409 DEPARTMENT_NAME_DUPLICATE when name already exists for academy', async () => {
    await request(app)
      .post(endpoint)
      .send(validBody({ code: 'DUP1', name: 'Dept Test Same Name' }));

    const res = await request(app)
      .post(endpoint)
      .send(validBody({ code: 'DUP2', name: 'Dept Test Same Name' }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'DEPARTMENT_NAME_DUPLICATE');
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
});

