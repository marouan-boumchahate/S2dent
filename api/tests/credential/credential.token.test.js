import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import { verifyAccessToken } from '../../src/utils/jwt.js';
import db from '../../src/config/db.js';
import {
  ACADEMY_SIGNER,
  STUDENT_SIGNER,
  SECOND_STUDENT_SIGNER,
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

describe('POST /api/credentials/:id/token', function () {
  this.timeout(10000);

  const CODE_PREFIX = 'CRD_TOKEN_';
  const BASE_EMAILS = [
    `academy-token@credential.test`,
    `student-token@credential.test`,
    `student-token-2@credential.test`,
  ];
  const BASE_WALLETS = [ACADEMY_SIGNER.address, STUDENT_SIGNER.address, SECOND_STUDENT_SIGNER.address];

  let academy;
  let student;
  let otherStudent;
  let studentToken;

  const payload = {
    certificate_name: 'Token Generation',
    certificate_code: 'TOKEN-101',
    certificate_category: 'professional',
    delivery_mode: 'online',
    start_date: '2024-01-01',
    end_date: '2024-02-01',
    instructor_name: 'Dr. Token',
  };

  const seedBaseData = async () => {
    academy = await seedAcademy({
      email: BASE_EMAILS[0],
      wallet: ACADEMY_SIGNER.address,
      academyNumber: 'ACD_CRD_TOKEN_0001',
      name: 'Token Academy',
    });

    student = await seedStudent(academy.id, {
      email: BASE_EMAILS[1],
      wallet: STUDENT_SIGNER.address,
      fullName: 'Token Student One',
      firstName: 'Token',
      lastName: 'Student',
    });

    otherStudent = await seedStudent(academy.id, {
      email: BASE_EMAILS[2],
      wallet: SECOND_STUDENT_SIGNER.address,
      fullName: 'Token Student Two',
      firstName: 'Token',
      lastName: 'Student',
    });

    studentToken = issueAccessToken({ sub: STUDENT_SIGNER.address, role: 'student' });
  };

  before(async () => {
    await cleanupCredentialSuite({ codePrefix: CODE_PREFIX, emails: BASE_EMAILS, wallets: BASE_WALLETS });
    await seedBaseData();
  });

  beforeEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${CODE_PREFIX}%`]);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE $1`, [`${CODE_PREFIX}%`]);
  });

  afterEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${CODE_PREFIX}%`]);
  });

  after(async () => {
    await cleanupCredentialSuite({ codePrefix: CODE_PREFIX, emails: BASE_EMAILS, wallets: BASE_WALLETS });
  });

  it('returns a verifier token for a student-owned credential', async () => {
    const credentialCode = `${CODE_PREFIX}${Date.now()}`;
    const { id: credentialId, payloadHash } = await seedCredential({
      title: 'Token Generation',
      code: credentialCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_SIGNER.address,
      issuerWallet: ACADEMY_SIGNER.address,
      studentWallet: STUDENT_SIGNER.address,
      payload,
      payloadHash: getPayloadHash(payload),
      credentialIndex: 1,
    });

    const blockchainCredential = await buildBlockchainCredential({
      credentialId,
      title: 'Token Generation',
      code: credentialCode,
      type: 'certificate',
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
    });

    const studentSignature = await signStudentSignature({
      credentialId,
      title: 'Token Generation',
      code: credentialCode,
      type: 'certificate',
      academyAddress: ACADEMY_SIGNER.address,
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
    });

    const app = await makeCredentialApp({ getCredential: async () => blockchainCredential });

    const res = await request(app)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        student_address: STUDENT_SIGNER.address,
        student_signature: studentSignature,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data, 'string');

    const decoded = verifyAccessToken(res.body.data);
    assert.equal(decoded.role, 'verifier');
    assert.equal(decoded.credential_id, credentialId);
    assert.equal(decoded.student_address, STUDENT_SIGNER.address);
    assert.equal(decoded.student_signature, studentSignature);
    assert.equal(decoded.exp - decoded.iat, 300);
  });

  it('returns 403 for academy and professor callers', async () => {
    const credentialCode = `${CODE_PREFIX}${Date.now() + 1}`;
    const { id: credentialId, payloadHash } = await seedCredential({
      title: 'Forbidden Token Generation',
      code: credentialCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_SIGNER.address,
      issuerWallet: ACADEMY_SIGNER.address,
      studentWallet: STUDENT_SIGNER.address,
      payload,
      payloadHash: getPayloadHash(payload),
      credentialIndex: 2,
    });

    const blockchainCredential = await buildBlockchainCredential({
      credentialId,
      title: 'Forbidden Token Generation',
      code: credentialCode,
      type: 'certificate',
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
    });

    const studentSignature = await signStudentSignature({
      credentialId,
      title: 'Forbidden Token Generation',
      code: credentialCode,
      type: 'certificate',
      academyAddress: ACADEMY_SIGNER.address,
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
    });

    const app = await makeCredentialApp({ getCredential: async () => blockchainCredential });
    const professorToken = issueAccessToken({ sub: ethers.Wallet.createRandom().address, role: 'professor' });
    const academyToken = issueAccessToken({ sub: ACADEMY_SIGNER.address, role: 'academy' });

    const professorRes = await request(app)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ student_address: STUDENT_SIGNER.address, student_signature: studentSignature });

    const academyRes = await request(app)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${academyToken}`)
      .send({ student_address: STUDENT_SIGNER.address, student_signature: studentSignature });

    assert.equal(professorRes.status, 403);
    assert.equal(academyRes.status, 403);
  });

  it('returns 401 when no access token is provided', async () => {
    const app = await makeCredentialApp();

    const res = await request(app)
      .post('/api/credentials/00000000-0000-0000-0000-000000000000/token')
      .send({
        student_address: STUDENT_SIGNER.address,
        student_signature: '0x' + 'a'.repeat(130),
      });

    assert.equal(res.status, 401);
  });

  it('returns 422 for malformed or missing request body fields', async () => {
    const app = await makeCredentialApp();

    const cases = [
      { student_address: 'not-an-address', student_signature: '0x' + 'a'.repeat(130) },
      { student_address: STUDENT_SIGNER.address, student_signature: '0x1234' },
      { student_signature: '0x' + 'a'.repeat(130) },
      { student_address: STUDENT_SIGNER.address },
      {},
    ];

    for (const body of cases) {
      const res = await request(app)
        .post('/api/credentials/00000000-0000-0000-0000-000000000000/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(body);

      assert.equal(res.status, 422);
      assert.equal(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('returns 404 when the credential belongs to a different student', async () => {
    const credentialCode = `${CODE_PREFIX}${Date.now() + 2}`;
    const { id: credentialId, payloadHash } = await seedCredential({
      title: 'Other Student Token',
      code: credentialCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_SIGNER.address,
      issuerWallet: ACADEMY_SIGNER.address,
      studentWallet: SECOND_STUDENT_SIGNER.address,
      payload,
      payloadHash: getPayloadHash(payload),
      credentialIndex: 3,
    });

    const blockchainCredential = await buildBlockchainCredential({
      credentialId,
      title: 'Other Student Token',
      code: credentialCode,
      type: 'certificate',
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: SECOND_STUDENT_SIGNER.address,
      studentName: otherStudent.fullName,
      payloadHash,
    });

    const studentSignature = await signStudentSignature({
      credentialId,
      title: 'Token Generation',
      code: credentialCode,
      type: 'certificate',
      academyAddress: ACADEMY_SIGNER.address,
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
    });

    const app = await makeCredentialApp({ getCredential: async () => blockchainCredential });

    const res = await request(app)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        student_address: STUDENT_SIGNER.address,
        student_signature: studentSignature,
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CREDENTIAL_NOT_FOUND');
  });

  it('returns 200 for revoked credentials', async () => {
    const credentialCode = `${CODE_PREFIX}${Date.now() + 3}`;
    const { id: credentialId, payloadHash } = await seedCredential({
      title: 'Revoked Token',
      code: credentialCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_SIGNER.address,
      issuerWallet: ACADEMY_SIGNER.address,
      studentWallet: STUDENT_SIGNER.address,
      payload,
      payloadHash: getPayloadHash(payload),
      credentialIndex: 4,
      revokedAt: new Date('2024-04-01'),
    });

    const blockchainCredential = await buildBlockchainCredential({
      credentialId,
      title: 'Revoked Token',
      code: credentialCode,
      type: 'certificate',
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
      statusOverrides: { revokedAt: new Date('2024-04-01') },
    });

    const studentSignature = await signStudentSignature({
      credentialId,
      title: 'Revoked Token',
      code: credentialCode,
      type: 'certificate',
      academyAddress: ACADEMY_SIGNER.address,
      academyName: 'Token Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash,
    });

    const app = await makeCredentialApp({ getCredential: async () => blockchainCredential });

    const res = await request(app)
      .post(`/api/credentials/${credentialId}/token`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        student_address: STUDENT_SIGNER.address,
        student_signature: studentSignature,
      });

    assert.equal(res.status, 200);
    const decoded = verifyAccessToken(res.body.data);
    assert.equal(decoded.credential_id, credentialId);
  });
});