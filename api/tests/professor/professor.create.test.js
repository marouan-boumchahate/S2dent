import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

const SEED_ACADEMY_EMAIL = 'seed.professor@seed.internal';
const SEED_WALLET  = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SEED_ACADEMY_NUMBER = 'ACD_PROF_0001';

let ACADEMY_ID;
let DEPARTMENT_ID;
let TUSER_ID;

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

    await db.query(`DELETE FROM academies WHERE email = $1`, [SEED_ACADEMY_EMAIL]);

    const { rows: [academy] } = await db.query(
      `INSERT INTO academies (
         wallet_address, academy_number, name, short_name, type,
         email, legal_name, registration_number, tax_id
       )
       VALUES ($1, $2, $3, $4, 'university', $5, $6, $7, $8)
       RETURNING id`,
      [
        SEED_WALLET,
        SEED_ACADEMY_NUMBER,
        'Seed Professor University',
        'SPU',
        SEED_ACADEMY_EMAIL,
        'Seed Professor University Legal',
        'REG-PROF-0001',
        'TAX-PROF-0001',
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
    'notes',
  ];
  const insertVals = [
    'Professor',
    'Cases',
    'Test',
    `Professor Cases Test ${now}`,
    '1980-03-20',
    'male',
    `PROF-NID-${now}`,
    `prof.${now}@profcases.test`,
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

const validBody = (overrides = {}) => ({
    user_id: TUSER_ID,
    academy_id: ACADEMY_ID,
    department_id: DEPARTMENT_ID,
    title: 'Dr.',
    rank: 'Assoc. Prof',
    hire_date: '2022-09-01',
    employment_type: 'full_time',
    specialization: 'Computer Vision',
    office_location: 'Building A - 301',
    office_hours: 'Mon 10:00-12:00',
    bio: 'Researcher in machine learning.',
    ...overrides,
});

const cleanupProfessors = async () => {
  await db.query(
    `DELETE FROM professors
     WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@profcases.test'
     )`,
  );
      await db.query(`DELETE FROM users WHERE email LIKE '%@profcases.test'`);
};

const teardownSeed = async () => {
  await db.query(`DELETE FROM professors WHERE academy_id = $1`, [ACADEMY_ID]);
  await db.query(`DELETE FROM departments WHERE academy_id = $1`, [ACADEMY_ID]);
  await db.query(`DELETE FROM academies WHERE id = $1`, [ACADEMY_ID]);
};

before(async () => {
    ACADEMY_ID = await seedAcademy();
    DEPARTMENT_ID = await seedDepartment(ACADEMY_ID);
});

beforeEach(async () => {
    await cleanupProfessors();
    TUSER_ID = await seedTUser();
});

afterEach(async () => {
    sinon.restore();
});

after(async () => {
    await cleanupProfessors();
    await teardownSeed();
});

// MY TESTS
// ========
describe('POST /api/professors', () => {
    const formatLocalDateOnly = (isoStringOrDate) => {
      const d = new Date(isoStringOrDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    it('returns 201 and the professor DTO on valid input', async () => {
        const body = validBody();

        const res = await request(app)
            .post('/api/professors')
            .send(body);

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Professor registered successfully');

        const { professor } = res.body.data;

        assert.ok(professor.id);
        assert.equal(professor.user_id, body.user_id);
        assert.equal(professor.academy_id, body.academy_id);
        assert.equal(professor.department_id, body.department_id);
        assert.equal(professor.title, body.title);
        assert.equal(professor.rank, body.rank);
        assert.equal(professor.employment_type, body.employment_type);
        assert.equal(formatLocalDateOnly(professor.hire_date), body.hire_date);

        // checking employee_number shape
        assert.ok(professor.employee_number);
        assert.match(professor.employee_number, /^EMP_\d{6}\d+$/);
    });

    it('returns 404 USER_NOT_FOUND when user_id does not exist', async () => {
      const res = await request(app)
        .post('/api/professors')
        .send(validBody({ user_id: '00000000-0000-0000-0000-000000000001' }));

      assert.equal(res.status, 404);
      assert.equal(res.body.code, 'USER_NOT_FOUND');
    });

    it('returns 404 ACADEMY_NOT_FOUND when academy_id does not exist', async () => {
      const res = await request(app)
        .post('/api/professors')
        .send(validBody({ academy_id: '00000000-0000-0000-0000-000000000001' }));

      assert.equal(res.status, 404);
      assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 404 DEPARTMENT_NOT_FOUND when department is not in the academy', async () => {
      const otherAcademy = await db.query(
        `INSERT INTO academies (
           wallet_address, academy_number, name, short_name, type,
           email, legal_name, registration_number, tax_id
         )
         VALUES ($1,$2,$3,$4,'university',$5,$6,$7,$8)
         RETURNING id`,
        [
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'ACD_PROF_0002',
          'Other Academy',
          'OAC',
          'other.academy@seed.internal',
          'Other Academy Legal',
          'REG-PROF-0002',
          'TAX-PROF-0002',
        ],
      );

      const otherAcademyId = otherAcademy.rows[0].id;
      const otherDepartment = await db.query(
        `INSERT INTO departments (academy_id, code, name, faculty, total_years)
         VALUES ($1, 'MATH', 'Mathematics', 'Science', 4)
         RETURNING id`,
        [otherAcademyId],
      );

      const res = await request(app)
        .post('/api/professors')
        .send(validBody({ department_id: otherDepartment.rows[0].id }));

      assert.equal(res.status, 404);
      assert.equal(res.body.code, 'DEPARTMENT_NOT_FOUND');

      await db.query(`DELETE FROM departments WHERE academy_id = $1`, [otherAcademyId]);
      await db.query(`DELETE FROM academies WHERE id = $1`, [otherAcademyId]);
    });

    it('returns 422 when body is empty', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(res.body.errors));
        assert.ok(res.body.errors.length > 0);
    });

    it('returns 422 when each required field is missing', async () => {
        const requiredFields = ['user_id', 'academy_id', 'department_id', 'title', 'rank'];

        for (const field of requiredFields) {
            const body = validBody();
            delete body[field];

            const res = await request(app)
                .post('/api/professors')
                .send(body);

            assert.equal(
                res.status, 422,
                `Expected 422 when "${field}" is missing`,
            );

            const found = res.body.errors.find(e => e.field === field);
            assert.ok(found, `Expected a validation error for field: ${field}`);
        }
    });

    it('returns 422 when user_id is not a valid UUID', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ user_id: 'not-a-uuid' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'user_id');
        assert.ok(field, 'errors should contain a user_id entry');
    });

    it('returns 422 when academy_id is not a valid UUID', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ academy_id: 'not-a-uuid' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'academy_id');
        assert.ok(field, 'errors should contain an academy_id entry');
    });

    it('returns 422 when department_id is not a valid UUID', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ department_id: 'not-a-uuid' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'department_id');
        assert.ok(field, 'errors should contain a department_id entry');
    });

    it('returns 422 for an invalid rank value', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ rank: 'Director' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'rank');
        assert.ok(field, 'errors should contain a rank entry');
    });

    it('returns 422 for an invalid employment_type value', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ employment_type: 'temporary' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'employment_type');
        assert.ok(field, 'errors should contain an employment_type entry');
    });

    it('returns 500 when the database throws unexpectedly', async () => {
        sinon.stub(db, 'query').rejects(new Error('DB connection lost'));

        const res = await request(app)
            .post('/api/professors')
            .send(validBody());

        assert.equal(res.status, 500);
        assert.equal(res.body.success, false);
    });
});