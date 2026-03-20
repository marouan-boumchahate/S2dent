import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

// MY SETUP
// ========
const SEED_EMAIL   = 'seed.professor@seed.internal';
const SEED_WALLET  = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

let ACADEMY_ID;

const seedAcademy = async () => {
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
        `INSERT INTO academies (user_id, name, short_name, type, country, city)
         VALUES ($1, 'Seed Professor University', 'SPU', 'university', 'Turkey', 'Istanbul')
         RETURNING id`,
        [user.id],
    );

    return academy.id;
};

const validBody = (overrides = {}) => ({
    email:      'john.doe@fenerbahce.edu.tr',
    full_name:  'John Doe Professor',
    department: 'Computer Engineering',
    faculty:    'Engineering',
    academy_id: ACADEMY_ID,
    ...overrides,
});

const cleanupProfessors = async () => {
    await db.query(`
        DELETE FROM professors
        USING users
        WHERE professors.user_id = users.id
          AND (
              users.email LIKE '%@fenerbahce%'
           OR users.email LIKE '%@test%'
          )
    `);

    await db.query(`
        DELETE FROM users
        WHERE (
            email LIKE '%@fenerbahce%'
         OR email LIKE '%@test%'
        )
    `);
};

const teardownSeed = async () => {
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
    ACADEMY_ID = await seedAcademy();
});

beforeEach(async () => {
    await cleanupProfessors();
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
        assert.equal(professor.name,       body.full_name);
        assert.equal(professor.department, body.department);
        assert.equal(professor.faculty,    body.faculty);
        assert.equal(professor.academy_id, body.academy_id);

        assert.equal(professor.phone, null);
        assert.equal(professor.title, null);

        // checking employee_number shape
        assert.ok(professor.employee_number);
        assert.match(professor.employee_number, /^EMP_\d{6}\d+$/);
    });

    it('includes optional fields when provided', async () => {
        const body = validBody({
            phone: '+905551234567',
            title: 'Assoc. Prof.',
        });

        const res = await request(app)
            .post('/api/professors')
            .send(body);

        assert.equal(res.status, 201);

        const { professor } = res.body.data;

        assert.equal(professor.phone, body.phone);
        assert.equal(professor.title, body.title);
    });

    it('accepts every valid title value without error', async () => {
        const PROFESSOR_TITLES = [
            'Asst. Prof.',
            'Assoc. Prof.',
            'Prof.',
            'Lect.',
            'Res.',
            'Other',
        ];

        for (const [index, title] of PROFESSOR_TITLES.entries()) {
            // Unique email each request
            const body = validBody({
                email: `prof.title.${index}@fenerbahce.edu.tr`,
                title,
            });

            const res = await request(app)
                .post('/api/professors')
                .send(body);

            assert.equal(
                res.status, 201,
                `Expected 201 for title "${title}", got ${res.status}`,
            );
            assert.equal(res.body.data.professor.title, title);
        }
    });

    it('returns 409 EMAIL_DUPLICATE when email already exists', async () => {
        await request(app)
            .post('/api/professors')
            .send(validBody());

        // Second request — same email, every other field is different
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({
                full_name:  'Another Professor Name',
                department: 'Mathematics',
            }));

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'EMAIL_DUPLICATE');
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
        const requiredFields = ['email', 'full_name', 'department', 'faculty', 'academy_id'];

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

    it('returns 422 for an invalid email format', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ email: 'not-an-email' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });

    it('returns 422 when full_name is too short (< 5 chars)', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ full_name: 'Ab' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'full_name');
        assert.ok(field, 'errors should contain a full_name entry');
    });

    it('returns 422 for an invalid phone format', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ phone: '05551234567' })); // no country code

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'phone');
        assert.ok(field, 'errors should contain a phone entry');
    });

    it('returns 422 for an invalid title value', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ title: 'Director' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'title');
        assert.ok(field, 'errors should contain a title entry');
    });

    it('returns 422 when academy_id is not a valid UUID', async () => {
        const res = await request(app)
            .post('/api/professors')
            .send(validBody({ academy_id: 'not-a-uuid' }));

        assert.equal(res.status, 422);

        const field = res.body.errors.find(e => e.field === 'academy_id');
        assert.ok(field, 'errors should contain an academy_id entry');
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