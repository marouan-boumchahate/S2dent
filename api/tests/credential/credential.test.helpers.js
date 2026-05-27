import crypto from 'crypto';
import esmock from 'esmock';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { env } from '../../src/config/env.js';
import { hash } from '../../src/utils/crypto.js';
import { signTokens } from '../../src/utils/jwt.js';

const ACADEMY_SIGNER = ethers.Wallet.createRandom();
const STUDENT_SIGNER = ethers.Wallet.createRandom();
const SECOND_STUDENT_SIGNER = ethers.Wallet.createRandom();

const uniqueSuffix = () => crypto.randomBytes(6).toString('hex');

const issueAccessToken = (payload = {}, options) => signTokens(
  { sub: ethers.getAddress(payload.sub || ACADEMY_SIGNER.address), role: payload.role || 'academy', ...payload },
  options,
  true,
).accessToken;

const getPayloadHash = (payload) => hash(JSON.stringify(payload, Object.keys(payload).sort()));

const buildSigningData = ({
  credentialId,
  title,
  code,
  type,
  academyAddress,
  academyName,
  issuerAddress,
  studentAddress,
  studentName,
  payloadHash,
}) => ({
  domain: {
    name: 'S2dent',
    version: '1',
    chainId: Number(env.blockchain.chainId || 31337),
    verifyingContract: env.blockchain.deployedContractAddress,
  },
  types: {
    Credential: [
      { name: 'credentialIdHash', type: 'bytes32' },
      { name: 'title', type: 'string' },
      { name: 'code', type: 'string' },
      { name: 'credentialType', type: 'string' },
      { name: 'authorizerWalletAddress', type: 'address' },
      { name: 'authorizerName', type: 'string' },
      { name: 'issuerWalletAddress', type: 'address' },
      { name: 'studentWalletAddress', type: 'address' },
      { name: 'studentName', type: 'string' },
      { name: 'payloadHash', type: 'bytes32' },
    ],
  },
  message: {
    credentialIdHash: hash(credentialId),
    title,
    code,
    credentialType: type,
    authorizerWalletAddress: ethers.getAddress(academyAddress),
    authorizerName: academyName,
    issuerWalletAddress: ethers.getAddress(issuerAddress),
    studentWalletAddress: ethers.getAddress(studentAddress),
    studentName,
    payloadHash,
  },
});

const signStudentSignature = async (details, signer = STUDENT_SIGNER) => {
  const { domain, types, message } = buildSigningData(details);
  return signer.signTypedData(domain, types, message);
};

const buildBlockchainCredential = async ({
  credentialId,
  title,
  code,
  type,
  academyName,
  issuerAddress = ACADEMY_SIGNER.address,
  studentAddress,
  studentName,
  payloadHash,
  encryptedPayload = 'encrypted-payload',
  statusOverrides = {},
  signer = ACADEMY_SIGNER,
}) => {
  const { domain, types, message } = buildSigningData({
    credentialId,
    title,
    code,
    type,
    academyAddress: issuerAddress,
    academyName,
    issuerAddress,
    studentAddress,
    studentName,
    payloadHash,
  });
  const signature = await signer.signTypedData(domain, types, message);

  return {
    identity: {
      academyName,
    },
    payload: {
      payloadHash,
      encryptedPayload,
    },
    signature,
    status: {
      issuedAt: new Date('2024-01-01'),
      revokedAt: null,
      academyAddress: ethers.getAddress(issuerAddress),
      issuerAddress: ethers.getAddress(issuerAddress),
      revocationReason: null,
      ...statusOverrides,
    },
  };
};

