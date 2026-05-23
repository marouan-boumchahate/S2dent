import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import crypto from 'crypto';
import db from '../../src/config/db.js';

const endpoint = '/api/academies';
const TEST_EMAIL_LIKE = '%@academy-getbyid.test';

const DEFAULT_BLOCKCHAIN_IDENTITY = {
  identity: {
    name: 'GetById Academy',
    shortName: 'GBA',
    academyType: 'university',
  },
  proofs: {
    legalName: 'GetById Academy Legal',
    registrationNumber: 'REG-GETBYID',
    taxId: 'TAX-GETBYID',
    billingEmail: 'billing@getbyid.test',
  },
  cert: {
    fingerprint: '0xgetbyidfingerprint',
    certificate: 'CERT_PEM',
    chain: 'CHAIN_PEM',
    issuedAt: '2024-01-01T00:00:00.000Z',
    expiresAt: '2025-01-01T00:00:00.000Z',
  },
  status: {
    issuer: '0xissuer',
    issuedAt: '2024-01-02T00:00:00.000Z',
    isRevoked: false,
    revokedAt: null,
    revoker: null,
    revokeReason: null,
  },
};

const randomHex = (size) => crypto.randomBytes(size).toString('hex');
const buildWalletAddress = () => `0x${randomHex(20)}`;
const buildPublicKey = () => `0x04${randomHex(64)}`;

const makeApp = async (blockchainImpl = {}) => {
  const { default: app } = await esmock.strict(
    '../../src/app.js',
    import.meta.url,
    {},
    {
      '../../src/blockchain/identity/academy.identity.blockchain.js': {
        getAcademyIdentity: async () => DEFAULT_BLOCKCHAIN_IDENTITY,
        issueAcademyIdentity: async () => ({ hash: '0xtest' }),
        revokeAcademyIdentity: async () => ({ hash: '0xtest' }),
        ...blockchainImpl,
      },
    },
  );

  return app;
};

const cleanupDB = async () => {
  await db.query(
    `DELETE FROM identities
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email LIKE $1
     )`,
    [TEST_EMAIL_LIKE],
  );

  await db.query(
    `DELETE FROM academies WHERE email LIKE $1`,
    [TEST_EMAIL_LIKE],
  );
};

const seedAcademy = async ({
  name = 'GetById Academy',
  shortName = 'GBA',
  email = null,
  withIdentity = true,
} = {}) => {
  const { rows: [{ nextval }] } = await db.query(
    `SELECT nextval('academy_seq')`,
  );

  const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`;
  const academyEmail = email || `getbyid-${nextval}@academy-getbyid.test`;
  const legalName = `${name} Legal ${nextval}`;
  const registrationNumber = `REG-${nextval}`;
  const taxId = `TAX-${nextval}`;

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     RETURNING id, email, academy_number`,
    [academyNumber, name, shortName, academyEmail, legalName, registrationNumber, taxId],
  );

  if (!withIdentity) {
    return { academy, legalName, registrationNumber, taxId };
  }

  const walletAddress = buildWalletAddress();
  const publicKey = buildPublicKey();

  await db.query(
    `INSERT INTO identities (
       academy_id, wallet_address, public_key,
       role, issued_at
     )
     VALUES ($1, $2, $3, 'academy', NOW())`,
    [academy.id, walletAddress, publicKey],
  );

  return { academy, walletAddress, legalName, registrationNumber, taxId };
};

describe('GET /api/academies/:id', () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  afterEach(async () => {
    sinon.restore();
    await cleanupDB();
  });

  it('should return 200 with full academy detail', async () => {
    const { academy, legalName, registrationNumber, taxId } = await seedAcademy({
      name: 'GetById Academy Full',
      shortName: 'GBF',
    });

    const app = await makeApp({
      getAcademyIdentity: async () => ({
        ...DEFAULT_BLOCKCHAIN_IDENTITY,
        identity: {
          name: 'GetById Academy Full',
          shortName: 'GBF',
          academyType: 'university',
        },
      }),
    });

    const res = await request(app).get(`${endpoint}/${academy.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { academy: detail } = res.body.data;
    assert.ok(detail.id);
    assert.ok(detail.serial_number);
    assert.equal(detail.id, academy.id);
    assert.equal(detail.serial_number, academy.academy_number);
    assert.equal(detail.name, 'GetById Academy Full');
    assert.equal(detail.short_name, 'GBF');
    assert.equal(detail.type, 'university');
    assert.equal(detail.email, academy.email);
    assert.equal(detail.description, null);
    assert.equal(detail.website, null);
    assert.equal(detail.logo_url, null);
    assert.equal(detail.phone, null);
    assert.equal(detail.legal_name, legalName);
    assert.equal(detail.registration_number, registrationNumber);
    assert.equal(detail.tax_id, taxId);
    assert.equal(detail.billing_email, null);
  });

  it('should return 404 ACADEMY_NOT_FOUND for unknown id', async () => {
    const app = await makeApp();

    const res = await request(app)
      .get(`${endpoint}/00000000-0000-0000-0000-000000000001`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
  });

  it('should return 404 when academy has no identity record', async () => {
    const { academy } = await seedAcademy({ withIdentity: false });
    const app = await makeApp();

    const res = await request(app)
      .get(`${endpoint}/${academy.id}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
  });

  it('should merge blockchain data correctly', async () => {
    const { academy, legalName, registrationNumber, taxId } = await seedAcademy({
      name: 'GetById Academy Merge',
      shortName: 'GBM',
    });

    const fingerprint = '0xmergefingerprint';

    const app = await makeApp({
      getAcademyIdentity: async () => ({
        ...DEFAULT_BLOCKCHAIN_IDENTITY,
        cert: {
          ...DEFAULT_BLOCKCHAIN_IDENTITY.cert,
          fingerprint,
        },
        status: {
          ...DEFAULT_BLOCKCHAIN_IDENTITY.status,
          isRevoked: true,
        },
      }),
    });

    const res = await request(app).get(`${endpoint}/${academy.id}`);

    assert.equal(res.status, 200);

    const { academy: detail } = res.body.data;
    assert.equal(detail.serial_number, academy.academy_number);
    assert.equal(detail.name, 'GetById Academy Merge');
    assert.equal(detail.short_name, 'GBM');
    assert.equal(detail.legal_name, legalName);
    assert.equal(detail.registration_number, registrationNumber);
    assert.equal(detail.tax_id, taxId);
    assert.equal(detail.email, academy.email);
  });
});
