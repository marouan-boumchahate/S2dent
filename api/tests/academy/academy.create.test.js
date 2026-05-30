import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

// MY SETUP
// ========
const validBody = (overrides = {}) => ({
    email: 'admin@fenerbahce.edu.tr',
    name: 'Fenerbahce University',
    short_name: 'FBU',
    type: 'university',
    legal_name: 'Fenerbahce University A.S.',
    registration_number: 'REG-FBU-001',
    tax_id: 'TAX-FBU-001',
    ...overrides,
});

const issueAdminToken = () => signTokens(
    {
        sub: '0x0000000000000000000000000000000000000001',
        role: 'admin',
        uid: 'admin-user',
        rid: 'admin-role',
    },
    undefined,
    true,
).accessToken;

let adminToken;

const cleanupDB = async () => {
    const matchClause = `
        email LIKE '%@fenerbahce%'
           OR email LIKE '%@test%'
           OR name LIKE 'Fenerbahce%'
           OR name LIKE 'Test Academy%'
           OR registration_number LIKE 'REG-FBU%'
    `;

    await db.query(`
        DELETE FROM students
        WHERE academy_id IN (
            SELECT id FROM academies WHERE ${matchClause}
        )
    `);

    await db.query(`
        DELETE FROM professors
        WHERE academy_id IN (
            SELECT id FROM academies WHERE ${matchClause}
        )
    `);

    await db.query(`
        DELETE FROM identities
        WHERE academy_id IN (
            SELECT id FROM academies WHERE ${matchClause}
        )
    `);

    await db.query(`
        DELETE FROM departments
        WHERE academy_id IN (
            SELECT id FROM academies WHERE ${matchClause}
        )
    `);

    await db.query(`
        DELETE FROM academies
        WHERE ${matchClause}
    `);
};

// MY TESTS
// ========
describe('POST /api/academies', () => {
    beforeEach(async () => {
        await cleanupDB();
        adminToken = issueAdminToken();
    });

    afterEach(async () => {
        sinon.restore();
        await cleanupDB();
    });

    it('returns 201 and the academy DTO on valid input', async () => {
        const body = validBody();

        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(body);

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Academy registered successfully');

        const { academy } = res.body.data;

        assert.ok(academy.id);
        assert.equal(academy.name, body.name);
        assert.equal(academy.short_name, body.short_name);
        assert.equal(academy.type, body.type);
        assert.equal(academy.email, body.email);

        assert.equal(academy.description, null);
        assert.equal(academy.website, null);
        assert.equal(academy.logo_url, null);
        assert.equal(academy.phone, null);
        assert.equal(academy.legal_name, body.legal_name);
        assert.equal(academy.registration_number, body.registration_number);
        assert.equal(academy.tax_id, body.tax_id);
        assert.equal(academy.billing_email, null);

        // checking serial_number shape
        assert.ok(academy.serial_number);
        assert.match(academy.serial_number, /^ACD_\d{6}\d+$/);
    });

    it('includes optional fields when provided', async () => {
        const body = validBody({
            description: 'A university for tests',
            website: 'https://fenerbahce.edu.tr',
            logo_url: 'https://fenerbahce.edu.tr/logo.png',
            phone: '+902121234567',
            billing_email: 'billing@fenerbahce.edu.tr',
        });

        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(body);

        assert.equal(res.status, 201);
        assert.equal(res.body.data.academy.description, body.description);
        assert.equal(res.body.data.academy.website, body.website);
        assert.equal(res.body.data.academy.logo_url, body.logo_url);
        assert.equal(res.body.data.academy.phone, body.phone);
        assert.equal(res.body.data.academy.billing_email, body.billing_email);
    });

    it('returns 409 ACADEMY_EMAIL_DUPLICATE when email already exists', async () => {
        await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody());

        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody({
                name: 'Test Academy 2',
                short_name: 'TA2',
                legal_name: 'Test Academy 2 Legal',
                registration_number: 'REG-OTHER-001',
                tax_id: 'TAX-OTHER-001',
            }));

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_EMAIL_DUPLICATE');
    });

    it('returns 409 ACADEMY_DUPLICATE when academy name already exists', async () => {
        await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody());

        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody({
                email: 'other@test.edu.tr',
                short_name: 'TA2',
                legal_name: 'Test Academy 2 Legal',
                registration_number: 'REG-OTHER-002',
                tax_id: 'TAX-OTHER-002',
            }));

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_DUPLICATE');
    });

    it('returns 409 ACADEMY_SHORT_NAME_DUPLICATE when academy short name already exists', async () => {
        await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody());

        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody({
                email: 'other@test.edu.tr',
                name: 'Test Academy 2',
                legal_name: 'Test Academy 2 Legal',
                registration_number: 'REG-OTHER-003',
                tax_id: 'TAX-OTHER-003',
            }));

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_SHORT_NAME_DUPLICATE');
    });

    it('returns 422 when body is empty', async () => {
        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(res.body.errors));
        assert.ok(res.body.errors.length > 0);
    });

    it('returns 422 for invalid academy type', async () => {
        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody({ type: 'spaceship' }));

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'type');
        assert.ok(field, 'errors should contain a type entry');
    });

    it('returns 422 for invalid website URL', async () => {
        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody({ website: 'not-a-url' }));

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'website');
        assert.ok(field, 'errors should contain a website entry');
    });

    it('returns 422 when each required field is missing', async () => {
        const requiredFields = [
            'email',
            'name',
            'short_name',
            'type',
            'legal_name',
            'registration_number',
            'tax_id',
        ];

        for (const field of requiredFields) {
            const body = validBody();
            delete body[field];

            const res = await request(app)
                .post('/api/academies')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(body);

            assert.equal(res.status, 422, `Expected 422 when ${field} is missing`);
            const found = res.body.errors.find(e => e.field === field);
            assert.ok(found, `Expected error for field: ${field}`);
        }
    });

    it('returns 500 when the database throws unexpectedly', async () => {
        sinon.stub(db, 'query').rejects(new Error('DB connection lost'));

        const res = await request(app)
            .post('/api/academies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validBody());

        assert.equal(res.status, 500);
        assert.equal(res.body.success, false);
    });
});
