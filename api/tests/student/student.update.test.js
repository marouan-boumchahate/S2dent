import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const SEED_EMAIL = 'seed.student.update@seed.internal';
const SEED_WALLET = '0xf1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1';
const SEED_ACADEMY_NUMBER = 'ACD_STU_UPD_0001';

let ACADEMY_ID;
let DEPARTMENT_ID;
let USER_ID;
let STUDENT_ID;
let ACADEMY_TOKEN;

const issueAccessToken = (payload = {}) => signTokens(
  { sub: SEED_WALLET.toLowerCase(), role: 'academy', ...payload },
  undefined,
  true,
).accessToken;

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

const seedAcademy = async () => {
  const identifiers = [SEED_EMAIL, SEED_ACADEMY_NUMBER];

  await db.query(
    `DELETE FROM students
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM professors
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [SEED_WALLET]);
  await db.query(
    `DELETE FROM academies WHERE email = $1 OR academy_number = $2`,
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
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      SEED_EMAIL,
      SEED_ACADEMY_NUMBER,
      'Seed Student Update Academy',
      'SSUA',
      'university',
      'Seed Student Update Academy A.S.',
      'REG-STU-UPD-001',
      'TAX-STU-UPD-001',
    ],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
     VALUES ($1, $2, $3, 'academy', TRUE)
     ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, academy_id = EXCLUDED.academy_id`,
    [academy.id, SEED_WALLET, '0x04stuupd' + 'a'.repeat(122)],
  );

  return academy.id;
};

const seedDepartment = async (academyId) => {
  const { rows: [department] } = await db.query(
    `INSERT INTO departments (academy_id, code, name, faculty, total_years)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [academyId, 'CENG', 'Computer Engineering', 'Engineering', 4],
  );

  return department.id;
};

const seedUser = async () => {
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
    'Student',
    'Update',
    'Test',
    'Student Update Test',
    '2004-01-15',
    'male',
    'STU-UPD-NID-001',
    'student.update.001@studentcases.test',
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

  const { rows: [u] } = await db.query(
    `INSERT INTO users (${insertCols.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertVals,
  );

  return u.id;
};

const seedStudent = async (userId, academyId, departmentId) => {
  const { rows: [student] } = await db.query(
    `INSERT INTO students (
      user_id,
      academy_id,
      department_id,
      student_number,
      enrollment_status,
      enrollment_date,
      expected_graduation_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      userId,
      academyId,
      departmentId,
      'STU_260507_0001',
      'active',
      '2023-09-15',
      '2027-06-30'
    ]
  );

  const stuPubKey = '0x04' + Date.now().toString(16).slice(-8).padStart(8, '0') + 'a'.repeat(120);
  const stuWallet = '0xst' + Date.now().toString(16).slice(-8).padStart(8, '0') + 'a'.repeat(30);
  await db.query(
    `INSERT INTO identities (user_id, wallet_address, public_key, role, is_active)
     VALUES ($1, $2, $3, 'student', TRUE)`,
    [userId, stuWallet, stuPubKey]
  );

  return student.id;
};

const cleanupStudents = async () => {
  await db.query(
    `DELETE FROM identities
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@studentcases.test'
     )`,
  );
  await db.query(
    `DELETE FROM students
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@studentcases.test'
     )`,
  );
  await db.query(`DELETE FROM users WHERE email LIKE '%@studentcases.test'`);
};

const teardownSeed = async () => {
  const identifiers = [SEED_EMAIL, SEED_ACADEMY_NUMBER];

  await db.query(
    `DELETE FROM students
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM professors
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1 OR academy_number = $2
     )`,
    identifiers,
  );

  await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [SEED_WALLET]);

  await db.query(
    `DELETE FROM academies WHERE email = $1 OR academy_number = $2`,
    identifiers,
  );
};

const endpoint = "/api/students"

describe('PUT /api/students/:id', () => {
  before(async () => {
    ACADEMY_ID = await seedAcademy();
    DEPARTMENT_ID = await seedDepartment(ACADEMY_ID);
    ACADEMY_TOKEN = issueAccessToken({ uid: ACADEMY_ID });
  });

  beforeEach(async () => {
    await cleanupStudents();
    USER_ID = await seedUser();
    STUDENT_ID = await seedStudent(USER_ID, ACADEMY_ID, DEPARTMENT_ID);
  });

  afterEach(async () => {
    sinon.restore();
  });

  after(async () => {
    await cleanupStudents();
    await teardownSeed();
  });
  it('returns 201 and the student DTO on valid cgpa update', async () => {
    const body = {
      cgpa: 3.75,
    };

    const res = await request(app)
      .put(`${endpoint}/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    // The controller oddly returns 'created' (201) for update
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Student updated successfully');

    const { student } = res.body.data;
    assert.equal(student.id, STUDENT_ID);
    assert.equal(student.cgpa, '3.75');
  });

  it('returns 422 when cgpa is out of range (too high)', async () => {
    const res = await request(app)
      .put(`${endpoint}/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ cgpa: 5.01 });

    assert.equal(res.status, 422);
    assert.ok(res.body.errors.some(e => e.field === 'cgpa'));
  });

  it('returns 422 when cgpa is out of range (too low)', async () => {
    const res = await request(app)
      .put(`${endpoint}/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ cgpa: -0.01 });

    assert.equal(res.status, 422);
    assert.ok(res.body.errors.some(e => e.field === 'cgpa'));
  });

  it('returns 403 STUDENT_NOT_FOUND when student does not exist', async () => {
    const res = await request(app)
      .put(`${endpoint}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ cgpa: 3.5 });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
  });

  it('returns 403 STUDENT_NOT_FOUND when student identity is inactive', async () => {
    await db.query(`UPDATE identities SET is_active = FALSE WHERE user_id = $1`, [USER_ID]);

    const res = await request(app)
      .put(`${endpoint}/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ cgpa: 3.5 });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
  });

  it('returns 500 when database throws unexpectedly', async () => {
    const stub = sinon.stub(db, 'query');
    // First call is ensureStudentExists check
    stub.onFirstCall().resolves({ rows: [{ is_active: true }] });
    // Second call is the update query
    stub.onSecondCall().rejects(new Error('DB connection lost'));

    const res = await request(app)
      .put(`${endpoint}/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ cgpa: 3.5 });

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});
