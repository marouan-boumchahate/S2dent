import crypto from 'crypto';
import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const endpoint = '/api/academies/summary';
const TEST_EMAIL_LIKE = '%@academy-summary.test';

let userColumnCache = null;

const randomHex = (size) => crypto.randomBytes(size).toString('hex');
const buildWalletAddress = () => `0x${randomHex(20)}`;

const issueAccessToken = (payload = {}) => signTokens(
  {
    sub: payload.sub || buildWalletAddress(),
    role: payload.role || 'student',
    uid: payload.uid || payload.rid,
    rid: payload.rid || payload.uid,
    ...payload,
  },
  undefined,
  true,
).accessToken;

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

const cleanupDB = async () => {
  await db.query(
    `DELETE FROM students
     WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`,
    [TEST_EMAIL_LIKE],
  );

  await db.query(
    `DELETE FROM professors
     WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`,
    [TEST_EMAIL_LIKE],
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (SELECT id FROM academies WHERE email LIKE $1)`,
    [TEST_EMAIL_LIKE],
  );

  await db.query(
    `DELETE FROM identities
     WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)
        OR academy_id IN (SELECT id FROM academies WHERE email LIKE $1)`,
    [TEST_EMAIL_LIKE],
  );

  await db.query(
    `DELETE FROM users WHERE email LIKE $1`,
    [TEST_EMAIL_LIKE],
  );

  await db.query(
    `DELETE FROM academies WHERE email LIKE $1`,
    [TEST_EMAIL_LIKE],
  );
};

const seedAcademy = async () => {
  const suffix = randomHex(4);
  const { rows: [{ nextval }] } = await db.query(`SELECT nextval('academy_seq')`);

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       description, website, logo_url, email, phone,
       legal_name, registration_number, tax_id, billing_email
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, name, short_name, email, description, website, logo_url, phone`,
    [
      `ACD_SUM_${nextval}`,
      `Summary Academy ${suffix}`,
      `SAY${suffix.slice(0, 2)}`.toUpperCase(),
      'Academy summary endpoint test record',
      'https://summary-academy.test',
      'https://summary-academy.test/logo.png',
      `academy.${suffix}@academy-summary.test`,
      '+905551234567',
      `Summary Academy Legal ${suffix}`,
      `REG-SUM-${suffix}`,
      `TAX-SUM-${suffix}`,
      `billing.${suffix}@academy-summary.test`,
    ],
  );

  return academy;
};

const seedDepartment = async (academyId) => {
  const suffix = randomHex(3);

  const { rows: [department] } = await db.query(
    `INSERT INTO departments (academy_id, code, name, faculty, total_years)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [academyId, `CS${suffix}`.toUpperCase(), `Computer Science ${suffix}`, 'Engineering', 4],
  );

  return department;
};

const seedUser = async ({ email, fullName }) => {
  const columns = await getUserColumns();
  const nationalId = `NID-${randomHex(6)}`;

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
    fullName.split(' ')[0] || 'Summary',
    null,
    fullName.split(' ').slice(-1)[0] || 'User',
    fullName,
    '1994-06-17',
    'male',
    nationalId,
    email,
    '+905559999999',
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
     RETURNING id, email`,
    insertVals,
  );

  return user;
};

const seedProfessor = async ({ academyId, departmentId, email, fullName }) => {
  const user = await seedUser({ email, fullName });

  const { rows: [professor] } = await db.query(
    `INSERT INTO professors (
       user_id, academy_id, department_id,
       employee_number, title, rank, specialization,
       hire_date, employment_type, office_location, office_hours, bio
     )
     VALUES ($1, $2, $3, $4, $5, 'Prof', $6, $7, 'full_time', $8, $9, $10)
     RETURNING id, user_id, academy_id`,
    [
      user.id,
      academyId,
      departmentId,
      `EMP-SUM-${randomHex(4)}`,
      'Dr.',
      'Distributed Systems',
      '2022-09-01',
      'Block A',
      'Mon 09:00-11:00',
      'Summary professor profile',
    ],
  );

  return { user, professor };
};

const seedStudent = async ({ academyId, departmentId, email, fullName }) => {
  const user = await seedUser({ email, fullName });

  const { rows: [student] } = await db.query(
    `INSERT INTO students (
       user_id, academy_id, department_id,
       student_number, enrollment_status, enrollment_date, expected_graduation_date
     )
     VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '4 years')
     RETURNING id, user_id, academy_id`,
    [
      user.id,
      academyId,
      departmentId,
      `STU-SUM-${randomHex(4)}`,
    ],
  );

  return { user, student };
};

