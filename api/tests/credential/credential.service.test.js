import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import { verifyAccessToken } from '../../src/utils/jwt.js';
import db from '../../src/config/db.js';
import {
  ACADEMY_SIGNER,
  STUDENT_SIGNER,
  SECOND_STUDENT_SIGNER,
  getPayloadHash,
  buildBlockchainCredential,
  signStudentSignature,
  seedAcademy,
  seedStudent,
  seedCredential,
  cleanupCredentialSuite,
  makeCredentialService,
} from './credential.test.helpers.js';

describe('credential.service.js verification helpers', function () {
  this.timeout(10000);

  const CODE_PREFIX = 'CRD_SERVICE_';
  const BASE_EMAILS = [
    'academy-service@credential.test',
    'student-service@credential.test',
    'student-service-2@credential.test',
  ];
  const BASE_WALLETS = [ACADEMY_SIGNER.address, STUDENT_SIGNER.address, SECOND_STUDENT_SIGNER.address];

  let academy;
  let student;
  let otherStudent;
  let credentialState;
  let service;

  const payload = {
    certificate_name: 'Service Credential',
    certificate_code: 'SERVICE-101',
    certificate_category: 'professional',
    delivery_mode: 'online',
    start_date: '2024-01-01',
    end_date: '2024-02-01',
    instructor_name: 'Dr. Service',
  };

  const refreshService = async () => {
    service = await makeCredentialService({
      getCredential: async () => buildBlockchainCredential(credentialState),
    });
  };

  before(async () => {
    await cleanupCredentialSuite({ codePrefix: CODE_PREFIX, emails: BASE_EMAILS, wallets: BASE_WALLETS });
    academy = await seedAcademy({
      email: BASE_EMAILS[0],
      wallet: ACADEMY_SIGNER.address,
      academyNumber: 'ACD_CRD_SERVICE_0001',
      name: 'Service Academy',
    });
    student = await seedStudent(academy.id, {
      email: BASE_EMAILS[1],
      wallet: STUDENT_SIGNER.address,
      fullName: 'Service Student One',
      firstName: 'Service',
      lastName: 'Student',
    });
    otherStudent = await seedStudent(academy.id, {
      email: BASE_EMAILS[2],
      wallet: SECOND_STUDENT_SIGNER.address,
      fullName: 'Service Student Two',
      firstName: 'Service',
      lastName: 'Student',
    });
  });

  beforeEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${CODE_PREFIX}%`]);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE $1`, [`${CODE_PREFIX}%`]);
    credentialState = null;
    service = null;
  });

  afterEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${CODE_PREFIX}%`]);
  });

  after(async () => {
    await cleanupCredentialSuite({ codePrefix: CODE_PREFIX, emails: BASE_EMAILS, wallets: BASE_WALLETS });
  });

  const seedServiceCredential = async ({ revokedAt = null, studentWallet = STUDENT_SIGNER.address } = {}) => {
    const credentialCode = `${CODE_PREFIX}${Date.now()}`;
    const title = 'Service Credential';
    const { id: credentialId, payloadHash } = await seedCredential({
      title,
      code: credentialCode,
      type: 'certificate',
      authorizerWallet: ACADEMY_SIGNER.address,
      issuerWallet: ACADEMY_SIGNER.address,
      studentWallet,
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
      academyName: 'Service Academy',
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: studentWallet,
      studentName: studentWallet === STUDENT_SIGNER.address ? student.fullName : otherStudent.fullName,
      payloadHash,
    };

    return { credentialId, credentialCode, payloadHash };
  };

  it('generateVerifierCredentialTokenService signs a verifier token with the requested expiration', async () => {
    const { credentialId } = await seedServiceCredential();
    await refreshService();

    const studentSignature = await signStudentSignature({
      credentialId,
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      academyAddress: ACADEMY_SIGNER.address,
      academyName: credentialState.academyName,
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: credentialState.payloadHash,
    });

    const token = await service.generateVerifierCredentialTokenService({
      credential_id: credentialId,
      student_address: STUDENT_SIGNER.address,
      student_signature: studentSignature,
      expirationTimeInSeconds: 180,
    });

    const decoded = verifyAccessToken(token);
    assert.equal(decoded.role, 'verifier');
    assert.equal(decoded.credential_id, credentialId);
    assert.equal(decoded.student_address, STUDENT_SIGNER.address);
    assert.equal(decoded.student_signature, studentSignature);
    assert.equal(decoded.exp - decoded.iat, 180);
  });

  it('generateVerifierCredentialTokenService surfaces the underlying not found error', async () => {
    await refreshService();

    await assert.rejects(
      () => service.generateVerifierCredentialTokenService({
        credential_id: '00000000-0000-0000-0000-000000000000',
        student_address: STUDENT_SIGNER.address,
        student_signature: `0x${'a'.repeat(130)}`,
        expirationTimeInSeconds: 180,
      }),
      (error) => error.code === 'CREDENTIAL_NOT_FOUND',
    );
  });

  it('fetchCredentialForVerificationService returns the credential with the student signature merged in', async () => {
    const { credentialId } = await seedServiceCredential();
    await refreshService();

    const studentSignature = await signStudentSignature({
      credentialId,
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      academyAddress: ACADEMY_SIGNER.address,
      academyName: credentialState.academyName,
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: credentialState.payloadHash,
    });

    const credential = await service.fetchCredentialForVerificationService({
      credential_id: credentialId,
      student_address: STUDENT_SIGNER.address,
      student_signature: studentSignature,
      role: 'verifier',
    });

    assert.equal(credential.meta.id, credentialId);
    assert.equal(credential.verification.student_signature, studentSignature);
    assert.equal(credential.student.address, STUDENT_SIGNER.address);
  });

  it('fetchCredentialForVerificationService throws INVALID_SIGNATURE for a different signer', async () => {
    const { credentialId } = await seedServiceCredential();
    await refreshService();

    const invalidSignature = await signStudentSignature({
      credentialId,
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      academyAddress: ACADEMY_SIGNER.address,
      academyName: credentialState.academyName,
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: credentialState.payloadHash,
    }, ethers.Wallet.createRandom());

    await assert.rejects(
      () => service.fetchCredentialForVerificationService({
        credential_id: credentialId,
        student_address: STUDENT_SIGNER.address,
        student_signature: invalidSignature,
        role: 'verifier',
      }),
      (error) => error.code === 'INVALID_SIGNATURE',
    );
  });

  it('fetchCredentialForVerificationService throws INVALID_SIGNATURE when the signing data changes', async () => {
    const { credentialId } = await seedServiceCredential();
    await refreshService();

    const studentSignature = await signStudentSignature({
      credentialId,
      title: credentialState.title,
      code: credentialState.code,
      type: credentialState.type,
      academyAddress: ACADEMY_SIGNER.address,
      academyName: credentialState.academyName,
      issuerAddress: ACADEMY_SIGNER.address,
      studentAddress: STUDENT_SIGNER.address,
      studentName: student.fullName,
      payloadHash: credentialState.payloadHash,
    });

    credentialState.title = 'Changed after signing';

    await assert.rejects(
      () => service.fetchCredentialForVerificationService({
        credential_id: credentialId,
        student_address: STUDENT_SIGNER.address,
        student_signature: studentSignature,
        role: 'verifier',
      }),
      (error) => error.code === 'INVALID_SIGNATURE',
    );
  });
});