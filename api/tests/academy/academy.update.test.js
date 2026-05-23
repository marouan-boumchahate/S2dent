import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import crypto from 'crypto';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const endpoint = '/api/academies';
const TEST_EMAIL_LIKE = '%@academy-update.test';

const randomHex = (size) => crypto.randomBytes(size).toString('hex');
const buildWalletAddress = () => `0x${randomHex(20)}`;
const buildPublicKey = () => `0x04${randomHex(64)}`;

let identityColumnCache = null;

const getIdentityColumns = async () => {
  if (identityColumnCache) return identityColumnCache;

  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'identities'`,
  );

  identityColumnCache = new Set(rows.map((row) => row.column_name));
  return identityColumnCache;
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
  name = 'Update Academy',
  shortName = 'UAC',
  email = null,
  description = 'Seed description',
  website = 'https://seed.academy.test',
  logoUrl = 'https://seed.academy.test/logo.png',
  phone = '+905550000000',
} = {}) => {
  const { rows: [{ nextval }] } = await db.query(
    `SELECT nextval('academy_seq')`,
  );

  const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`;
  const academyEmail = email || `academy-${nextval}@academy-update.test`;
  const legalName = `${name} Legal ${nextval}`;
  const registrationNumber = `REG-${nextval}`;
  const taxId = `TAX-${nextval}`;

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       email, legal_name, registration_number, tax_id,
       description, website, logo_url, phone
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, email, description, website, logo_url, phone`,
    [
      academyNumber,
      name,
      shortName,
      academyEmail,
      legalName,
      registrationNumber,
      taxId,
      description,
      website,
      logoUrl,
      phone,
    ],
  );

  const walletAddress = buildWalletAddress();
  const publicKey = buildPublicKey();

  const identityColumns = await getIdentityColumns();
  const columns = ['academy_id', 'wallet_address', 'public_key', 'role', 'issued_at'];
  const values = [academy.id, walletAddress, publicKey, 'academy', new Date()];

  if (identityColumns.has('revoke_at')) {
    columns.push('revoke_at');
    values.push(null);
  }

  if (identityColumns.has('revoked_at')) {
    columns.push('revoked_at');
    values.push(null);
  }

  const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

  await db.query(
    `INSERT INTO identities (${columns.join(', ')})
     VALUES (${placeholders})`,
    values,
  );

  return { academy, walletAddress };
};

const fetchAcademyFields = async (academyId) => {
  const { rows: [academy] } = await db.query(
    `SELECT description, website, logo_url, phone
     FROM academies
     WHERE id = $1`,
    [academyId],
  );

  return academy;
};

describe('PUT /api/academies/:id', () => {
  let seededAcademy;

  beforeEach(async () => {
    await cleanupDB();
    const seed = await seedAcademy();
    seededAcademy = seed.academy;
  });

  afterEach(async () => {
    sinon.restore();
    await cleanupDB();
  });

  it('should update all permitted fields', async () => {
    const body = {
      description: 'Updated description',
      logo_url: 'https://updated.academy.test/logo.png',
      phone: '+905551112233',
      website: 'https://updated.academy.test',
    };

    const res = await request(app)
      .put(`${endpoint}/${seededAcademy.id}`)
      .send(body);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { academy } = res.body.data;
    assert.equal(academy.description, body.description);
    assert.equal(academy.logo_url, body.logo_url);
    assert.equal(academy.phone, body.phone);
    assert.equal(academy.website, body.website);

    const dbAcademy = await fetchAcademyFields(seededAcademy.id);
    assert.equal(dbAcademy.description, body.description);
    assert.equal(dbAcademy.logo_url, body.logo_url);
    assert.equal(dbAcademy.phone, body.phone);
    assert.equal(dbAcademy.website, body.website);
  });

  it('should preserve unchanged fields on partial update', async () => {
    const initial = await fetchAcademyFields(seededAcademy.id);

    const res = await request(app)
      .put(`${endpoint}/${seededAcademy.id}`)
      .send({ phone: '+905551234567' });

    assert.equal(res.status, 200);

    const dbAcademy = await fetchAcademyFields(seededAcademy.id);
    assert.equal(dbAcademy.phone, '+905551234567');
    assert.equal(dbAcademy.description, initial.description);
    assert.equal(dbAcademy.website, initial.website);
    assert.equal(dbAcademy.logo_url, initial.logo_url);
  });

  it('should return 404 for revoked academy', async () => {
    const identityColumns = await getIdentityColumns();

    if (identityColumns.has('revoke_at')) {
      await db.query(
        `UPDATE identities
         SET revoke_at = $1
         WHERE academy_id = $2`,
        [new Date('2022-01-01T00:00:00Z'), seededAcademy.id],
      );
    } else if (identityColumns.has('revoked_at')) {
      await db.query(
        `UPDATE identities
         SET revoked_at = $1
         WHERE academy_id = $2`,
        [new Date('2022-01-01T00:00:00Z'), seededAcademy.id],
      );
    }

    const res = await request(app)
      .put(`${endpoint}/${seededAcademy.id}`)
      .send({ phone: '+905551112233' });

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
  });

  it('should return 422 for invalid URL fields', async () => {
    const res = await request(app)
      .put(`${endpoint}/${seededAcademy.id}`)
      .send({ website: 'not-a-url' });

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');

    const dbAcademy = await fetchAcademyFields(seededAcademy.id);
    assert.equal(dbAcademy.website, seededAcademy.website);
  });
});
