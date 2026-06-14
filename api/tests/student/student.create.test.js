import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const SEED_EMAIL = 'seed.student@seed.internal';
const SEED_WALLET = '0x9999999999999999999999999999999999999999';
const SEED_ACADEMY_NUMBER = 'ACD_STU_0001';

let ACADEMY_ID;
let DEPARTMENT_ID;
let USER_ID;
let ADVISOR_ID;
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
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1 OR academy_number = $2
     )`,
    [SEED_EMAIL, SEED_ACADEMY_NUMBER],
  );

  await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [SEED_WALLET]);
  await db.query(
    `DELETE FROM academies WHERE email = $1 OR academy_number = $2`,
    [SEED_EMAIL, SEED_ACADEMY_NUMBER],
  );

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
      email,
      academy_number,
      name,
      short_name,
      type,
      legal_name,
      registration_number,
      tax_id
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      SEED_EMAIL,
      SEED_ACADEMY_NUMBER,
      'Seed Student Academy',
      'SSA',
      'university',
      'Seed Student Academy A.S.',
      'REG-STU-001',
      'TAX-STU-001',
    ],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
     VALUES ($1, $2, $3, 'academy', NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET issued_at = NOW(), revoked_at = NULL, academy_id = EXCLUDED.academy_id`,
    [academy.id, SEED_WALLET, '0x04stuc0' + 'a'.repeat(123)],
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

const seedUser = async () => {
  const columns = await getUserColumns();

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
    'Student',
    'Cases',
    'Test',
    'Student Cases Test',
    '2004-01-15',
    'male',
    'STU-NID-001',
    'student.001@studentcreate.test',
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

const seedProfessor = async (academyId, departmentId) => {
  const columns = await getUserColumns();

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
    'Advisor',
    'Seed',
    'Professor',
    'Advisor Seed Professor',
    '1980-01-01',
    'female',
    'PROF-NID-001',
    'advisor.seed@studentcreate.test',
    '+905551234568',
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

  const { rows: [professor] } = await db.query(
    `INSERT INTO professors (user_id, academy_id, department_id, employee_number, title, rank, hire_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [u.id, academyId, departmentId, 'EMP-STU-001', 'Dr.', 'Prof', '2012-01-01'],
  );

  await db.query(
    `INSERT INTO identities (user_id, wallet_address, public_key, role, issued_at)
     VALUES ($1, $2, $3, 'professor', NOW())`,
    [u.id, '0x' + 'a'.repeat(40), '0x04' + 'a'.repeat(128)],
  );

  return professor.id;
};

const cleanupStudents = async () => {
  await db.query(
    `DELETE FROM identities
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@studentcreate.test' OR email LIKE '%@studentcreate.com'
     )`,
  );
  await db.query(
   `DELETE FROM professors
    WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@studentcreate.test' OR email LIKE '%@studentcreate.com'
    )`,
  );
  await db.query(
    `DELETE FROM students
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@studentcreate.test' OR email LIKE '%@studentcreate.com'
     )`,
  );
  await db.query(
    `DELETE FROM addresses
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@studentcreate.test' OR email LIKE '%@studentcreate.com'
     )`,
  );
  
  await db.query(`DELETE FROM users WHERE email LIKE '%@studentcreate.test' OR email LIKE '%@studentcreate.com'`);
};

const teardownSeed = async () => {
  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies WHERE email = $1 OR academy_number = $2
     )`,
    [SEED_EMAIL, SEED_ACADEMY_NUMBER],
  );

  await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [SEED_WALLET]);
  await db.query(
    `DELETE FROM academies WHERE email = $1 OR academy_number = $2`,
    [SEED_EMAIL, SEED_ACADEMY_NUMBER],
  );
};

const endpoint = "/api/students"

