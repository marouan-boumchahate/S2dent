import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const SEED_ACADEMY_EMAIL = 'seed.prof.update@seed.internal';
const SEED_WALLET = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const SEED_ACADEMY_NUMBER = 'ACD_PROF_UPD_0001';

let ACADEMY_ID;
let DEPARTMENT_ID;
let TUSER_ID;
let PROFESSOR_ID;
let ACADEMY_TOKEN;

const issueAccessToken = (payload = {}) => signTokens(
  { sub: SEED_WALLET.toLowerCase(), role: 'academy', ...payload },
  undefined,
  true,
).accessToken;

let userColumnCache = null;

const getUserColumns = async () => {
  if (userColumnCache) return userColumnCache;

  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`
  );

  userColumnCache = new Set(rows.map((row) => row.column_name));
  return userColumnCache;
};

const seedAcademy = async () => {
  await db.query(
    `DELETE FROM professors
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1
     )`,
    [SEED_ACADEMY_EMAIL],
  );

  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1
     )`,
    [SEED_ACADEMY_EMAIL],
  );

  await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [SEED_WALLET]);
  await db.query(`DELETE FROM academies WHERE email = $1`, [SEED_ACADEMY_EMAIL]);

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     RETURNING id`,
    [
      SEED_ACADEMY_NUMBER,
      'Seed Professor Update University',
      'SPUU',
      SEED_ACADEMY_EMAIL,
      'Seed Professor Update University Legal',
      'REG-PROF-UPD-0001',
      'TAX-PROF-UPD-0001',
    ],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
     VALUES ($1, $2, $3, 'academy', NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET issued_at = NOW(), revoked_at = NULL, academy_id = EXCLUDED.academy_id`,
    [academy.id, SEED_WALLET, '0x04profupd' + 'a'.repeat(121)],
  );

  return academy.id;
};

