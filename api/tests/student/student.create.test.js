import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const SEED_EMAIL = 'seed.student@seed.internal';
const SEED_WALLET = '0xcccccccccccccccccccccccccccccccccccccccc';
const SEED_ACADEMY_NUMBER = 'ACD_STU_0001';

let ACADEMY_ID;
let DEPARTMENT_ID;
let USER_ID;

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
       WHERE email = $1
          OR wallet_address = $2
          OR academy_number = $3
     )`,
    [SEED_EMAIL, SEED_WALLET.toLowerCase(), SEED_ACADEMY_NUMBER],
  );

  await db.query(
    `DELETE FROM academies
     WHERE email = $1
        OR wallet_address = $2
        OR academy_number = $3`,
    [SEED_EMAIL, SEED_WALLET.toLowerCase(), SEED_ACADEMY_NUMBER],
  );

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
      wallet_address,
      email,
      academy_number,
      name,
      short_name,
      type,
      legal_name,
      registration_number,
      tax_id
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      SEED_WALLET,
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
    'notes',
  ];
  const insertVals = [
    'Student',
    'Cases',
    'Test',
    'Student Cases Test',
    '2004-01-15',
    'male',
    'STU-NID-001',
    'student.001@studentcases.test',
    '+905551234567',
    null,
    null,
  ];

  if (columns.has('nationality')) {
    insertCols.push('nationality');
    insertVals.push('Turkish');
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

const cleanupStudents = async () => {
  await db.query(
    `DELETE FROM students
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@studentcases.test'
     )`,
  );
  
  await db.query(`DELETE FROM users WHERE email LIKE '%@studentcases.test'`);
};

const teardownSeed = async () => {
  await db.query(
    `DELETE FROM departments
     WHERE academy_id IN (
       SELECT id FROM academies
       WHERE email = $1
          OR wallet_address = $2
          OR academy_number = $3
     )`,
    [SEED_EMAIL, SEED_WALLET.toLowerCase(), SEED_ACADEMY_NUMBER],
  );

  await db.query(
    `DELETE FROM academies
     WHERE email = $1
        OR wallet_address = $2
        OR academy_number = $3`,
    [SEED_EMAIL, SEED_WALLET.toLowerCase(), SEED_ACADEMY_NUMBER],
  );
};

before(async () => {
  ACADEMY_ID = await seedAcademy();
  DEPARTMENT_ID = await seedDepartment(ACADEMY_ID);
});

beforeEach(async () => {
  await cleanupStudents();
  USER_ID = await seedUser();
});

afterEach(async () => {
  sinon.restore();
});

after(async () => {
  await cleanupStudents();
  await teardownSeed();
});

const endpoint = "/api/students"

describe('POST /api/students', () => {
  const formatLocalDateOnly = (isoStringOrDate) => {
    const d = new Date(isoStringOrDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  it('returns 201 and the student DTO on valid input', async () => {
    const body = {
      user_id: USER_ID,
      academy_id: ACADEMY_ID,
      department_id: DEPARTMENT_ID,
      current_level: '4th Year',
      actual_graduation_date: '2028-06-30',
    };

    const res = await request(app)
      .post(endpoint)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Student registered successfully');

    const { student } = res.body.data;

    assert.ok(student.id);
    assert.ok(student.student_number);
    assert.match(student.student_number, /^STU_\d{6}\d+$/);
    assert.equal(student.current_level, body.current_level);
    assert.equal(student.enrollment_status, 'active');

    assert.equal(student.department_code, 'CENG');
    assert.equal(student.department_name, 'Computer Engineering');

    assert.ok(student.enrollment_date);
    assert.ok(student.expected_graduation_date);
    assert.equal(formatLocalDateOnly(student.actual_graduation_date), body.actual_graduation_date);
  });

  it('accepts enrollment_status and enrollment_date when provided', async () => {
    const body = {
      user_id: USER_ID,
      academy_id: ACADEMY_ID,
      department_id: DEPARTMENT_ID,
      current_level: '2nd Year',
      enrollment_status: 'suspended',
      enrollment_date: '2023-09-15',
    };

    const res = await request(app)
      .post(endpoint)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.student.enrollment_status, body.enrollment_status);
    assert.equal(
      formatLocalDateOnly(res.body.data.student.enrollment_date),
      body.enrollment_date,
    );
  });

  it('stores actual_graduation_date as null when not provided', async () => {
    const body = {
      user_id: USER_ID,
      academy_id: ACADEMY_ID,
      department_id: DEPARTMENT_ID,
      current_level: '1st Year',
    };

    const res = await request(app)
      .post(endpoint)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.student.actual_graduation_date, null);
  });

  it('returns 422 when body is empty', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length > 0);
  });

  it('returns 422 when each required field is missing', async () => {
    const requiredFields = [
      'user_id',
      'academy_id',
      'department_id',
      'current_level',
    ];

    for (const field of requiredFields) {
      const body = {
        user_id: USER_ID,
        academy_id: ACADEMY_ID,
        department_id: DEPARTMENT_ID,
        current_level: '2nd Year',
        actual_graduation_date: '2029-06-30',
      };
      delete body[field];

      const res = await request(app)
        .post(endpoint)
        .send(body);

      assert.equal(
        res.status, 422,
        `Expected 422 when "${field}" is missing`,
      );

      const found = res.body.errors.find((e) => e.field === field);
      assert.ok(found, `Expected a validation error for field: ${field}`);
    }
  });

  it('returns 422 when user_id is not a valid UUID', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({
        user_id: 'not-a-uuid',
        academy_id: ACADEMY_ID,
        department_id: DEPARTMENT_ID,
        current_level: '2nd Year',
      });

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'user_id');
    assert.ok(field, 'errors should contain a user_id entry');
  });

  it('returns 422 when academy_id is not a valid UUID', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({
        user_id: USER_ID,
        academy_id: 'not-a-uuid',
        department_id: DEPARTMENT_ID,
        current_level: '2nd Year',
      });

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'academy_id');
    assert.ok(field, 'errors should contain an academy_id entry');
  });

  it('returns 422 when department_id is not a valid UUID', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({
        user_id: USER_ID,
        academy_id: ACADEMY_ID,
        department_id: 'not-a-uuid',
        current_level: '2nd Year',
      });

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'department_id');
    assert.ok(field, 'errors should contain a department_id entry');
  });

  it('returns 422 when actual_graduation_date is invalid', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({
        user_id: USER_ID,
        academy_id: ACADEMY_ID,
        department_id: DEPARTMENT_ID,
        current_level: '2nd Year',
        actual_graduation_date: 'not-a-date',
      });

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'actual_graduation_date');
    assert.ok(field, 'errors should contain an actual_graduation_date entry');
  });

  it('returns 500 when the database throws unexpectedly', async () => {
    sinon.stub(db, 'query').rejects(new Error('DB connection lost'));

    const res = await request(app)
      .post(endpoint)
      .send({
        user_id: USER_ID,
        academy_id: ACADEMY_ID,
        department_id: DEPARTMENT_ID,
        current_level: '4th Year',
      });

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});
