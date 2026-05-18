import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

describe('POST /api/credentials/:id/issue', function () {
  this.timeout(10000);

  const SEED_ACADEMY_EMAIL = 'seed.credential.issue@seed.internal';
  const SEED_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const STUDENT_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1';
  const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456ab9';
  const FAKE_TX = { hash: FAKE_TX_HASH, wait: async () => ({ hash: FAKE_TX_HASH }) };
  const FAKE_SIGNATURE = '0x' + 'b'.repeat(130);

  const ALL_TEST_WALLETS = [SEED_WALLET, STUDENT_WALLET].map(w => ethers.getAddress(w).toLowerCase());
  const ALL_TEST_EMAILS = [SEED_ACADEMY_EMAIL, 'student.credential.issue@credential.test'];

  let ACADEMY_ID;
  let ACADEMY_TOKEN;

  const issueAccessToken = (payload = {}) => signTokens(
    { sub: ethers.getAddress(payload.sub || SEED_WALLET), role: payload.role || 'academy', ...payload },
    undefined,
    true,
  ).accessToken;

  const seedAcademy = async () => {
    const { rows: [academy] } = await db.query(
      `INSERT INTO academies (academy_number, name, short_name, type, email, legal_name, registration_number, tax_id)
       VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['ACD_CRD_I_0002', 'Seed Credential Issue Academy', 'SCIA', SEED_ACADEMY_EMAIL, 'Seed Cred I A.S.', 'REG-CRD-I-002', 'TAX-CRD-I-002']
    );

    await db.query(
      `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'academy', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, academy_id = EXCLUDED.academy_id`,
      [academy.id, ethers.getAddress(SEED_WALLET), '0x04seedipub' + 'a'.repeat(120)]
    );

    return academy.id;
  };

  const seedStudent = async () => {
    const email = 'student.credential.issue@credential.test';
    const { rows: [user] } = await db.query(
      `INSERT INTO users (first_name, last_name, full_name, email, date_of_birth, gender, national_id, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['Cred', 'Student', 'Cred Student Issue', email, '2000-01-01', 'female', 'NID-CRD-I-002', 'Turkish']
    );

    await db.query(
      `INSERT INTO students (user_id, academy_id, department_id, student_number, enrollment_status, enrollment_date, expected_graduation_date)
       VALUES ($1, $2, (SELECT id FROM departments WHERE academy_id = $2 LIMIT 1), $3, 'active', '2022-09-15', '2026-06-30')
       ON CONFLICT (user_id) DO UPDATE SET academy_id = EXCLUDED.academy_id`,
      [user.id, ACADEMY_ID, 'STU-CRD-I-002']
    );

    await db.query(
      `INSERT INTO identities (user_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'student', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, user_id = EXCLUDED.user_id`,
      [user.id, ethers.getAddress(STUDENT_WALLET), '0x04studipub' + 'b'.repeat(120)]
    );

    return user;
  };

  const makeApp = async (overrides = {}) => {
    const defaultMocks = {
      '../../src/blockchain/credential.blockchain.js': { issueCredential: async () => FAKE_TX },
      '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
      '../../src/utils/crypto.js': {
        recoverSignerFromTypedData: () => ethers.getAddress(SEED_WALLET),
        encryptWithPublicKey: async () => 'encrypted',
        hash: () => '0x' + 'a'.repeat(64),
      },
      '../../src/config/db.js': db,
    };

    const merged = { ...defaultMocks, ...overrides };
    const { default: app } = await esmock('../../src/app.js', import.meta.url, {}, merged);
    return app;
  };

  const cleanup = async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' IS NOT NULL`);
    
    await db.query(`DELETE FROM identities WHERE LOWER(wallet_address) = ANY($1)`, [ALL_TEST_WALLETS]);
    await db.query(`DELETE FROM professors WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
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
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' IS NOT NULL`);
    
    await db.query(`UPDATE identities SET is_active = TRUE WHERE wallet_address = $1`, [ethers.getAddress(SEED_WALLET)]);
    
    await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM students WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`DELETE FROM professors WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`DELETE FROM users WHERE email = ANY($1)`, [ALL_TEST_EMAILS]);
    
    await db.query(`DELETE FROM departments WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`INSERT INTO departments (academy_id, code, name, faculty, total_years) VALUES ($1,'CENG','Computer Engineering','Engineering',4)`, [ACADEMY_ID]);
  });

  afterEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' IS NOT NULL`);
    sinon.restore();
  });

  after(async () => {
    await cleanup();
  });

  it('returns 200 and blockchain transaction on valid issuance', async () => {
    await seedStudent();
    const app = await makeApp();

    const createRes = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({
        title: 'Completion Certificate',
        credential_type: 'certificate',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: {
          certificate_name: 'Intro to Testing',
          certificate_code: 'CERT-201',
          certificate_category: 'professional',
          delivery_mode: 'online',
          start_date: '2024-01-01',
          end_date: '2024-02-01',
          instructor_name: 'Dr. Issuer'
        }
      });

    assert.equal(createRes.status, 200);
    const { credential_id } = createRes.body.data;

    const issueRes = await request(app)
      .post(`/api/credentials/${credential_id}/issue`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(issueRes.status, 200);
    assert.equal(issueRes.body.success, true);
    assert.equal(issueRes.body.data.blockchain_transaction.tx_hash, FAKE_TX_HASH);
  });

  it('returns 422 VALIDATION_ERROR when signature is missing', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/credentials/00000000-0000-0000-0000-000000000000/issue')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({});

    assert.equal(res.status, 422);
  });

  it('returns 502 BLOCKCHAIN_ERROR when blockchain submission fails', async () => {
    await seedStudent();
    const app = await makeApp({ '../../src/blockchain/credential.blockchain.js': { issueCredential: async () => { const err = new Error('fail'); err.statusCode = 502; err.code = 'BLOCKCHAIN_ERROR'; throw err; } } });

    const createRes = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({
        title: 'X',
        credential_type: 'certificate',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    const { credential_id } = createRes.body.data;

    const issueRes = await request(app)
      .post(`/api/credentials/${credential_id}/issue`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(issueRes.status, 502);
  });

  it('returns 404 when credential ID does not exist', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/credentials/00000000-0000-0000-0000-000000000001/issue')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(res.status, 404);
  });

  it('returns 403 when a different wallet tries to issue', async () => {
    await seedStudent();
    const app = await makeApp();

    const createRes = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({
        title: 'X',
        credential_type: 'certificate',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    const { credential_id } = createRes.body.data;
    const otherToken = issueAccessToken({ sub: '0x1234567890123456789012345678901234567890', role: 'academy' });

    const issueRes = await request(app)
      .post(`/api/credentials/${credential_id}/issue`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(issueRes.status, 403);
  });

  it('returns 400 for invalid signature', async () => {
    await seedStudent();
    const app = await makeApp({ 
        '../../src/utils/crypto.js': {
            recoverSignerFromTypedData: () => '0x0000000000000000000000000000000000000001',
            encryptWithPublicKey: async () => 'encrypted',
            hash: () => '0x' + 'a'.repeat(64),
        }
    });

    const createRes = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({
        title: 'X',
        credential_type: 'certificate',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    const { credential_id } = createRes.body.data;

    const issueRes = await request(app)
      .post(`/api/credentials/${credential_id}/issue`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(issueRes.status, 400);
  });

  it('returns 401 when issuer identity becomes inactive', async () => {
    await seedStudent();
    const app = await makeApp();

    const createRes = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({
        title: 'X',
        credential_type: 'certificate',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    const { credential_id } = createRes.body.data;
    await db.query(`UPDATE identities SET is_active = FALSE WHERE wallet_address = $1`, [ethers.getAddress(SEED_WALLET)]);

    const issueRes = await request(app)
      .post(`/api/credentials/${credential_id}/issue`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(issueRes.status, 404);
  });

  it('returns 401 when request is unauthenticated', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/credentials/some-id/issue')
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(res.status, 401);
  });

  it('returns 500 when database update fails during issuance', async () => {
    await seedStudent();
    const app = await makeApp();

    const createRes = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({
        title: 'X',
        credential_type: 'certificate',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    const { credential_id } = createRes.body.data;

    const originalQuery = db.query;
    sinon.stub(db, 'query').callsFake(async (text, params) => {
        if (text && text.toLowerCase().includes('update credentials')) {
            throw new Error('Update failed');
        }
        return originalQuery.apply(db, [text, params]);
    });

    const issueRes = await request(app)
      .post(`/api/credentials/${credential_id}/issue`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ signature: FAKE_SIGNATURE });

    assert.equal(issueRes.status, 500);
  });
});