const seedDepartment = async (academyId) => {
  const { rows: [department] } = await db.query(
    `INSERT INTO departments (academy_id, code, name, faculty, total_years)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [academyId, 'CENG', 'Computer Engineering', 'Engineering', 4],
  );

  return department.id;
};

const seedTUser = async () => {
  const columns = await getUserColumns();
  const now = Date.now();

  const insertCols = [
    'first_name',
    'middle_name',
    'last_name',
    'full_name',
    'date_of_birth',
    'gender',
    'national_id',
    'email',
    'phone',
    'photo_url',
  ];
  const insertVals = [
    'Professor',
    'Update',
    'Cases',
    `Professor Update Cases ${now}`,
    '1980-03-20',
    'male',
    `PROF-UPD-NID-${now}`,
    `prof.${now}@profupdatecases.test`,
    '+905551234567',
    null,
  ];

  if (columns.has('nationality')) {
    insertCols.push('nationality');
    insertVals.push('Turkish');
  }

  if (columns.has('notes')) {
    insertCols.push('notes');
    insertVals.push(null);
  }

  const placeholders = insertVals.map((_, idx) => `$${idx + 1}`).join(', ');

  const { rows: [u] } = await db.query(
    `INSERT INTO users (${insertCols.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertVals,
  );

  return u.id;
};

const formatLocalDateOnly = (isoStringOrDate) => {
  const d = new Date(isoStringOrDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const createProfessorDefaults = {
  title: 'Dr.',
  rank: 'Assoc. Prof',
  hire_date: '2022-09-01',
  employment_type: 'full_time',
  specialization: 'Computer Vision',
  office_location: 'Building A - 301',
  office_hours: 'Mon 10:00-12:00',
  bio: 'Researcher in machine learning.',
};

const validBody = (overrides = {}) => ({
  rank: 'Prof',
  employment_type: 'part_time',
  office_location: 'Building B - 101',
  office_hours: 'Tue 14:00-16:00',
  ...overrides,
});

const createProfessor = async (overrides = {}) => {
  const uniqueId = Math.floor(Math.random() * 10000000);
  const body = {
    user: {
      first_name: `Professor${uniqueId}`,
      middle_name: 'Update',
      last_name: 'Cases',
      date_of_birth: '1980-03-20',
      gender: 'male',
      nationality: 'Turkish',
      national_id: `PROF-UPD-NID-${uniqueId}`,
      email: `prof.${uniqueId}@profupdatecases.com`,
      phone: '+905551234567',
    },
    address: {
      city: 'Istanbul',
      country: 'Turkey',
      street: 'Main St',
      district: 'Kadikoy',
      state: 'Istanbul',
      postal_code: '34000',
    },
    department_id: DEPARTMENT_ID,
    ...createProfessorDefaults,
    ...overrides,
  };

  const res = await request(app)
    .post('/api/professors')
    .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
    .send(body);

  assert.equal(res.status, 201);
  return res.body.data.professor;
};

const cleanupProfessors = async () => {
  await db.query(
    `DELETE FROM identities
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@profupdatecases.test' OR email LIKE '%@profupdatecases.com'
     )`,
  );
  await db.query(
    `DELETE FROM professors
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@profupdatecases.test' OR email LIKE '%@profupdatecases.com'
     )`,
  );
  await db.query(
    `DELETE FROM addresses
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@profupdatecases.test' OR email LIKE '%@profupdatecases.com'
     )`,
  );
  await db.query(`DELETE FROM users WHERE email LIKE '%@profupdatecases.test' OR email LIKE '%@profupdatecases.com'`);
};

const teardownSeed = async () => {
  await db.query(`DELETE FROM professors WHERE academy_id = $1`, [ACADEMY_ID]);
  await db.query(`DELETE FROM departments WHERE academy_id = $1`, [ACADEMY_ID]);
  await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [SEED_WALLET]);
  await db.query(`DELETE FROM academies WHERE id = $1`, [ACADEMY_ID]);
};

describe('PUT /api/professors/:id', () => {
  before(async () => {
    ACADEMY_ID = await seedAcademy();
    DEPARTMENT_ID = await seedDepartment(ACADEMY_ID);
    ACADEMY_TOKEN = issueAccessToken({ uid: ACADEMY_ID, rid: ACADEMY_ID });
  });

  beforeEach(async () => {
    await cleanupProfessors();

    const prof = await createProfessor();
    PROFESSOR_ID = prof.id;

    // Seed identity for professor
    const profPubKey = '0x04' + Date.now().toString(16).slice(-8).padStart(8, '0') + 'a'.repeat(120);
    await db.query(
      `INSERT INTO identities (user_id, wallet_address, public_key, role, issued_at)
       VALUES ($1, $2, $3, 'professor', NOW())`,
      [prof.user_id, '0xpf' + Date.now().toString(16).slice(-8).padStart(8, '0') + 'a'.repeat(30), profPubKey]
    );
  });

  afterEach(async () => {
    sinon.restore();
  });

  after(async () => {
    await cleanupProfessors();
    await teardownSeed();
  });
  it('returns 200 on partial update', async () => {
    const updateBody = { 
      rank: 'Prof',
      employment_type: createProfessorDefaults.employment_type
    };

    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(updateBody);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Professor updated successfully');

    const { professor } = res.body.data;

    assert.equal(professor.rank, updateBody.rank);
    assert.equal(professor.bio, null);
    assert.equal(professor.employment_type, createProfessorDefaults.employment_type);
    assert.equal(professor.office_location, null);
    assert.equal(professor.office_hours, null);
    assert.equal(professor.title, createProfessorDefaults.title);
    assert.equal(professor.specialization, createProfessorDefaults.specialization);
  });

  it('returns 200 on full update', async () => {
    const body = validBody();

    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 200);

    const { professor } = res.body.data;

    assert.equal(professor.rank, body.rank);
    assert.equal(professor.employment_type, body.employment_type);
    assert.equal(professor.office_location, body.office_location);
    assert.equal(professor.office_hours, body.office_hours);
    assert.equal(professor.bio, null);
  });

  it('returns 404 PROFESSOR_NOT_FOUND when professor does not exist', async () => {
    const res = await request(app)
      .put('/api/professors/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody());

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'PROFESSOR_NOT_FOUND');
  });

  it('returns 422 for invalid rank', async () => {
    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ rank: 'Director' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'rank');
    assert.ok(field, 'errors should contain a rank entry');
  });

  it('returns 422 for invalid employment_type', async () => {
    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ employment_type: 'temporary' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'employment_type');
    assert.ok(field, 'errors should contain an employment_type entry');
  });

  it('returns 422 when office_location exceeds max length', async () => {
    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({ office_location: 'A'.repeat(256) }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'office_location');
    assert.ok(field, 'errors should contain an office_location entry');
  });

  it('returns 200 and strips unknown keys', async () => {
    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({
        title: 'Evil',
        specialization: 'Hacked',
        hire_date: '1999-01-01',
      }));

    assert.equal(res.status, 200);

    const { professor } = res.body.data;

    assert.equal(professor.title, createProfessorDefaults.title);
    assert.equal(professor.specialization, createProfessorDefaults.specialization);
    assert.equal(
      formatLocalDateOnly(professor.hire_date),
      createProfessorDefaults.hire_date,
    );
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('returns 500 when the database throws unexpectedly during update', async () => {
    const stub = sinon.stub(db, 'query');
    stub.onFirstCall().resolves({ rows: [{ issued_at: new Date(), revoked_at: null }] });
    stub.onSecondCall().rejects(new Error('DB connection lost'));

    const res = await request(app)
      .put(`/api/professors/${PROFESSOR_ID}`)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody());

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});
