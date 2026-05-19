import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/departments';

const SEED_EMAIL = 'seed.delete.dept.unique@seed.internal';
const SEED_WALLET = '0xcccccccccccccccccccccccccccccadept4444';
const SEED_ACADEMY_NUMBER = 'ACD_DELETE_DEPT_0001';

let ACADEMY_ID;
let DEPARTMENT_ID;
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
      'Delete Dept Academy',
      'DDA',
      'university',
      'Delete Dept Academy A.S.',
      'REG-DELETE-001',
      'TAX-DELETE-001',
    ],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
     VALUES ($1, $2, $3, 'academy', TRUE)
     ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, academy_id = EXCLUDED.academy_id`,
    [academy.id, SEED_WALLET, '0x04022ecd91' + 'a'.repeat(120)],
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

describe('DELETE /api/departments/:id', () => {
  before(async () => {
    ACADEMY_ID = await seedAcademy();
    ACADEMY_TOKEN = issueAccessToken();
  });

  beforeEach(async () => {
    await cleanupDepartments(ACADEMY_ID);

    const { rows: [dept] } = await db.query(
      `INSERT INTO departments (academy_id, code, name, faculty, total_years, is_active)
       VALUES ($1, 'DELT', 'Delete Test', 'Test Faculty', 4, TRUE)
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
  it('returns 200 and deactivates the department', async () => {
    const res = await request(app)
      .delete(`${endpoint}/${DEPARTMENT_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Department deactivated successfully');
    // assert.equal(res.body.data.department.id, DEPARTMENT_ID);
    // assert.equal(res.body.data.department.is_active, false);

    // Verify in DB
    const { rows: [dept] } = await db.query(
      'SELECT is_active FROM departments WHERE id = $1',
      [DEPARTMENT_ID],
    );
    assert.equal(dept.is_active, false);
  });

  it('returns 404 DEPARTMENT_NOT_FOUND when department does not exist', async () => {
    const res = await request(app)
      .delete(`${endpoint}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'DEPARTMENT_NOT_FOUND');
  });
});