describe('POST /api/students', () => {
  before(async () => {
    ACADEMY_ID = await seedAcademy();
    DEPARTMENT_ID = await seedDepartment(ACADEMY_ID);
    ACADEMY_TOKEN = issueAccessToken({ uid: ACADEMY_ID, rid: ACADEMY_ID });
  });

  beforeEach(async () => {
    await cleanupStudents();
    USER_ID = await seedUser();
    ADVISOR_ID = await seedProfessor(ACADEMY_ID, DEPARTMENT_ID);
  });

  afterEach(async () => {
    sinon.restore();
  });

  after(async () => {
    await cleanupStudents();
    await teardownSeed();
  });
  const formatLocalDateOnly = (isoStringOrDate) => {
    const d = new Date(isoStringOrDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const validBody = (overrides = {}) => {
    const uniqueId = Math.floor(Math.random() * 10000000);
    return {
      user: {
        first_name: `Student${uniqueId}`,
        middle_name: 'Cases',
        last_name: 'Test',
        date_of_birth: '2004-01-15',
        gender: 'male',
        nationality: 'Turkish',
        national_id: `STU-NID-${uniqueId}`,
        email: `student${uniqueId}@studentcreate.com`,
        phone: '+905551234567',
        ...overrides.user
      },
      address: {
        city: 'Istanbul',
        country: 'Turkey',
        street: 'Main St',
        district: 'Kadikoy',
        state: 'Istanbul',
        postal_code: '34000',
        ...overrides.address
      },
      department_id: DEPARTMENT_ID,
      advisor_id: ADVISOR_ID,
      ...overrides
    };
  };

  it('returns 201 and the student DTO on valid input', async () => {
    const body = validBody({
      actual_graduation_date: '2028-06-30',
    });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Student registered successfully');

    const { student } = res.body.data;

    assert.ok(student.id);
    assert.ok(student.student_number);
    assert.match(student.student_number, /^STU_\d{6}\d+$/);
    assert.equal(student.current_level, 1);
    assert.equal(student.enrollment_status, 'active');

    assert.ok(student.enrollment_date);
    assert.ok(student.expected_graduation_date);
    assert.equal(formatLocalDateOnly(student.actual_graduation_date), body.actual_graduation_date);
  });

  it('accepts enrollment_status and enrollment_date when provided', async () => {
    const body = validBody({
      enrollment_status: 'inactive',
      enrollment_date: '2023-09-15',
    });

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.student.enrollment_status, body.enrollment_status);
    assert.equal(
      formatLocalDateOnly(res.body.data.student.enrollment_date),
      body.enrollment_date,
    );
  });

  it('stores actual_graduation_date as null when not provided', async () => {
    const body = validBody();

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.student.actual_graduation_date, null);
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length > 0);
  });

  it('returns 422 when each required field is missing', async () => {
    const requiredFields = [
      'user',
      'address',
      'department_id',
    ];

    for (const field of requiredFields) {
      const body = validBody({
        actual_graduation_date: '2029-06-30',
      });
      delete body[field];

      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
        .send(body);

      assert.equal(
        res.status, 422,
        `Expected 422 when "${field}" is missing`,
      );

      const found = res.body.errors.find((e) => e.field === field);
      assert.ok(found, `Expected a validation error for field: ${field}`);
    }
  });

  it('returns 422 when user email is invalid', async () => {
    const body = validBody();
    body.user.email = 'not-an-email';

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'user.email');
    assert.ok(field, 'errors should contain a user.email entry');
  });

  it('returns 422 when department_id is not a valid UUID', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({
        department_id: 'not-a-uuid',
      }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'department_id');
    assert.ok(field, 'errors should contain a department_id entry');
  });

  it('returns 422 when actual_graduation_date is invalid', async () => {
    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({
        actual_graduation_date: 'not-a-date',
      }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'actual_graduation_date');
    assert.ok(field, 'errors should contain an actual_graduation_date entry');
  });

  it('returns 422 when enrollment_date is in the future', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const enrollment_date = futureDate.toISOString().split('T')[0];

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody({
        enrollment_date,
      }));

    assert.equal(res.status, 422);
    const field = res.body.errors.find((e) => e.field === 'enrollment_date');
    assert.ok(field, 'errors should contain an enrollment_date entry');
  });

  it('returns 500 when the database throws unexpectedly', async () => {
    sinon.stub(db, 'connect').rejects(new Error('DB connection lost'));
    sinon.stub(db, 'query').rejects(new Error('DB connection lost'));

    const res = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(validBody());

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});
