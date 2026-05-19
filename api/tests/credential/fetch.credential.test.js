import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import crypto from 'crypto';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';
import { hash } from '../../src/utils/crypto.js';

describe('GET /api/credentials/:id', () => {
  const SEED_ACADEMY_EMAIL = 'seed.credential.fetch@seed.internal';
  const SEED_ACADEMY_NUMBER = 'ACD_CRD_F_0001';

  const ACADEMY_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const PROFESSOR_WALLET = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const STUDENT_WALLET = '0xcccccccccccccccccccccccccccccccccccccccc';
  const OTHER_STUDENT_WALLET = '0xdddddddddddddddddddddddddddddddddddddddd';

  const TEST_CODE_PREFIX = 'CRD_FETCH_';

  const ALL_TEST_WALLETS = [
    ACADEMY_WALLET,
    PROFESSOR_WALLET,
    STUDENT_WALLET,
    OTHER_STUDENT_WALLET,
  ].map((w) => ethers.getAddress(w).toLowerCase());

  const ALL_TEST_EMAILS = [
    SEED_ACADEMY_EMAIL,
    'student.fetch@credential.test',
    'student.fetch.other@credential.test',
    'prof.fetch@credential.test',
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

  const buildBlockchainCredential = ({ payloadHash, encryptedPayload = 'encrypted-payload', statusOverrides = {} } = {}) => ({
    identity: {},
    payload: {
      payloadHash,
      payloadSignature: '0x' + 'b'.repeat(130),
      encryptedPayload,
    },
    status: {
      issuedAt: new Date('2024-01-01'),
      revokedAt: null,
      academyAddress: ethers.getAddress(ACADEMY_WALLET),
      issuerAddress: ethers.getAddress(ACADEMY_WALLET),
      revocationReason: null,
      ...statusOverrides,
    },
  });

  const makeApp = async (overrides = {}) => {
    const defaultMocks = {
      '../../src/blockchain/credential.blockchain.js': {
        issueCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        revokeCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        getCredential: async () => buildBlockchainCredential({ payloadHash: '0x' + 'a'.repeat(64) }),
      },
      '../../src/config/db.js': db,
    };

    const merged = { ...defaultMocks, ...overrides };
    const { default: app } = await esmock('../../src/app.js', import.meta.url, {}, merged);
    return app;
  };

  const seedAcademy = async (email = SEED_ACADEMY_EMAIL, wallet = ACADEMY_WALLET) => {
    const { rows: [academy] } = await db.query(
      `INSERT INTO academies (
          academy_number, name, short_name, type, email, legal_name, registration_number, tax_id
       )
       VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [SEED_ACADEMY_NUMBER, 'Seed Fetch Academy', 'SFF', email, 'Seed Fetch Academy A.S.', 'REG-F-001', 'TAX-F-001']
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

  const seedCredential = async ({
    title,
    code,
    type,
    authorizerWallet,
    issuerWallet,
    studentWallet,
    payload,
    credentialIndex,
  }) => {
    const payloadHash = getPayloadHash(payload);

    const { rows: [credential] } = await db.query(
      `INSERT INTO credentials (
          title, code, type, description,
          authorizer_wallet_address, issuer_wallet_address, student_wallet_address,
          credential_index, issue_tx_hash, issued_at,
          payload, payload_hash
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        title,
        code,
        type,
        'Seed fetch credential',
        ethers.getAddress(authorizerWallet),
        ethers.getAddress(issuerWallet),
        ethers.getAddress(studentWallet),
        credentialIndex,
        '0x' + '1'.repeat(64),
        new Date('2024-01-01'),
        payload,
        payloadHash,
      ]
    );

    return { id: credential.id, payloadHash };
  };

  const cleanup = async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${TEST_CODE_PREFIX}%`]);

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

  it('returns 200 for student view and hides raw payload', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET, 'student.fetch@credential.test');
    await seedProfessor(ACADEMY_ID, PROFESSOR_WALLET, 'prof.fetch@credential.test');

    const payload = {
      certificate_name: 'Fetch Student',
      certificate_code: 'FS-1',
      certificate_category: 'professional',
      delivery_mode: 'online',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      instructor_name: 'Dr. Fetch',
    };

    const { id: credentialId, payloadHash } = await seedCredential({
      title: 'Student View',
      code: `${TEST_CODE_PREFIX}${uniqueSuffix()}`,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET,
      payload,
      credentialIndex: 1,
    });

    const app = await makeApp({
      '../../src/blockchain/credential.blockchain.js': {
        issueCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        revokeCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        getCredential: async () => buildBlockchainCredential({ payloadHash, encryptedPayload: 'encrypted-student' }),
      },
    });

    const studentToken = issueAccessToken({ sub: STUDENT_WALLET, role: 'student' });

    const res = await request(app)
      .get(`/api/credentials/${credentialId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.meta.id, credentialId);
    assert.equal(res.body.data.encryptedPayload, 'encrypted-student');
    assert.equal('payload' in res.body.data, false);
  });

  it('returns 200 for academy view and includes raw payload', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET, 'student.fetch@credential.test');

    const payload = {
      certificate_name: 'Fetch Academy',
      certificate_code: 'FA-1',
      certificate_category: 'professional',
      delivery_mode: 'online',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      instructor_name: 'Dr. Fetch',
    };

    const { id: credentialId, payloadHash } = await seedCredential({
      title: 'Academy View',
      code: `${TEST_CODE_PREFIX}${uniqueSuffix()}`,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET,
      payload,
      credentialIndex: 2,
    });

    const app = await makeApp({
      '../../src/blockchain/credential.blockchain.js': {
        issueCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        revokeCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        getCredential: async () => buildBlockchainCredential({ payloadHash, encryptedPayload: 'encrypted-academy' }),
      },
    });

    const res = await request(app)
      .get(`/api/credentials/${credentialId}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data.payload, payload);
    assert.equal('encryptedPayload' in res.body.data, false);
  });

  it('returns 404 when student requests another student credential', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET, 'student.fetch@credential.test');
    await seedStudent(ACADEMY_ID, OTHER_STUDENT_WALLET, 'student.fetch.other@credential.test');

    const payload = {
      certificate_name: 'Other Student',
      certificate_code: 'OS-1',
      certificate_category: 'professional',
      delivery_mode: 'online',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      instructor_name: 'Dr. Other',
    };

    const { id: credentialId } = await seedCredential({
      title: 'Other Credential',
      code: `${TEST_CODE_PREFIX}${uniqueSuffix()}`,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: OTHER_STUDENT_WALLET,
      payload,
      credentialIndex: 3,
    });

    const app = await makeApp();
    const studentToken = issueAccessToken({ sub: STUDENT_WALLET, role: 'student' });

    const res = await request(app)
      .get(`/api/credentials/${credentialId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CREDENTIAL_NOT_FOUND');
  });

  it('returns 500 when payload hash mismatches blockchain payload', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET, 'student.fetch@credential.test');

    const payload = {
      certificate_name: 'Tamper Test',
      certificate_code: 'TT-1',
      certificate_category: 'professional',
      delivery_mode: 'online',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      instructor_name: 'Dr. Tamper',
    };

    const { id: credentialId } = await seedCredential({
      title: 'Tamper Credential',
      code: `${TEST_CODE_PREFIX}${uniqueSuffix()}`,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET,
      payload,
      credentialIndex: 4,
    });

    const mismatchedHash = getPayloadHash({
      certificate_name: 'Tampered',
      certificate_code: 'TT-2',
      certificate_category: 'professional',
      delivery_mode: 'online',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      instructor_name: 'Dr. Tamper',
    });

    const app = await makeApp({
      '../../src/blockchain/credential.blockchain.js': {
        issueCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        revokeCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        getCredential: async () => buildBlockchainCredential({ payloadHash: mismatchedHash }),
      },
    });

    const studentToken = issueAccessToken({ sub: STUDENT_WALLET, role: 'student' });

    const res = await request(app)
      .get(`/api/credentials/${credentialId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.code, 'CREDENTIAL_DATA_INTEGRITY_ERROR');
  });

  it('returns 404 when credential does not exist', async () => {
    const app = await makeApp();

    const res = await request(app)
      .get('/api/credentials/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CREDENTIAL_NOT_FOUND');
  });

  it('returns 502 when blockchain lookup fails', async () => {
    await seedStudent(ACADEMY_ID, STUDENT_WALLET, 'student.fetch@credential.test');

    const payload = {
      certificate_name: 'Chain Fail',
      certificate_code: 'CF-1',
      certificate_category: 'professional',
      delivery_mode: 'online',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      instructor_name: 'Dr. Chain',
    };

    const { id: credentialId, payloadHash } = await seedCredential({
      title: 'Chain Credential',
      code: `${TEST_CODE_PREFIX}${uniqueSuffix()}`,
      type: 'certificate',
      authorizerWallet: ACADEMY_WALLET,
      issuerWallet: ACADEMY_WALLET,
      studentWallet: STUDENT_WALLET,
      payload,
      credentialIndex: 5,
    });

    const app = await makeApp({
      '../../src/blockchain/credential.blockchain.js': {
        issueCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        revokeCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        getCredential: async () => {
          const err = new Error('Blockchain offline');
          err.statusCode = 502;
          err.code = 'BLOCKCHAIN_ERROR';
          throw err;
        },
      },
    });

    const res = await request(app)
      .get(`/api/credentials/${credentialId}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`);

    assert.equal(res.status, 502);
    assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
  });
});
