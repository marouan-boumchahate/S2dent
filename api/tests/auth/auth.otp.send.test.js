import esmock from 'esmock';
import request from 'supertest';
import sinon from 'sinon';
import crypto from 'crypto';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';
import { hash } from '../../src/utils/crypto.js';

const OTP_TTL = 300; // 5 minutes
const TEST_EMAIL_SUFFIX = '@otp-test.com';

const makeCacheStubs = (overrides = {}) => ({
    getCache: sinon.stub().resolves(null),
    setCache: sinon.stub().resolves(),
    delCache: sinon.stub().resolves(),
    ...overrides,
});

const makeEmailStubs = (overrides = {}) => {
    const email = {
        sendEmail: sinon.stub().resolves(),
        ...overrides,
    };

    email.sendOtpEmail = sinon.stub().callsFake((to, otp) => email.sendEmail({
        to,
        subject: 'Your OTP Code',
        message: `Your OTP code is: ${otp}`,
        text: `Your OTP code is: ${otp}`,
    }));
    email.sendWelcomeEmail = sinon.stub().callsFake((to, name) => email.sendEmail({
        to,
        subject: 'Welcome to S2dent',
        message: `Hello ${name}, welcome to S2dent.`,
        text: `Hello ${name}, welcome to S2dent.`,
    }));

    return email;
};

const makeApp = async ({ cache = makeCacheStubs(), email: emailOverrides = {} } = {}) => {
    const email = makeEmailStubs(emailOverrides);
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/cache/cache.client.js': cache,
            '../../src/utils/email.js': email,
        },
    );
    return { app, cache, email };
};

const cleanupDB = async () => {
    const emailPattern = `%${TEST_EMAIL_SUFFIX}`;
    
    // 1. Delete from pending_transactions based on email in payload
    await db.query(`
        DELETE FROM pending_transactions 
        WHERE payload->>'email' LIKE $1
    `, [emailPattern]);

    // 2. Delete from identities linked to users/academies we are about to delete
    await db.query(`
        DELETE FROM identities 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)
           OR academy_id IN (SELECT id FROM academies WHERE email LIKE $1)
    `, [emailPattern]);

    // 3. Delete from professors/students linked to users we are about to delete
    await db.query(`
        DELETE FROM professors 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)
    `, [emailPattern]);

    await db.query(`
        DELETE FROM students 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)
    `, [emailPattern]);

    // 4. Delete from addresses linked to users/academies we are about to delete
    await db.query(`
        DELETE FROM addresses 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)
           OR academy_id IN (SELECT id FROM academies WHERE email LIKE $1)
    `, [emailPattern]);

    // 5. Delete from departments linked to academies we are about to delete
    await db.query(`
        DELETE FROM departments 
        WHERE academy_id IN (SELECT id FROM academies WHERE email LIKE $1)
    `, [emailPattern]);

    // 6. Finally delete users and academies
    await db.query(`
        DELETE FROM academies 
        WHERE email LIKE $1
    `, [emailPattern]);

    await db.query(`
        DELETE FROM users 
        WHERE email LIKE $1
    `, [emailPattern]);
};

