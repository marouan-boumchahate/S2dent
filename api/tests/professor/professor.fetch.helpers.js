import crypto from 'crypto';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

export const TEST_EMAIL_SUFFIX = '@prof-fetch.test';
export const TEST_ACADEMY_EMAIL = 'prof.fetch.academy@seed.internal';
export const TEST_MARKER = 'prof_fetch';

let userColumnCache = null;

export const randomHex = (size) => crypto.randomBytes(size).toString('hex');
export const buildWalletAddress = () => `0x${randomHex(20)}`;
export const buildPublicKey = () => `0x04${randomHex(64)}`;
export const buildTxHash = () => `0x${randomHex(32)}`;

export const getUserColumns = async () => {
  if (userColumnCache) return userColumnCache;

  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`,
  );

  userColumnCache = new Set(rows.map((row) => row.column_name));
  return userColumnCache;
};

export const issueAcademyToken = (academyId) => signTokens(
  { sub: buildWalletAddress(), role: 'academy', uid: academyId, rid: academyId },
  undefined,
  true,
).accessToken;

export const makeProfessorToken = ({ professor, user, walletAddress } = {}) => signTokens(
  {
    sub: walletAddress ?? buildWalletAddress(),
    role: 'professor',
    uid: user?.id,
    rid: professor?.id,
  },
  undefined,
  true,
).accessToken;

export const makeStudentToken = () => signTokens(
  {
    sub: buildWalletAddress(),
    role: 'student',
    uid: buildWalletAddress(),
    rid: buildWalletAddress(),
  },
  undefined,
  true,
).accessToken;

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
    `DELETE FROM users
     WHERE email LIKE $1`,
    [emailLike],
  );
};

export const teardownAcademySeed = async (academyId) => {
  await db.query(`DELETE FROM professors WHERE academy_id = $1`, [academyId]);
  await db.query(`DELETE FROM departments WHERE academy_id = $1`, [academyId]);
  await db.query(`DELETE FROM identities WHERE academy_id = $1`, [academyId]);
  await db.query(`DELETE FROM academies WHERE id = $1`, [academyId]);
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
      'Professor Fetch Academy',
      'PFA',
      TEST_ACADEMY_EMAIL,
      'Professor Fetch Academy Legal',
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

export const seedUser = async ({
  email,
  firstName = 'Professor',
  middleName = null,
  lastName = 'Fetch',
  fullName = 'Professor Fetch',
}) => {
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
    firstName,
    middleName,
    lastName,
    fullName,
    '1980-03-20',
    'male',
    `NID-${randomHex(8)}`,
    email,
    '+905551234567',
    null,
  ];

  if (columns.has('nationality')) {
    insertCols.push('nationality');
    insertVals.push('Turkish');
  }

  if (columns.has('is_active')) {
    insertCols.push('is_active');
    insertVals.push(true);
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

export const seedProfessor = async ({
  academyId,
  departmentId,
  email,
  fullName,
  withIdentity = true,
  revoked = false,
  employeeNumber = `EMP_${Date.now()}_${randomHex(4)}`,
  title = 'Dr.',
  rank = 'Prof',
  specialization = 'Computer Vision',
  hireDate = '2020-01-01',
  employmentType = 'full_time',
  officeLocation = 'Building A - 301',
  officeHours = 'Mon 10:00-12:00',
  bio = 'Professor profile for fetch tests.',
} = {}) => {
  const user = await seedUser({
    email,
    fullName,
    firstName: fullName?.split(' ')[0] ?? 'Professor',
    lastName: fullName?.split(' ').slice(-1)[0] ?? 'Fetch',
  });

  const { rows: [professor] } = await db.query(
    `INSERT INTO professors (
       user_id, academy_id, department_id,
       employee_number, title, rank, specialization,
       hire_date, employment_type, office_location, office_hours, bio
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, user_id, academy_id, department_id, employee_number`,
    [
      user.id,
      academyId,
      departmentId,
      employeeNumber,
      title,
      rank,
      specialization,
      hireDate,
      employmentType,
      officeLocation,
      officeHours,
      bio,
    ],
  );

  if (!withIdentity) {
    return { user, professor };
  }

  const issueTxHash = buildTxHash();
  await db.query(
    `INSERT INTO pending_transactions (tx_hash, payload, status)
     VALUES ($1, $2, $3)`,
    [issueTxHash, { test_marker: TEST_MARKER, stage: 'issue', email: user.email }, 'pending'],
  );

  const walletAddress = buildWalletAddress();
  await db.query(
    `INSERT INTO identities (
       user_id, wallet_address, public_key, role,
       issue_identity_tx_hash, issued_at
     )
     VALUES ($1, $2, $3, 'professor', $4, NOW())`,
    [user.id, walletAddress, buildPublicKey(), issueTxHash],
  );

  if (!revoked) {
    return { user, professor, walletAddress, issueTxHash };
  }

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

  return { user, professor, walletAddress, issueTxHash, revokeTxHash };
};

export const assertSummaryShape = (summary) => {
  assert.ok(summary.id);
  assert.ok(summary.name);
  assert.ok(summary.email);
  assert.ok(summary.department);
  assert.ok(summary.walletAddress);
};

export const assertProfessorShape = (professor) => {
  assert.ok(professor.id);
  assert.ok(professor.user_id);
  assert.ok(professor.academy_id);
  assert.ok(professor.department_id);
  assert.ok(professor.serial_number);
  assert.ok(professor.title);
  assert.ok(professor.rank);
  assert.ok(professor.hire_date);
  assert.ok(professor.employment_type);
  assert.ok(Object.prototype.hasOwnProperty.call(professor, 'office_location'));
  assert.ok(Object.prototype.hasOwnProperty.call(professor, 'office_hours'));
  assert.ok(Object.prototype.hasOwnProperty.call(professor, 'bio'));
  assert.ok(Object.prototype.hasOwnProperty.call(professor, 'is_active'));
};