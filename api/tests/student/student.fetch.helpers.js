import crypto from 'crypto';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

export const TEST_EMAIL_SUFFIX = '@student-fetch.test';
export const TEST_MARKER = 'student_fetch';

let userColumnCache = null;

const randomHex = (size) => crypto.randomBytes(size).toString('hex');

export const buildWalletAddress = () => `0x${randomHex(20)}`;
export const buildPublicKey = () => `0x04${randomHex(64)}`;
export const buildTxHash = () => `0x${randomHex(32)}`;

export const issueAcademyToken = (rid) => signTokens(
  { sub: buildWalletAddress(), role: 'academy', uid: rid, rid },
  undefined,
  true,
).accessToken;

export const makeStudentToken = ({ userId, studentId }) => signTokens(
  {
    sub: buildWalletAddress(),
    role: 'student',
    uid: userId,
    rid: studentId,
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

const seedUser = async ({ email, fullName }) => {
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
    fullName.split(' ')[0] ?? 'Student',
    null,
    fullName.split(' ').slice(-1)[0] ?? 'Fetch',
    fullName,
    '2004-01-15',
    'male',
    `NID-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
     RETURNING id, email, full_name`,
    insertVals,
  );

  return user;
};

export const seedAcademy = async () => {
  const { rows: [{ nextval }] } = await db.query(`SELECT nextval('academy_seq')`);
  const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`;

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     RETURNING id, name, email`,
    [
      academyNumber,
      'Student Fetch Academy',
      'SFA',
      `student.fetch.academy@seed.internal`,
      'Student Fetch Academy Legal',
      `REG-${nextval}`,
      `TAX-${nextval}`,
    ],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
     VALUES ($1, $2, $3, 'academy', NOW())`,
    [academy.id, buildWalletAddress(), buildPublicKey()],
  );

  const { rows: [department] } = await db.query(
    `INSERT INTO departments (academy_id, code, name, faculty, total_years)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [academy.id, 'CENG', 'Computer Engineering', 'Engineering', 4],
  );

  return { academy, department };
};

export const seedAdvisorProfessor = async ({ academyId, departmentId, email, fullName }) => {
  const user = await seedUser({ email, fullName });

  const { rows: [professor] } = await db.query(
    `INSERT INTO professors (
       user_id, academy_id, department_id, employee_number, title, rank, hire_date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [user.id, academyId, departmentId, `EMP_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`, 'Dr.', 'Prof', '2012-01-01'],
  );

  return { user, professor };
};

export const seedStudent = async ({ academyId, departmentId, advisorId = null, email, fullName, revoked = false }) => {
  const user = await seedUser({ email, fullName });
  const studentNumber = `STU_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
  const issueTxHash = buildTxHash();

  await db.query(
    `INSERT INTO pending_transactions (tx_hash, payload, status)
     VALUES ($1, $2, $3)`,
    [issueTxHash, { test_marker: TEST_MARKER, stage: 'issue', email: user.email }, 'pending'],
  );

  const { rows: [student] } = await db.query(
    `INSERT INTO students (
       user_id, academy_id, department_id, advisor_id, student_number,
       enrollment_status, enrollment_date, expected_graduation_date, actual_graduation_date
     )
     VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '4 years', NULL)
     RETURNING id, user_id, academy_id, department_id, student_number`,
    [user.id, academyId, departmentId, advisorId, studentNumber],
  );

  await db.query(
    `INSERT INTO identities (
       user_id, wallet_address, public_key, role,
       issue_identity_tx_hash, issued_at
     )
     VALUES ($1, $2, $3, 'student', $4, NOW())`,
    [user.id, buildWalletAddress(), buildPublicKey(), issueTxHash],
  );

  if (revoked) {
    const revokeTxHash = buildTxHash();

    await db.query(
      `INSERT INTO pending_transactions (tx_hash, payload, status)
       VALUES ($1, $2, $3)`,
      [revokeTxHash, { test_marker: TEST_MARKER, stage: 'revoke', email: user.email }, 'pending'],
    );

    await db.query(
      `UPDATE identities
       SET revoke_identity_tx_hash = $1,
           revoked_at = NOW()
       WHERE user_id = $2`,
      [revokeTxHash, user.id],
    );
  }

  return { user, student };
};

export const cleanupFetchDB = async () => {
  const emailLike = `%${TEST_EMAIL_SUFFIX}`;

  await db.query(
    `DELETE FROM pending_transactions
     WHERE payload->>'test_marker' = $1`,
    [TEST_MARKER],
  );

  await db.query(
    `DELETE FROM identities
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE $1
     )`,
    [emailLike],
  );

  await db.query(
    `DELETE FROM professors
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE $1
     )`,
    [emailLike],
  );

  await db.query(
    `DELETE FROM students
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE $1
     )`,
    [emailLike],
  );

  await db.query(
    `DELETE FROM users
     WHERE email LIKE $1`,
    [emailLike],
  );
};

export const teardownAcademySeed = async (academyId) => {
  await db.query(`DELETE FROM students WHERE academy_id = $1`, [academyId]);
  await db.query(`DELETE FROM departments WHERE academy_id = $1`, [academyId]);
  await db.query(`DELETE FROM identities WHERE academy_id = $1`, [academyId]);
  await db.query(`DELETE FROM academies WHERE id = $1`, [academyId]);
};