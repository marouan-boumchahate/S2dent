import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/departments';

const SEED_EMAIL = 'seed.list.dept.unique@seed.internal';
const SEED_WALLET = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeedept1111';
const SEED_ACADEMY_NUMBER = 'ACD_LIST_DEPT_0001';

let ACADEMY_ID;
let ACADEMY_TOKEN;

const issueAccessToken = (payload = {}) => signTokens(
  { sub: SEED_WALLET.toLowerCase(), role: 'academy', rid: ACADEMY_ID, ...payload },
  undefined,
  true,
).accessToken;

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
      'List Dept Academy',
      'LDA',
      'university',
      'List Dept Academy A.S.',
      'REG-LIST-001',
      'TAX-LIST-001',
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
  ACADEMY_TOKEN = issueAccessToken();
});

beforeEach(async () => {
  await cleanupDepartments(ACADEMY_ID);
});

afterEach(async () => {
  sinon.restore();
});

after(async () => {
  await cleanupDepartments(ACADEMY_ID);
  await teardownSeed();
});

describe('GET /api/departments', () => {
  it('returns 200 and a list of departments for a valid academy_id', async () => {
    // Seed some departments
    await db.query(
      `INSERT INTO departments (academy_id, code, name, faculty, total_years)
       VALUES ($1, 'CS', 'Computer Science', 'Engineering', 4),
              ($1, 'EE', 'Electrical Engineering', 'Engineering', 4)`,
      [ACADEMY_ID],
    );

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Departments retrieved successfully');
    assert.ok(Array.isArray(res.body.data.departments));
    assert.equal(res.body.data.departments.length, 2);
    assert.equal(res.body.data.departments[0].name, 'Computer Science');
    assert.equal(res.body.data.departments[1].name, 'Electrical Engineering');
  });

  it('returns 401 when token is missing', async () => {
    const res = await request(app)
      .get(endpoint);

    assert.equal(res.status, 401);
  });

  it('returns 404 ACADEMY_NOT_FOUND when academy_id does not exist', async () => {
    const missingToken = issueAccessToken({ rid: '00000000-0000-0000-0000-000000000000' });
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${missingToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
  });
});