const seedAcademy = async ({
  email = `academy-${uniqueSuffix()}@credential.test`,
  wallet = ACADEMY_SIGNER.address,
  academyNumber = `ACD_CRD_V_${uniqueSuffix().slice(0, 8).toUpperCase()}`,
  name = 'Credential Verification Academy',
} = {}) => {
  const shortName = `CVA${academyNumber.slice(-4)}`.toUpperCase();
  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
        academy_number, name, short_name, type, email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [academyNumber, name, shortName, email, `${name} Legal`, `REG-${academyNumber}`, `TAX-${academyNumber}`],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
     VALUES ($1, $2, $3, 'academy', NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET issued_at = NOW(), revoked_at = NULL, academy_id = EXCLUDED.academy_id`,
    [academy.id, ethers.getAddress(wallet), `0x04acadpub${wallet.slice(2, 10).padEnd(120, '0')}`],
  );

  await db.query(
    `INSERT INTO departments (academy_id, code, name, faculty, total_years)
     VALUES ($1, 'CS', 'Computer Science', 'Engineering', 4)
     ON CONFLICT (academy_id, code) DO NOTHING`,
    [academy.id],
  );

  return academy;
};

const seedStudent = async (academyId, {
  wallet = STUDENT_SIGNER.address,
  email = `student-${uniqueSuffix()}@credential.test`,
  firstName = 'Student',
  lastName = 'Credential',
  fullName = 'Student Credential',
  enrollmentStatus = 'active',
} = {}) => {
  const { rows: [user] } = await db.query(
    `INSERT INTO users (first_name, last_name, full_name, email, date_of_birth, gender, national_id, nationality)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    [firstName, lastName, fullName, email, '2000-01-01', 'female', `NID-${uniqueSuffix()}`, 'Turkish'],
  );

  await db.query(
    `INSERT INTO students (
        user_id, academy_id, department_id, student_number, enrollment_status, enrollment_date, expected_graduation_date
     )
     VALUES ($1, $2, (SELECT id FROM departments WHERE academy_id = $2 LIMIT 1), $3, $4, '2022-09-15', '2026-06-30')
     ON CONFLICT (user_id) DO UPDATE SET academy_id = EXCLUDED.academy_id, enrollment_status = EXCLUDED.enrollment_status`,
    [user.id, academyId, `STU-${uniqueSuffix()}`, enrollmentStatus],
  );

  await db.query(
    `INSERT INTO identities (user_id, wallet_address, public_key, role, issued_at)
     VALUES ($1, $2, $3, 'student', NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET issued_at = NOW(), revoked_at = NULL, user_id = EXCLUDED.user_id`,
    [user.id, ethers.getAddress(wallet), `0x04studpub${wallet.slice(2, 10).padEnd(120, '0')}`],
  );

  return { userId: user.id, fullName };
};

const seedCredential = async ({
  title,
  code,
  type = 'certificate',
  authorizerWallet,
  issuerWallet,
  studentWallet,
  payload,
  payloadHash = getPayloadHash(payload),
  credentialIndex = 1,
  issueTxHash = `0x${'1'.repeat(64)}`,
  issuedAt = new Date('2024-01-01'),
  revokedAt = null,
} = {}) => {
  const { rows: [credential] } = await db.query(
    `INSERT INTO credentials (
        title, code, type, description,
        authorizer_wallet_address, issuer_wallet_address, student_wallet_address,
        credential_index, issue_tx_hash, issued_at, revoked_at,
        payload, payload_hash
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      title,
      code,
      type,
      'Seeded credential',
      ethers.getAddress(authorizerWallet),
      ethers.getAddress(issuerWallet),
      ethers.getAddress(studentWallet),
      credentialIndex,
      issueTxHash,
      issuedAt,
      revokedAt,
      payload,
      payloadHash,
    ],
  );

  return { id: credential.id, payloadHash };
};

const cleanupCredentialSuite = async ({ codePrefix, emails = [], wallets = [] } = {}) => {
  if (codePrefix) {
    await db.query(`DELETE FROM credentials WHERE code LIKE $1`, [`${codePrefix}%`]);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' LIKE $1`, [`${codePrefix}%`]);
  }

  if (wallets.length > 0) {
    await db.query(`DELETE FROM identities WHERE LOWER(wallet_address) = ANY($1)`, [wallets.map((wallet) => ethers.getAddress(wallet).toLowerCase())]);
  }

  if (emails.length > 0) {
    await db.query(`DELETE FROM professors WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [emails]);
    await db.query(`DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [emails]);
    await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [emails]);
    await db.query(`DELETE FROM departments WHERE academy_id IN (SELECT id FROM academies WHERE email = ANY($1))`, [emails]);
    await db.query(`DELETE FROM academies WHERE email = ANY($1)`, [emails]);
    await db.query(`DELETE FROM users WHERE email = ANY($1)`, [emails]);
  }
};

const makeCredentialApp = async (credentialBlockchain = {}) => {
  const { default: app } = await esmock.strict(
    '../../src/app.js',
    import.meta.url,
    {},
    {
      '../../src/blockchain/credential.blockchain.js': {
        issueCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        revokeCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        getCredential: async () => null,
        ...credentialBlockchain,
      },
      '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
    },
  );

  return app;
};

const makeCredentialService = async (credentialBlockchain = {}) => {
  return esmock.strict(
    '../../src/modules/credential/credential.service.js',
    import.meta.url,
    {},
    {
      '../../src/blockchain/credential.blockchain.js': {
        issueCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        revokeCredential: async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) }),
        getCredential: async () => null,
        ...credentialBlockchain,
      },
      '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
    },
  );
};

export {
  ACADEMY_SIGNER,
  STUDENT_SIGNER,
  SECOND_STUDENT_SIGNER,
  uniqueSuffix,
  issueAccessToken,
  getPayloadHash,
  buildSigningData,
  signStudentSignature,
  buildBlockchainCredential,
  seedAcademy,
  seedStudent,
  seedCredential,
  cleanupCredentialSuite,
  makeCredentialApp,
  makeCredentialService,
};