const seedUser = async (email, role = 'student') => {
    const { rows: [user] } = await db.query(
        `INSERT INTO users (first_name, last_name, full_name, date_of_birth, gender, national_id, nationality, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        ['OTP', 'Test', 'OTP Test User', '1990-01-01', 'male', `NID-${crypto.randomBytes(4).toString('hex')}`, 'Testland', email]
    );

    const { rows: [{ nextval }] } = await db.query(`SELECT nextval('academy_seq')`);
    const academyEmail = `acad-${nextval}${TEST_EMAIL_SUFFIX}`;
    const { rows: [academy] } = await db.query(
        `INSERT INTO academies (academy_number, name, short_name, type, email, legal_name, registration_number, tax_id)
         VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
         RETURNING id`,
        [`ACD-${nextval}`, `Academy ${nextval}`, `ACD${nextval}`, academyEmail, `Legal ${nextval}`, `REG-${nextval}`, `TAX-${nextval}`]
    );

    const { rows: [dept] } = await db.query(
        `INSERT INTO departments (academy_id, code, name, faculty, total_years)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [academy.id, `CS-${nextval}`, 'Computer Science', 'Engineering', 4]
    );

    if (role === 'student') {
        await db.query(
            `INSERT INTO students (user_id, academy_id, department_id, student_number, enrollment_date, expected_graduation_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.id, academy.id, dept.id, `STU-${crypto.randomBytes(4).toString('hex')}`, '2020-09-01', '2024-06-01']
        );
        return { id: user.id, role: 'student' };
    } else if (role === 'professor') {
        await db.query(
            `INSERT INTO professors (user_id, academy_id, department_id, employee_number, title, rank, hire_date, employment_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [user.id, academy.id, dept.id, `EMP-${crypto.randomBytes(4).toString('hex')}`, 'Dr.', 'Prof', '2020-01-01', 'full_time']
        );
        return { id: user.id, role: 'professor' };
    }
};

const seedAcademy = async (email) => {
    const { rows: [{ nextval }] } = await db.query(`SELECT nextval('academy_seq')`);
    const { rows: [academy] } = await db.query(
        `INSERT INTO academies (academy_number, name, short_name, type, email, legal_name, registration_number, tax_id)
         VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
         RETURNING id`,
        [`ACD-${nextval}`, `Academy ${nextval}`, `ACD${nextval}`, email, `Legal ${nextval}`, `REG-${nextval}`, `TAX-${nextval}`]
    );
    return { id: academy.id, role: 'academy' };
};

describe('POST /api/auth/otp/send', function () {
    this.timeout(10000);

    beforeEach(async () => {
        await cleanupDB();
    });

    afterEach(async () => {
        await cleanupDB();
    });

    it('returns 201 and sends OTP to a student', async () => {
        const email = `student${TEST_EMAIL_SUFFIX}`;
        await seedUser(email, 'student');
        const { app, cache, email: emailStub } = await makeApp();

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email });

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'check your email for the OTP code');
        assert.match(res.body.data.message, /^Sign this nonce to verify your identity: [0-9a-f]{64}$/);

        assert.equal(cache.setCache.calledOnce, true);
        const [cacheKey, payloadStr, ttl] = cache.setCache.firstCall.args;
        const payload = JSON.parse(payloadStr);

        assert.ok(cacheKey.startsWith('auth:otp:'));
        assert.equal(payload.role, 'student');
        assert.equal(ttl, OTP_TTL);

        assert.equal(emailStub.sendEmail.calledOnce, true);
        const emailArgs = emailStub.sendEmail.firstCall.args[0];
        assert.equal(emailArgs.to, email);
        assert.match(emailArgs.message, /Your OTP code is: [0-9a-f]{6}/);
    });

    it('returns 201 and sends OTP to a professor', async () => {
        const email = `professor${TEST_EMAIL_SUFFIX}`;
        await seedUser(email, 'professor');
        const { app, cache, email: emailStub } = await makeApp();

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email });

        assert.equal(res.status, 201);
        assert.equal(cache.setCache.calledOnce, true);
        const payload = JSON.parse(cache.setCache.firstCall.args[1]);
        assert.equal(payload.role, 'professor');
    });

    it('returns 201 and sends OTP to an academy', async () => {
        const email = `academy${TEST_EMAIL_SUFFIX}`;
        await seedAcademy(email);
        const { app, cache, email: emailStub } = await makeApp();

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email });

        assert.equal(res.status, 201);
        assert.equal(cache.setCache.calledOnce, true);
        const payload = JSON.parse(cache.setCache.firstCall.args[1]);
        assert.equal(payload.role, 'academy');
    });

    it('returns 404 EMAIL_NOT_FOUND when email is not registered', async () => {
        const { app } = await makeApp();

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email: `nonexistent${TEST_EMAIL_SUFFIX}` });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'EMAIL_NOT_FOUND');
    });

    it('returns 422 VALIDATION_ERROR when email is missing', async () => {
        const { app } = await makeApp();

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
    });

    it('returns 422 VALIDATION_ERROR when email is invalid', async () => {
        const { app } = await makeApp();

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email: 'not-an-email' });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
    });

    it('normalizes email to lowercase', async () => {
        const email = `Student${TEST_EMAIL_SUFFIX.toUpperCase()}`;
        await seedUser(email.toLowerCase(), 'student');
        const { app, cache } = await makeApp();

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email });

        assert.equal(res.status, 201);
        assert.equal(cache.setCache.calledOnce, true);
    });

    it('returns 500 when email service fails', async () => {
        const email = `student${TEST_EMAIL_SUFFIX}`;
        await seedUser(email, 'student');
        const { app } = await makeApp({
            email: { sendEmail: sinon.stub().rejects(new Error('Email failed')) }
        });

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email });

        assert.equal(res.status, 500);
    });
});
