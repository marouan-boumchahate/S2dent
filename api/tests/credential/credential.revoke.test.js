import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

describe('DELETE /api/credentials/:id/revoke', function () {
  this.timeout(10000);

  const SEED_ACADEMY_EMAIL = 'seed.credential.revoke@seed.internal';
  const SEED_WALLET = '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead';
  const OTHER_ACADEMY_WALLET = '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddea1';
  const STUDENT_WALLET = '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddea2';
  const PROFESSOR_WALLET = '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddea3';

  const ALL_TEST_WALLETS = [SEED_WALLET, OTHER_ACADEMY_WALLET, STUDENT_WALLET, PROFESSOR_WALLET].map(w => ethers.getAddress(w).toLowerCase());
  const ALL_TEST_EMAILS = [SEED_ACADEMY_EMAIL, 'student.credential.revoke@credential.test'];

  const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456ab9';
  const FAKE_TX = { hash: FAKE_TX_HASH, wait: async () => ({ hash: FAKE_TX_HASH }) };

  let ACADEMY_ID;
  let ACADEMY_TOKEN;

  const issueAccessToken = (payload = {}) => signTokens(
    { sub: ethers.getAddress(payload.sub || SEED_WALLET), role: payload.role || 'academy', ...payload },
    undefined,
    true,
  ).accessToken;

  const seedAcademy = async (email = SEED_ACADEMY_EMAIL, wallet = SEED_WALLET, number = 'ACD_CRD_R_0001') => {
    const shortName = ('SCR' + number.slice(-4)).toUpperCase();
    const { rows: [academy] } = await db.query(
      `INSERT INTO academies (academy_number, name, short_name, type, email, legal_name, registration_number, tax_id)
       VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [number, 'Seed Revoke Academy ' + number, shortName, email, 'Seed Revoke A.S. ' + number, 'REG-' + number, 'TAX-' + number]
    );

    await db.query(
      `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
       VALUES ($1, $2, $3, 'academy', NOW())
       ON CONFLICT (wallet_address) DO UPDATE SET issued_at = NOW(), revoked_at = NULL, academy_id = EXCLUDED.academy_id`,
      [academy.id, ethers.getAddress(wallet), '0x04pub' + wallet.slice(2).padEnd(120, '0')]
    );

    await db.query(
      `INSERT INTO departments (academy_id, code, name, faculty, total_years)
       VALUES ($1, $2, $3, $4, 4)
       ON CONFLICT (academy_id, code) DO NOTHING`,
      [academy.id, 'DEPT-R-' + number.slice(-4), 'Department ' + number.slice(-4), 'Faculty ' + number.slice(-4)]
    );

    return academy.id;
  };

  const seedStudent = async (academyId, wallet = STUDENT_WALLET) => {
    const email = 'student.credential.revoke@credential.test';
    const { rows: [user] } = await db.query(
      `INSERT INTO users (first_name, last_name, full_name, email, date_of_birth, gender, national_id, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['Cred', 'Student', 'Cred Student Revoke', email, '2000-01-01', 'female', 'NID-CRD-R-001', 'Turkish']
    );

    await db.query(
      `INSERT INTO students (user_id, academy_id, department_id, student_number, enrollment_status, enrollment_date, expected_graduation_date)
       VALUES ($1, $2, (SELECT id FROM departments WHERE academy_id = $2 LIMIT 1), $3, 'active', '2022-09-15', '2026-06-30')
       ON CONFLICT (user_id) DO UPDATE SET academy_id = EXCLUDED.academy_id`,
      [user.id, academyId, 'STU-CRD-R-001']
    );

    await db.query(
      `INSERT INTO identities (user_id, wallet_address, public_key, role, issued_at)
       VALUES ($1, $2, $3, 'student', NOW())
       ON CONFLICT (wallet_address) DO UPDATE SET issued_at = NOW(), revoked_at = NULL, user_id = EXCLUDED.user_id`,
      [user.id, ethers.getAddress(wallet), '0x04studpub' + 'b'.repeat(120)]
    );

    return user.id;
  };

  const seedCredentialIssued = async ({
    authorizerWallet = SEED_WALLET,
    studentWallet = STUDENT_WALLET,
    isIssued = true,
    revokedAt = null,
  } = {}) => {
    const credentialCode = 'CRD_R_' + Date.now();
    const payload = { certificate_name: 'Revoke Test', certificate_code: 'REV-1', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'Revoker' };

    const { rows: [credential] } = await db.query(
      `INSERT INTO credentials (
          title,
          code,
          type,
          description,
          authorizer_wallet_address,
          issuer_wallet_address,
          student_wallet_address,
          credential_index,
          issue_tx_hash,
          revoked_at,
          payload,
          payload_hash
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, code`,
      [
        'Revocation Credential',
        credentialCode,
        'certificate',
        'Revocation testing',
        ethers.getAddress(authorizerWallet),
        ethers.getAddress(authorizerWallet),
        ethers.getAddress(studentWallet),
        1,
        isIssued ? '0x' + '1'.repeat(64) : null,
        revokedAt,
        payload,
        '0x' + 'a'.repeat(64),
      ]
    );

    return credential;
  };

  const makeApp = async (overrides = {}) => {
    const defaultMocks = {
      '../../src/blockchain/credential.blockchain.js': { revokeCredential: async () => FAKE_TX },
      '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
      '../../src/config/db.js': db,
    };

    const merged = { ...defaultMocks, ...overrides };
    const { default: app } = await esmock('../../src/app.js', import.meta.url, {}, merged);
    return app;
  };

  const cleanup = async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_R_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE 'CRD_R_%'`);

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
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_R_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE 'CRD_R_%'`);

    await db.query(`UPDATE identities SET issued_at = NOW(), revoked_at = NULL WHERE LOWER(wallet_address) = ANY($1)`, [ALL_TEST_WALLETS]);
    await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM students WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`DELETE FROM professors WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`DELETE FROM users WHERE email = ANY($1)`, [ALL_TEST_EMAILS]);

    await db.query(`DELETE FROM departments WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`INSERT INTO departments (academy_id, code, name, faculty, total_years) VALUES ($1,'CENG','Computer Engineering','Engineering',4)`, [ACADEMY_ID]);
  });

  afterEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_R_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE 'CRD_R_%'`);
    sinon.restore();
  });

  after(async () => {
    await cleanup();
  });

  it('returns 200 and blockchain tx hash on valid revoke', async () => {
    await seedStudent(ACADEMY_ID);
    const { id: credentialId } = await seedCredentialIssued();
    const app = await makeApp();

    const res = await request(app)
      .delete(`/api/credentials/${credentialId}/revoke`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ reason: 'Administrative revocation' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.blockchain_transaction.tx_hash, FAKE_TX_HASH);
  });

  it('returns 403 for professor or student roles', async () => {
    await seedStudent(ACADEMY_ID);
    const { id: credentialId } = await seedCredentialIssued();
    const app = await makeApp();

    const profToken = issueAccessToken({ sub: PROFESSOR_WALLET, role: 'professor' });
    const studentToken = issueAccessToken({ sub: STUDENT_WALLET, role: 'student' });

    const profRes = await request(app)
      .delete(`/api/credentials/${credentialId}/revoke`)
      .set('Authorization', `Bearer ${profToken}`)
      .send({ reason: 'Unauthorized' });

    const studentRes = await request(app)
      .delete(`/api/credentials/${credentialId}/revoke`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ reason: 'Unauthorized' });

    assert.equal(profRes.status, 403);
    assert.equal(studentRes.status, 403);
  });

  it('returns 403 when academy wallet does not match authorizer', async () => {
    await seedStudent(ACADEMY_ID);
    await seedAcademy('other.revoke@seed.internal', OTHER_ACADEMY_WALLET, 'ACD_CRD_R_0002');
    const { id: credentialId } = await seedCredentialIssued({ authorizerWallet: OTHER_ACADEMY_WALLET });
    const app = await makeApp();

    const res = await request(app)
      .delete(`/api/credentials/${credentialId}/revoke`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ reason: 'Mismatch' });

    assert.equal(res.status, 403);
  });

  it('returns 422 when reason is missing or too long', async () => {
    await seedStudent(ACADEMY_ID);
    const { id: credentialId } = await seedCredentialIssued();
    const app = await makeApp();

    const missingRes = await request(app)
      .delete(`/api/credentials/${credentialId}/revoke`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({});

    const longRes = await request(app)
      .delete(`/api/credentials/${credentialId}/revoke`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ reason: 'x'.repeat(501) });

    assert.equal(missingRes.status, 422);
    assert.equal(longRes.status, 422);
  });

  it('returns 404 for missing, non-issued, or inactive student identity', async () => {
    await seedStudent(ACADEMY_ID);
    const app = await makeApp();

    const missingRes = await request(app)
      .delete('/api/credentials/00000000-0000-0000-0000-000000000001/revoke')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ reason: 'Not found' });

    const { id: notIssuedId } = await seedCredentialIssued({ isIssued: false });
    const notIssuedRes = await request(app)
      .delete(`/api/credentials/${notIssuedId}/revoke`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ reason: 'Not issued' });

    const { id: inactiveStudentId } = await seedCredentialIssued();
    await db.query(`UPDATE identities SET revoked_at = NOW() WHERE wallet_address = $1`, [ethers.getAddress(STUDENT_WALLET)]);
    const inactiveRes = await request(app)
      .delete(`/api/credentials/${inactiveStudentId}/revoke`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ reason: 'Inactive student' });

    assert.equal(missingRes.status, 404);
    assert.equal(notIssuedRes.status, 404);
    assert.equal(inactiveRes.status, 404);
  });

  it('returns 502 when blockchain revoke fails', async () => {
    await seedStudent(ACADEMY_ID);
    const { id: credentialId } = await seedCredentialIssued();
    const app = await makeApp({
      '../../src/blockchain/credential.blockchain.js': {
        revokeCredential: async () => {
          const err = new Error('fail');
          err.statusCode = 502;
          err.code = 'BLOCKCHAIN_ERROR';
          throw err;
        }
      }
    });

    const res = await request(app)
      .delete(`/api/credentials/${credentialId}/revoke`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ reason: 'Chain error' });

    assert.equal(res.status, 502);
  });
});
