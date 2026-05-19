import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import crypto from 'crypto';
import { ethers } from 'ethers';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';
import { hash } from '../../src/utils/crypto.js';

describe('GET /api/credentials', () => {
  const SEED_ACADEMY_EMAIL = 'seed.credential.fetchall@seed.internal';
  const SEED_ACADEMY_NUMBER = 'ACD_CRD_L_0001';

  const ACADEMY_WALLET = '0x1111111111111111111111111111111111111111';
  const PROFESSOR_WALLET = '0x2222222222222222222222222222222222222222';
  const STUDENT_WALLET_1 = '0x3333333333333333333333333333333333333333';
  const STUDENT_WALLET_2 = '0x4444444444444444444444444444444444444444';
  const EMPTY_WALLET = '0x5555555555555555555555555555555555555555';

  const TEST_CODE_PREFIX = 'CRD_LIST_';

  const ALL_TEST_WALLETS = [
    ACADEMY_WALLET,
    PROFESSOR_WALLET,
    STUDENT_WALLET_1,
    STUDENT_WALLET_2,
    EMPTY_WALLET,
  ].map((w) => ethers.getAddress(w).toLowerCase());

  const ALL_TEST_EMAILS = [
    SEED_ACADEMY_EMAIL,
    'student.one@credential.list.test',
    'student.two@credential.list.test',
    'prof@credential.list.test',
  ];

  let ACADEMY_ID;
  let ACADEMY_TOKEN;

  const uniqueSuffix = () => crypto.randomBytes(6).toString('hex');

  const issueAccessToken = (payload = {}) => signTokens(
    { sub: ethers.getAddress(payload.sub || ACADEMY_WALLET), role: payload.role || 'academy', ...payload },
    undefined,
    true,
  ).accessToken;

  const getPayloadHash = (payload) => hash(JSON.stringify(payload, Object.keys(payload).sort()));

  const seedAcademy = async (email = SEED_ACADEMY_EMAIL, wallet = ACADEMY_WALLET) => {
    const { rows: [academy] } = await db.query(
      `INSERT INTO academies (
          academy_number, name, short_name, type, email, legal_name, registration_number, tax_id
       )
       VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [SEED_ACADEMY_NUMBER, 'Seed FetchAll Academy', 'SFA', email, 'Seed FetchAll Academy A.S.', 'REG-L-001', 'TAX-L-001']
    );

    await db.query(
      `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'academy', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, academy_id = EXCLUDED.academy_id`,
      [academy.id, ethers.getAddress(wallet), '0x04acadpub' + wallet.slice(2, 10).padEnd(120, '0')]
    );

    await db.query(
      `INSERT INTO departments (academy_id, code, name, faculty, total_years)
       VALUES ($1, 'CS', 'Computer Science', 'Engineering', 4)
       ON CONFLICT (academy_id, code) DO NOTHING`,
      [academy.id]
    );

    return academy.id;
  };

  const seedStudent = async (academyId, wallet, email) => {
    const fullName = `Student Fetch ${uniqueSuffix()}`;
    const { rows: [user] } = await db.query(
      `INSERT INTO users (first_name, last_name, full_name, email, date_of_birth, gender, national_id, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['Student', 'Fetch', fullName, email, '2000-01-01', 'female', 'NID-' + uniqueSuffix(), 'Turkish']
    );

    await db.query(
      `INSERT INTO students (user_id, academy_id, department_id, student_number, enrollment_status, enrollment_date, expected_graduation_date)
       VALUES ($1, $2, (SELECT id FROM departments WHERE academy_id = $2 LIMIT 1), $3, 'active', '2022-09-15', '2026-06-30')
       ON CONFLICT (user_id) DO UPDATE SET academy_id = EXCLUDED.academy_id`,
      [user.id, academyId, 'STU-' + uniqueSuffix()]
    );

    await db.query(
      `INSERT INTO identities (user_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'student', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, user_id = EXCLUDED.user_id`,
      [user.id, ethers.getAddress(wallet), '0x04studpub' + wallet.slice(2, 10).padEnd(120, '0')]
    );

    return user.id;
  };

  const seedProfessor = async (academyId, wallet, email) => {
    const fullName = `Professor Fetch ${uniqueSuffix()}`;
    const { rows: [user] } = await db.query(
      `INSERT INTO users (first_name, last_name, full_name, email, date_of_birth, gender, national_id, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['Professor', 'Fetch', fullName, email, '1980-01-01', 'male', 'NID-' + uniqueSuffix(), 'Turkish']
    );

    await db.query(
      `INSERT INTO professors (user_id, academy_id, department_id, employee_number, title, rank, hire_date)
       VALUES ($1, $2, (SELECT id FROM departments WHERE academy_id = $2 LIMIT 1), $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET academy_id = EXCLUDED.academy_id`,
      [user.id, academyId, 'EMP-' + uniqueSuffix(), 'Dr.', 'Prof', '2010-01-01']
    );

    await db.query(
      `INSERT INTO identities (user_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'professor', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, user_id = EXCLUDED.user_id`,
      [user.id, ethers.getAddress(wallet), '0x04profpub' + wallet.slice(2, 10).padEnd(120, '0')]
    );

    return user.id;
  };

  const seedPendingTransaction = async (txHash, credentialCode, status = 'pending') => {
    await db.query(
      `INSERT INTO pending_transactions (tx_hash, payload, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (tx_hash) DO NOTHING`,
      [txHash, { action: 'credential_issue', credential_code: credentialCode }, status]
    );
  };

  const seedCredential = async ({
    title,
    code,
    type,
    authorizerWallet,
    issuerWallet,
    studentWallet,
    issuedAt = null,
    revokedAt = null,
    issueTxHash,
    revokeTxHash = null,
    payload,
  }) => {
    const payloadHash = getPayloadHash(payload);
    const { rows: [credential] } = await db.query(
      `INSERT INTO credentials (
          title, code, type, description,
          authorizer_wallet_address, issuer_wallet_address, student_wallet_address,
          credential_index, issue_tx_hash, issued_at, revoke_tx_hash, revoked_at,
          payload, payload_hash
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        title,
        code,
        type,
        'Seed fetch list',
        ethers.getAddress(authorizerWallet),
        ethers.getAddress(issuerWallet),
        ethers.getAddress(studentWallet),
        1,
        issueTxHash,
        issuedAt,
        revokeTxHash,
        revokedAt,
        payload,
        payloadHash,
      ]
    );

    return credential.id;
  };

  const cleanup = async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${TEST_CODE_PREFIX}%`]);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE $1`, [`${TEST_CODE_PREFIX}%`]);

    await db.query(`DELETE FROM identities WHERE LOWER(wallet_address) = ANY($1)`, [ALL_TEST_WALLETS]);
    await db.query(`DELETE FROM professors WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM departments WHERE academy_id IN (SELECT id FROM academies WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM academies WHERE email = ANY($1)`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM users WHERE email = ANY($1)`, [ALL_TEST_EMAILS]);
  };

  before(async () => {
    await cleanup();
    ACADEMY_ID = await seedAcademy();
    ACADEMY_TOKEN = issueAccessToken({ uid: ACADEMY_ID });
  });

  beforeEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${TEST_CODE_PREFIX}%`]);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE $1`, [`${TEST_CODE_PREFIX}%`]);

    await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM professors WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM users WHERE email = ANY($1)`, [ALL_TEST_EMAILS]);
  });

  afterEach(async () => {
    sinon.restore();
  });

  after(async () => {
    await cleanup();
  });

  it('returns 200 for student and only issued credentials', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET_1, 'student.one@credential.list.test');

    const issuedCode = `${TEST_CODE_PREFIX}${uniqueSuffix()}`;
    const draftCode = `${TEST_CODE_PREFIX}${uniqueSuffix()}`;

    const issuedTxHash = '0x' + '1'.repeat(64);
    const draftTxHash = '0x' + '2'.repeat(64);

    await seedCredential({
      title: 'Issued Credential',
      code: issuedCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET_1,
      issuedAt: new Date('2024-01-15'),
      issueTxHash: issuedTxHash,
      payload: { certificate_name: 'Issued', certificate_code: 'ISS-1', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'Dr. I' },
    });

    await seedCredential({
      title: 'Draft Credential',
      code: draftCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET_1,
      issuedAt: null,
      issueTxHash: draftTxHash,
      payload: { certificate_name: 'Draft', certificate_code: 'DRF-1', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-03-01', end_date: '2024-04-01', instructor_name: 'Dr. D' },
    });

    await seedPendingTransaction(issuedTxHash, issuedCode, 'verified');
    await seedPendingTransaction(draftTxHash, draftCode, 'pending');

    const studentToken = issueAccessToken({ sub: STUDENT_WALLET_1, role: 'student' });

    const res = await request(app)
      .get('/api/credentials')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.credentials.length, 1);
    assert.equal(res.body.data.credentials[0].code, issuedCode);
  });

  it('returns 200 for academy and all authorized credentials', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET_1, 'student.one@credential.list.test');
    await seedStudent(ACADEMY_ID, STUDENT_WALLET_2, 'student.two@credential.list.test');

    const codeOne = `${TEST_CODE_PREFIX}${uniqueSuffix()}`;
    const codeTwo = `${TEST_CODE_PREFIX}${uniqueSuffix()}`;

    const txOne = '0x' + '3'.repeat(64);
    const txTwo = '0x' + '4'.repeat(64);

    await seedCredential({
      title: 'Academy One',
      code: codeOne,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET_1,
      issuedAt: new Date('2024-01-10'),
      issueTxHash: txOne,
      payload: { certificate_name: 'Academy One', certificate_code: 'AC-1', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'Dr. A' },
    });

    await seedCredential({
      title: 'Academy Two',
      code: codeTwo,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET_2,
      issuedAt: null,
      issueTxHash: txTwo,
      payload: { certificate_name: 'Academy Two', certificate_code: 'AC-2', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-03-01', end_date: '2024-04-01', instructor_name: 'Dr. A2' },
    });

    await seedPendingTransaction(txOne, codeOne, 'verified');
    await seedPendingTransaction(txTwo, codeTwo, 'pending');

    const res = await request(app)
      .get('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const codes = res.body.data.credentials.map((c) => c.code).sort();
    assert.deepEqual(codes, [codeOne, codeTwo].sort());
  });

  it('returns 200 for professor and all issued by professor', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET_1, 'student.one@credential.list.test');
    await seedStudent(ACADEMY_ID, STUDENT_WALLET_2, 'student.two@credential.list.test');
    await seedProfessor(ACADEMY_ID, PROFESSOR_WALLET, 'prof@credential.list.test');

    const codeOne = `${TEST_CODE_PREFIX}${uniqueSuffix()}`;
    const codeTwo = `${TEST_CODE_PREFIX}${uniqueSuffix()}`;

    const txOne = '0x' + '5'.repeat(64);
    const txTwo = '0x' + '6'.repeat(64);

    await seedCredential({
      title: 'Prof One',
      code: codeOne,
      type: 'attendance',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: PROFESSOR_WALLET,
      studentWallet: STUDENT_WALLET_1,
      issuedAt: new Date('2024-02-01'),
      issueTxHash: txOne,
      payload: { course_code: 'CS101', course_name: 'Logic', academic_year: '2023-2024', semester: 'fall', total_sessions: 30, attended_sessions: 28, excused_absences: 2, period_from: '2023-09-01', period_to: '2023-12-30' },
    });

    await seedCredential({
      title: 'Prof Two',
      code: codeTwo,
      type: 'attendance',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: PROFESSOR_WALLET,
      studentWallet: STUDENT_WALLET_2,
      issuedAt: new Date('2024-02-02'),
      issueTxHash: txTwo,
      payload: { course_code: 'CS102', course_name: 'Math', academic_year: '2023-2024', semester: 'fall', total_sessions: 28, attended_sessions: 25, excused_absences: 3, period_from: '2023-09-01', period_to: '2023-12-30' },
    });

    await seedPendingTransaction(txOne, codeOne, 'verified');
    await seedPendingTransaction(txTwo, codeTwo, 'verified');

    const professorToken = issueAccessToken({ sub: PROFESSOR_WALLET, role: 'professor' });

    const res = await request(app)
      .get('/api/credentials')
      .set('Authorization', `Bearer ${professorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const codes = res.body.data.credentials.map((c) => c.code).sort();
    assert.deepEqual(codes, [codeOne, codeTwo].sort());
  });

  it('returns 200 with empty list when user has no credentials', async () => {
    const emptyToken = issueAccessToken({ sub: EMPTY_WALLET, role: 'student' });

    const res = await request(app)
      .get('/api/credentials')
      .set('Authorization', `Bearer ${emptyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data.credentials, []);
  });

  it('returns 400 INVALID_ROLE when role is unsupported', async () => {
    const { default: appWithInvalidRole } = await esmock('../../src/app.js', import.meta.url, {}, {
      '../../src/middlewares/role.middleware.js': () => (req, res, next) => next(),
    });

    const invalidToken = issueAccessToken({ sub: ACADEMY_WALLET, role: 'admin' });

    const res = await request(appWithInvalidRole)
      .get('/api/credentials')
      .set('Authorization', `Bearer ${invalidToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_ROLE');
  });
});
