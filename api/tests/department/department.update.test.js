import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/departments';

const SEED_EMAIL = 'seed.update.dept.unique@seed.internal';
const SEED_WALLET = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbadept3333';
const SEED_ACADEMY_NUMBER = 'ACD_UPDATE_DEPT_0001';

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
      'Update Dept Academy',
      'UDA',
      'university',
      'Update Dept Academy A.S.',
      'REG-UPDATE-001',
      'TAX-UPDATE-001',
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
    `INSERT INTO departments (academy_id, code, name, faculty, total_years, description)
     VALUES ($1, 'UPDT', 'Update Test', 'Test Faculty', 4, 'Old description')
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

describe('PUT /api/departments/:id', () => {
  it('returns 200 and the updated department DTO on valid input', async () => {
    const payload = {
      description: 'New description',
    };

    const res = await request(app)
      .put(`${endpoint}/${DEPARTMENT_ID}`)
      .send(payload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Department updated successfully');
    assert.equal(res.body.data.department.id, DEPARTMENT_ID);
    assert.equal(res.body.data.department.description, 'New description');
  });

  it('returns 404 DEPARTMENT_NOT_FOUND when department does not exist', async () => {
    const res = await request(app)
      .put(`${endpoint}/00000000-0000-0000-0000-000000000000`)
      .send({ description: 'New description' });

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'DEPARTMENT_NOT_FOUND');
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .put(`${endpoint}/${DEPARTMENT_ID}`)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });
});
