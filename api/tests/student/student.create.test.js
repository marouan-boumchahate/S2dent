import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

// MY SETUP
// ========
const SEED_EMAIL = 'seed.student@seed.internal';
const SEED_WALLET = '0xcccccccccccccccccccccccccccccccccccccccc';
const SEED_ACADEMY_NUMBER = 'ACD_0224026';

let ACADEMY_ID;

const seedAcademy = async () => {
  await db.query(`
    DELETE FROM students
    WHERE academy_id IN (
      SELECT academies.id
      FROM academies
      JOIN users ON academies.user_id = users.id
      WHERE users.email = $1
    )
  `, [SEED_EMAIL]);

  await db.query(`
    DELETE FROM students
    USING users
    WHERE students.user_id = users.id
      AND users.email = $1
  `, [SEED_EMAIL]);

  await db.query(`
    DELETE FROM academies
    USING users
    WHERE academies.user_id = users.id
      AND users.email = $1
  `, [SEED_EMAIL]);

  await db.query(
    `DELETE FROM users WHERE email = $1`,
    [SEED_EMAIL],
  );

  const { rows: [user] } = await db.query(
    `INSERT INTO users (email, wallet_address, role)
     VALUES ($1, $2, 'academy_admin')
     RETURNING id`,
    [SEED_EMAIL, SEED_WALLET],
  );

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (user_id, academy_number, name, short_name, type, country, city)
     VALUES ($1, $2, 'Seed Student University', 'SSU', 'university', 'Turkey', 'Istanbul')
     RETURNING id`,
    [user.id, SEED_ACADEMY_NUMBER],
  );

  return academy.id;
};

const validBody = (overrides = {}) => ({
  academy_id: ACADEMY_ID,
  first_name: 'Marouan',
  middle_name: 'Santetu',
  last_name: 'Boumchahate',
  date_of_birth: '2004-01-15',
  gender: 'male',
  national_id: 'TR-12345678901',
  email: 'marouan.boumchahate@studentcases.edu.tr',
  phone: '+905551234567',
  address: 'Kadikoy Istanbul',
  city: 'Istanbul',
  country: 'Turkey',
  department: 'Computer Engineering',
  faculty: 'Engineering',
  current_level: '4th Year',
  actual_study_duration_in_years: 4,
  actual_graduation_date: '2028-06-30',
  photo_url: 'https://example.com/student-photo.png',
  notes: 'Scholarship student',
  ...overrides,
});

const cleanupStudents = async () => {
  await db.query(`
    DELETE FROM students
    USING users
    WHERE students.user_id = users.id
      AND (
        users.email LIKE '%@fenerbahce.edu.tr'
        OR users.email LIKE '%@student.test'
        OR users.email LIKE '%@studentcases.edu.tr'
        OR users.email LIKE '%@test%'
      )
  `);

  await db.query(`
    DELETE FROM users
    WHERE (
      email LIKE '%@studentcases.edu.tr'
      OR email LIKE '%@test%'
    )
  `);
};

const teardownSeed = async () => {
  await db.query(`
    DELETE FROM students
    WHERE academy_id IN (
      SELECT academies.id
      FROM academies
      JOIN users ON academies.user_id = users.id
      WHERE users.email = $1
    )
  `, [SEED_EMAIL]);

  await db.query(`
    DELETE FROM students
    USING users
    WHERE students.user_id = users.id
      AND users.email = $1
  `, [SEED_EMAIL]);

  await db.query(`
    DELETE FROM academies
    USING users
    WHERE academies.user_id = users.id
      AND users.email = $1
  `, [SEED_EMAIL]);

  await db.query(
    `DELETE FROM users WHERE email = $1`,
    [SEED_EMAIL],
  );
};

before(async () => {
    ACADEMY_ID = await seedAcademy()
});

beforeEach(async () => {
    await cleanupStudents()
});

afterEach(async () => {
    sinon.restore()
});

after(async () => {
  await cleanupStudents();
  await teardownSeed();
});

const endpoint = "/api/students"

// MY TESTS
// ========
describe('POST /api/students', () => {
  it('returns 201 and the student DTO on valid input', async () => {
    const body = validBody();

    const res = await request(app)
      .post(endpoint)
      .send(body);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Student registered successfully');

    const { student } = res.body.data;

    assert.ok(student.id);
    assert.equal(student.first_name, body.first_name);
    assert.equal(student.middle_name, body.middle_name);
    assert.equal(student.last_name, body.last_name);
    assert.equal(student.gender, body.gender);
    assert.equal(student.national_id, body.national_id);
    assert.equal(student.email, body.email);
    assert.equal(student.academy_id, body.academy_id);

    assert.ok(student.student_number);
    assert.match(student.student_number, /^STU_\d{6}\d+$/);
  });

  it('stores nullable optional fields as null when not provided', async () => {
    const body = validBody({
      middle_name: undefined,
      phone: undefined,
      address: undefined,
      photo_url: undefined,
      notes: undefined,
    });

    const res = await request(app)
      .post(endpoint)
      .send(body);

    assert.equal(res.status, 201);

    const { student } = res.body.data;
    assert.equal(student.middle_name, null);
    assert.equal(student.phone, null);
    assert.equal(student.address, null);
    assert.equal(student.photo_url, null);
    assert.equal(student.notes, null);
  });

  it('accepts every valid gender value without error', async () => {
    const GENDER_TYPES = ['male', 'female'];

    for (const [index, gender] of GENDER_TYPES.entries()) {
      const body = validBody({
        email: `student.gender.${index}@studentcases.edu.tr`,
        national_id: `TR-00000000${index + 10}`,
        gender,
      });

      const res = await request(app)
        .post(endpoint)
        .send(body);

      assert.equal(
        res.status, 201,
        `Expected 201 for gender "${gender}", got ${res.status}`,
      );
      assert.equal(res.body.data.student.gender, gender);
    }
  });

  it('returns 409 EMAIL_DUPLICATE when email already exists', async () => {
    await request(app)
      .post(endpoint)
      .send(validBody());

    const res = await request(app)
      .post(endpoint)
      .send(validBody({
        national_id: 'TR-99887766554',
      }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'EMAIL_DUPLICATE');
  });

  it('returns 409 STUDENT_NATIONAL_ID_DUPLICATE when national_id already exists', async () => {
    await request(app)
      .post(endpoint)
      .send(validBody());

    const res = await request(app)
      .post(endpoint)
      .send(validBody({
        email: 'another.student@studentcases.edu.tr',
      }));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'STUDENT_NATIONAL_ID_DUPLICATE');
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
      'academy_id',
      'first_name',
      'last_name',
      'date_of_birth',
      'gender',
      'national_id',
      'email',
      'city',
      'country',
      'department',
      'faculty',
      'current_level',
      'actual_study_duration_in_years',
    ];

    for (const field of requiredFields) {
      const body = validBody();
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

  it('returns 422 for an invalid email format', async () => {
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ email: 'not-an-email' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'email');
    assert.ok(field, 'errors should contain an email entry');
  });

  it('returns 422 for an invalid phone format', async () => {
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ phone: '05551234567' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'phone');
    assert.ok(field, 'errors should contain a phone entry');
  });

  it('returns 422 for an invalid gender value', async () => {
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ gender: 'other' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'gender');
    assert.ok(field, 'errors should contain a gender entry');
  });

  it('returns 422 when academy_id is not a valid UUID', async () => {
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ academy_id: 'not-a-uuid' }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'academy_id');
    assert.ok(field, 'errors should contain an academy_id entry');
  });

  it('returns 422 when actual_study_duration_in_years is out of range', async () => {
    const res = await request(app)
      .post(endpoint)
      .send(validBody({ actual_study_duration_in_years: 0 }));

    assert.equal(res.status, 422);

    const field = res.body.errors.find((e) => e.field === 'actual_study_duration_in_years');
    assert.ok(field, 'errors should contain an actual_study_duration_in_years entry');
  });

  it('returns 500 when the database throws unexpectedly', async () => {
    sinon.stub(db, 'query').rejects(new Error('DB connection lost'));

    const res = await request(app)
      .post(endpoint)
      .send(validBody());

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
  });
});