describe('GET /api/academies/summary', () => {
  let academy;
  let professor;
  let student;
  let professorToken;
  let studentToken;

  beforeEach(async () => {
    await cleanupDB();

    academy = await seedAcademy();
    const department = await seedDepartment(academy.id);

    professor = await seedProfessor({
      academyId: academy.id,
      departmentId: department.id,
      email: `prof.${randomHex(3)}@academy-summary.test`,
      fullName: 'Summary Professor',
    });

    student = await seedStudent({
      academyId: academy.id,
      departmentId: department.id,
      email: `student.${randomHex(3)}@academy-summary.test`,
      fullName: 'Summary Student',
    });

    professorToken = issueAccessToken({
      role: 'professor',
      uid: professor.user.id,
      rid: professor.professor.id,
      sub: buildWalletAddress(),
    });

    studentToken = issueAccessToken({
      role: 'student',
      uid: student.user.id,
      rid: student.student.id,
      sub: buildWalletAddress(),
    });
  });

  afterEach(async () => {
    await cleanupDB();
  });

  it('success.professor returns academy summary for professor token', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${professorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Academy summary retrieved successfully');

    const summary = res.body.data;
    assert.equal(summary.id, academy.id);
    assert.equal(summary.name, academy.name);
    assert.equal(summary.short_name, academy.short_name);
    assert.equal(summary.email, academy.email);
  });

  it('success.student returns academy summary for student token', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const summary = res.body.data;
    assert.equal(summary.id, academy.id);
    assert.equal(summary.name, academy.name);
    assert.equal(summary.short_name, academy.short_name);
    assert.equal(summary.email, academy.email);
  });

  it('failure.forbidden returns 403 for admin token', async () => {
    const adminToken = issueAccessToken({
      role: 'admin',
      uid: 'admin-user',
      rid: 'admin-role',
      sub: buildWalletAddress(),
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('failure.forbidden returns 403 for academy token', async () => {
    const academyToken = issueAccessToken({
      role: 'academy',
      uid: academy.id,
      rid: academy.id,
      sub: buildWalletAddress(),
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('failure.unauthorized returns 401 when token is missing', async () => {
    const res = await request(app).get(endpoint);

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Missing token');
  });

  it('failure.orphaned returns 404 for unlinked professor or student', async () => {
    const orphanProfessorUser = await seedUser({
      email: `orphan.prof.${randomHex(3)}@academy-summary.test`,
      fullName: 'Orphan Professor User',
    });

    const orphanStudentUser = await seedUser({
      email: `orphan.student.${randomHex(3)}@academy-summary.test`,
      fullName: 'Orphan Student User',
    });

    const orphanProfessorToken = issueAccessToken({
      role: 'professor',
      uid: orphanProfessorUser.id,
      rid: orphanProfessorUser.id,
      sub: buildWalletAddress(),
    });

    const orphanStudentToken = issueAccessToken({
      role: 'student',
      uid: orphanStudentUser.id,
      rid: orphanStudentUser.id,
      sub: buildWalletAddress(),
    });

    const professorRes = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${orphanProfessorToken}`);

    assert.equal(professorRes.status, 404);
    assert.equal(professorRes.body.success, false);
    assert.equal(professorRes.body.code, 'ACADEMY_NOT_FOUND');

    const studentRes = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${orphanStudentToken}`);

    assert.equal(studentRes.status, 404);
    assert.equal(studentRes.body.success, false);
    assert.equal(studentRes.body.code, 'ACADEMY_NOT_FOUND');
  });

  it('success.data-integrity returns expected fields and excludes sensitive fields', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${professorToken}`);

    assert.equal(res.status, 200);

    const summary = res.body.data;
    const expectedFields = [
      'id',
      'name',
      'email',
      'short_name',
      'description',
      'website',
      'logo_url',
      'phone',
    ];

    assert.deepEqual(Object.keys(summary).sort(), expectedFields.sort());
    assert.equal(summary.id, academy.id);
    assert.equal(summary.name, academy.name);
    assert.equal(summary.email, academy.email);
    assert.equal(summary.short_name, academy.short_name);

    const sensitiveFields = [
      'academy_number',
      'serial_number',
      'legal_name',
      'registration_number',
      'tax_id',
      'billing_email',
      'wallet_address',
      'issued_at',
      'is_revoked',
      'last_transaction_status',
    ];

    for (const field of sensitiveFields) {
      assert.equal(Object.prototype.hasOwnProperty.call(summary, field), false);
    }
  });
});
