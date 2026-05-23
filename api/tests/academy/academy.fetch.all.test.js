import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import crypto from 'crypto';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/academies';
const TEST_EMAIL_LIKE = '%@academy-getall.test';
const TEST_MARKER = 'academy_getall';

const randomHex = (size) => crypto.randomBytes(size).toString('hex');
const buildWalletAddress = () => `0x${randomHex(20)}`;
const buildTxHash = () => `0x${randomHex(32)}`;
const buildPublicKey = () => `0x04${randomHex(64)}`;

const cleanupDB = async () => {
  await db.query(
    `DELETE FROM identities
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email LIKE $1
     )`,
    [TEST_EMAIL_LIKE],
  );

  await db.query(
    `DELETE FROM pending_transactions
     WHERE payload->>'test_marker' = $1`,
    [TEST_MARKER],
  );

  await db.query(
    `DELETE FROM academies
     WHERE email LIKE $1`,
    [TEST_EMAIL_LIKE],
  );
};

const seedAcademy = async ({
  name,
  shortName,
  email,
  withIdentity = true,
} = {}) => {
  const { rows: [{ nextval }] } = await db.query(
    `SELECT nextval('academy_seq')`,
  );

  const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`;
  const academyEmail = email || `getall-academy-${nextval}@academy-getall.test`;
  const legalName = `${name} Legal ${nextval}`;
  const registrationNumber = `REG-${nextval}`;
  const taxId = `TAX-${nextval}`;

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     RETURNING id, name, email`,
    [academyNumber, name, shortName, academyEmail, legalName, registrationNumber, taxId],
  );

  if (!withIdentity) {
    return { academy };
  }

  const walletAddress = buildWalletAddress();
  const publicKey = buildPublicKey();
  const txHash = buildTxHash();

  await db.query(
    `INSERT INTO pending_transactions (tx_hash, payload, status)
     VALUES ($1, $2, $3)`,
    [txHash, { action: 'academy_identity_issue', test_marker: TEST_MARKER }, 'pending'],
  );

  await db.query(
    `INSERT INTO identities (
       academy_id, wallet_address, public_key,
       role, issue_identity_tx_hash, issued_at
     )
     VALUES ($1, $2, $3, 'academy', $4, NOW())`,
    [academy.id, walletAddress, publicKey, txHash],
  );

  return { academy, walletAddress, txHash };
};

describe('GET /api/academies', () => {
  beforeEach(async () => {
    await cleanupDB();
  });

  afterEach(async () => {
    sinon.restore();
    await cleanupDB();
  });

  it('should return 200 with array of academies', async () => {
    await seedAcademy({
      name: 'GetAll Academy Alpha',
      shortName: 'GAA',
    });
    await seedAcademy({
      name: 'GetAll Academy Beta',
      shortName: 'GAB',
    });

    const res = await request(app).get(endpoint);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.academies));
    assert.ok(res.body.data.academies.length >= 2);

    for (const academy of res.body.data.academies) {
      assert.ok(academy.id);
      assert.ok(academy.name);
      assert.ok(academy.email);
    }
  });

  it('should return 200 with empty array when no academies exist', async () => {
    const res = await request(app).get(endpoint);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.academies));
    assert.equal(res.body.data.academies.length, 0);
  });

  it('should exclude academies without identity records', async () => {
    const { academy: withIdentity } = await seedAcademy({
      name: 'GetAll Academy With Identity',
      shortName: 'GAI',
    });

    const { academy: withoutIdentity } = await seedAcademy({
      name: 'GetAll Academy Without Identity',
      shortName: 'GAW',
      withIdentity: false,
    });

    const res = await request(app).get(endpoint);

    assert.equal(res.status, 200);
    const academies = res.body.data.academies;
    assert.ok(Array.isArray(academies));

    const ids = academies.map((academy) => academy.id);
    assert.ok(ids.includes(withIdentity.id));
    assert.ok(!ids.includes(withoutIdentity.id));
  });

  it('should return academies sorted by name DESC', async () => {
    await seedAcademy({ name: 'Zeta Academy', shortName: 'ZTA' });
    await seedAcademy({ name: 'Alpha Academy', shortName: 'ALP' });
    await seedAcademy({ name: 'Omega Academy', shortName: 'OMG' });

    const res = await request(app).get(endpoint);

    assert.equal(res.status, 200);
    const academies = res.body.data.academies;
    assert.ok(Array.isArray(academies));
    assert.equal(academies.length, 3);

    const names = academies.map((academy) => academy.name);
    assert.deepEqual(names, ['Zeta Academy', 'Omega Academy', 'Alpha Academy']);
  });
});
