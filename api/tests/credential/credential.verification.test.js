import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import { verifyAccessToken } from '../../src/utils/jwt.js';
import db from '../../src/config/db.js';
import {
  ACADEMY_SIGNER,
  STUDENT_SIGNER,
  issueAccessToken,
  getPayloadHash,
  buildBlockchainCredential,
  signStudentSignature,
  seedAcademy,
  seedStudent,
  seedCredential,
  cleanupCredentialSuite,
  makeCredentialApp,
} from './credential.test.helpers.js';

describe('GET /api/credentials/verification', function () {
  this.timeout(10000);

  const CODE_PREFIX = 'CRD_VERIFY_';
  const BASE_EMAILS = [
    'academy-verify@credential.test',
    'student-verify@credential.test',
  ];
  const BASE_WALLETS = [ACADEMY_SIGNER.address, STUDENT_SIGNER.address];

  let academy;
  let student;
  let credentialState;
  let tokenApp;

  const payload = {
    certificate_name: 'Verification Credential',
    certificate_code: 'VERIFY-101',
    certificate_category: 'professional',
    delivery_mode: 'online',
    start_date: '2024-01-01',
    end_date: '2024-02-01',
    instructor_name: 'Dr. Verify',
  };

  const refreshApp = async () => {
    tokenApp = await makeCredentialApp({
      getCredential: async () => buildBlockchainCredential(credentialState),
    });
  };

  before(async () => {
    await cleanupCredentialSuite({ codePrefix: CODE_PREFIX, emails: BASE_EMAILS, wallets: BASE_WALLETS });
    academy = await seedAcademy({
      email: BASE_EMAILS[0],
      wallet: ACADEMY_SIGNER.address,
      academyNumber: 'ACD_CRD_VERIFY_0001',
      name: 'Verify Academy',
    });
    student = await seedStudent(academy.id, {
      email: BASE_EMAILS[1],
      wallet: STUDENT_SIGNER.address,
      fullName: 'Verify Student',
      firstName: 'Verify',
      lastName: 'Student',
    });
  });

  beforeEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${CODE_PREFIX}%`]);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE $1`, [`${CODE_PREFIX}%`]);
    credentialState = null;
    tokenApp = null;
  });

  afterEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${CODE_PREFIX}%`]);
  });

  after(async () => {
    await cleanupCredentialSuite({ codePrefix: CODE_PREFIX, emails: BASE_EMAILS, wallets: BASE_WALLETS });
  });

  const seedVerificationCredential = async ({ revokedAt = null } = {}) => {
    const title = 'Verification Credential';
    const credentialCode = `${CODE_PREFIX}${Date.now()}`;
    const { id: credentialId, payloadHash } = await seedCredential({
      title,
      code: credentialCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_SIGNER.address,
      issuerWallet: ACADEMY_SIGNER.address,
      studentWallet: STUDENT_SIGNER.address,
      payload,
      payloadHash: getPayloadHash(payload),
      credentialIndex: 1,
      revokedAt,
    });

    credentialState = {
      credentialId,
      title,
      code: credentialCode,
      type: 'certificate',
      academyName: 'Verify Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
    };

    return { credentialId, credentialCode, payloadHash };
  };

  it('returns the full credential with the student signature', async () => {
    credentialState = {
      title: 'Verification Credential',
      code: `${CODE_PREFIX}${Date.now()}`,
      type: 'certificate',
      academyName: 'Verify Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: getPayloadHash(payload),
    };

    const { id: credentialId } = await seedCredential({
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      authorizerWallet: ACADEMY_SIGNER.address,
      issuerWallet: ACADEMY_SIGNER.address,
      studentWallet: STUDENT_SIGNER.address,
      payload,
      payloadHash: credentialState.payloadHash,
      credentialIndex: 1,
    });

    credentialState.credentialId = credentialId;
    await refreshApp();

    const studentSignature = await signStudentSignature({
      credentialId,
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      academyAddress: ACADEMY_SIGNER.address,
      academyName: 'Verify Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: credentialState.payloadHash,
    });

    const tokenRes = await request(tokenApp)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${issueAccessToken({ sub: STUDENT_SIGNER.address, role: 'student' })}`)
      .send({
        student_address: STUDENT_SIGNER.address,
        student_signature: studentSignature,
      });

    assert.equal(tokenRes.status, 200);

    const verificationRes = await request(tokenApp)
      .get('/api/credentials/verification')
      .set('Authorization', `Bearer ${tokenRes.body.data}`);

    assert.equal(verificationRes.status, 200);
    assert.equal(verificationRes.body.success, true);
    assert.equal(verificationRes.body.data.meta.id, credentialId);
    assert.equal(verificationRes.body.data.verification.student_signature, studentSignature);

    const decoded = verifyAccessToken(tokenRes.body.data);
    assert.equal(decoded.role, 'verifier');
    assert.equal(decoded.credential_id, credentialId);
  });

  it('returns 403 for student and academy roles', async () => {
    const { id: credentialId } = await seedVerificationCredential();
    await refreshApp();

    const studentRoleRes = await request(tokenApp)
      .get('/api/credentials/verification')
      .set('Authorization', `Bearer ${issueAccessToken({ sub: STUDENT_SIGNER.address, role: 'student' })}`);

    const academyRoleRes = await request(tokenApp)
      .get('/api/credentials/verification')
      .set('Authorization', `Bearer ${issueAccessToken({ sub: ACADEMY_SIGNER.address, role: 'academy' })}`);

    assert.equal(studentRoleRes.status, 403);
    assert.equal(academyRoleRes.status, 403);
  });

  it('returns 401 for an expired verifier token', async () => {
    const { credentialId } = await seedVerificationCredential();
    await refreshApp();

    const expiredToken = issueAccessToken(
      {
        credential_id: credentialId,
        student_address: STUDENT_SIGNER.address,
        student_signature: `0x${'a'.repeat(130)}`,
        role: 'verifier',
      },
      { accessExpiresIn: -1 },
    );

    const res = await request(tokenApp)
      .get('/api/credentials/verification')
      .set('Authorization', `Bearer ${expiredToken}`);

    assert.equal(res.status, 401);
  });

  it('returns 401 for a tampered verifier token', async () => {
    const { credentialId } = await seedVerificationCredential();
    await refreshApp();

    const validToken = issueAccessToken({
      credential_id: credentialId,
      student_address: STUDENT_SIGNER.address,
      student_signature: `0x${'a'.repeat(130)}`,
      role: 'verifier',
    });

    const tamperedToken = `${validToken.slice(0, -1)}${validToken.slice(-1) === 'a' ? 'b' : 'a'}`;

    const res = await request(tokenApp)
      .get('/api/credentials/verification')
      .set('Authorization', `Bearer ${tamperedToken}`);

    assert.equal(res.status, 401);
  });

  it('returns 400 INVALID_SIGNATURE when the signing data changes after token generation', async () => {
    const { credentialId } = await seedVerificationCredential();
    await refreshApp();

    const studentSignature = await signStudentSignature({
      credentialId,
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      academyAddress: ACADEMY_SIGNER.address,
      academyName: 'Verify Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: credentialState.payloadHash,
    });

    const tokenRes = await request(tokenApp)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${issueAccessToken({ sub: STUDENT_SIGNER.address, role: 'student' })}`)
      .send({
        student_address: STUDENT_SIGNER.address,
        student_signature: studentSignature,
      });

    assert.equal(tokenRes.status, 200);

    credentialState.title = 'Changed after signing';

    const verificationRes = await request(tokenApp)
      .get('/api/credentials/verification')
      .set('Authorization', `Bearer ${tokenRes.body.data}`);

    assert.equal(verificationRes.status, 400);
    assert.equal(verificationRes.body.code, 'INVALID_SIGNATURE');
  });

  it('returns 500 when the blockchain payload hash does not match the stored payload', async () => {
    const { credentialId } = await seedVerificationCredential();
    await refreshApp();

    const studentSignature = await signStudentSignature({
      credentialId,
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      academyAddress: ACADEMY_SIGNER.address,
      academyName: 'Verify Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: credentialState.payloadHash,
    });

    const tokenRes = await request(tokenApp)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${issueAccessToken({ sub: STUDENT_SIGNER.address, role: 'student' })}`)
      .send({
        student_address: STUDENT_SIGNER.address,
        student_signature: studentSignature,
      });

    assert.equal(tokenRes.status, 200);

    credentialState.payloadHash = `0x${'b'.repeat(64)}`;

    const verificationRes = await request(tokenApp)
      .get('/api/credentials/verification')
      .set('Authorization', `Bearer ${tokenRes.body.data}`);

    assert.equal(verificationRes.status, 500);
    assert.equal(verificationRes.body.code, 'CREDENTIAL_DATA_INTEGRITY_ERROR');
  });
});