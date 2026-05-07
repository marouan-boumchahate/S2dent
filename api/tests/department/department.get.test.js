import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/departments';

const SEED_EMAIL = 'seed.get.dept.unique@seed.internal';
const SEED_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadept2222';
const SEED_ACADEMY_NUMBER = 'ACD_GET_DEPT_0001';

let ACADEMY_ID;
let DEPARTMENT_ID;

const seedAcademy = async () => {
  const identifiers = [SEED_EMAIL, SEED_WALLET.toLowerCase(), SEED_ACADEMY_NUMBER];

  await db.query(
    `DELETE FROM students
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR wallet_address = $2 OR academy_number = $3
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM professors
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR wallet_address = $2 OR academy_number = $3
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1
          OR wallet_address = $2
          OR academy_number = $3
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM academies
     WHERE email = $1
        OR wallet_address = $2
        OR academy_number = $3`,
    identifiers,
  );

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
        wallet_address,
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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
     )
     RETURNING id`,
    [
      SEED_WALLET,
      SEED_EMAIL,
      SEED_ACADEMY_NUMBER,
      'Get Dept Academy',
      'GDA',
      'university',
      'Get Dept Academy A.S.',
      'REG-GET-001',
      'TAX-GET-001',
    ],
  );

  return academy.id;
};

const cleanupDepartments = async (academyId) => {
  await db.query(
    'DELETE FROM departments WHERE academy_id = $1',
    [academyId],
  );
};

const teardownSeed = async () => {
  const identifiers = [SEED_EMAIL, SEED_WALLET.toLowerCase(), SEED_ACADEMY_NUMBER];

  await db.query(
    `DELETE FROM students
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR wallet_address = $2 OR academy_number = $3
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM professors
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR wallet_address = $2 OR academy_number = $3
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1
          OR wallet_address = $2
          OR academy_number = $3
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM academies
     WHERE email = $1
        OR wallet_address = $2
        OR academy_number = $3`,
    identifiers,
  );
};

before(async () => {
  ACADEMY_ID = await seedAcademy();
});

beforeEach(async () => {
  await cleanupDepartments(ACADEMY_ID);
  
  const { rows: [dept] } = await db.query(
    `INSERT INTO departments (academy_id, code, name, faculty, total_years)
     VALUES ($1, 'TEST', 'Test Department', 'Test Faculty', 4)
     RETURNING id`,
    [ACADEMY_ID],
  );
  DEPARTMENT_ID = dept.id;
});

afterEach(async () => {
  sinon.restore();
});

after(async () => {
  await cleanupDepartments(ACADEMY_ID);
  await teardownSeed();
});

describe('GET /api/departments/:id', () => {
  it('returns 200 and the department DTO for a valid id', async () => {
    const res = await request(app)
      .get(`${endpoint}/${DEPARTMENT_ID}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Department retrieved successfully');
    assert.equal(res.body.data.department.id, DEPARTMENT_ID);
    assert.equal(res.body.data.department.name, 'Test Department');
  });

  it('returns 404 DEPARTMENT_NOT_FOUND when department does not exist', async () => {
    const res = await request(app)
      .get(`${endpoint}/00000000-0000-0000-0000-000000000000`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'DEPARTMENT_NOT_FOUND');
  });
});
