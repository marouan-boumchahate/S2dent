import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

// MY SETUP
// ========
const validBody = (overrides = {}) => ({
    email: 'admin@fenerbahce.edu.tr',
    wallet_address: '0x8fA1b2C3d4E5F67890123456789abcdefABCDEF0',
    name: 'Fenerbahce University',
    short_name: 'FBU',
    type: 'university',
    legal_name: 'Fenerbahce University A.S.',
    registration_number: 'REG-FBU-001',
    tax_id: 'TAX-FBU-001',
    ...overrides,
});

const cleanupDB = async () => {
    await db.query(`
        DELETE FROM professors
        WHERE academy_id IN (
            SELECT id FROM academies
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test%'
               OR wallet_address IN (
                   '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0',
                   '0x1111222233334444555566667777888899990000',
                   '0x2222333344445555666677778888999900001111',
                   '0xabcdef1234567890abcdef1234567890abcdef12'
               )
        )
    `);

    await db.query(`
        DELETE FROM academies
        WHERE email LIKE '%@fenerbahce%'
           OR email LIKE '%@test%'
           OR wallet_address IN (
               '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0',
               '0x1111222233334444555566667777888899990000',
               '0x2222333344445555666677778888999900001111',
               '0xabcdef1234567890abcdef1234567890abcdef12'
           )
    `);
};

beforeEach(async () => {
    await cleanupDB();
});

afterEach(async () => {
    sinon.restore();
    await cleanupDB();
});

// MY TESTS
// ========
describe('POST /api/academies', () => {

    it('returns 201 and the academy DTO on valid input', async () => {
        const body = validBody();

        const res = await request(app)
            .post('/api/academies')
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
        assert.equal(academy.wallet_address, body.wallet_address.toLowerCase());

        assert.equal(academy.description, null);
        assert.equal(academy.website, null);
        assert.equal(academy.logo_url, null);
        assert.equal(academy.phone, null);
        assert.equal(academy.legal_name, body.legal_name);
        assert.equal(academy.registration_number, body.registration_number);
        assert.equal(academy.tax_id, body.tax_id);
        assert.equal(academy.billing_email, null);

        // checking academy_number shape
        assert.ok(academy.academy_number);
        assert.match(academy.academy_number, /^ACD_\d{6}\d+$/);
    });

    it('stores wallet_address lowercased regardless of input casing', async () => {
        const body = validBody({ wallet_address: '0xABCDEF1234567890abcdef1234567890abcdef12' });

        const res = await request(app)
            .post('/api/academies')
            .send(body);

        assert.equal(res.status, 201);
        assert.equal(
            res.body.data.academy.wallet_address,
            body.wallet_address.toLowerCase(),
        );
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
            .send(validBody());

        const res = await request(app)
            .post('/api/academies')
            .send(validBody({
                name: 'Test Academy 2',
                wallet_address: '0x1111222233334444555566667777888899990000',
            }));

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_EMAIL_DUPLICATE');
    });

    it('returns 409 ACADEMY_DUPLICATE when academy name already exists', async () => {
        await request(app)
            .post('/api/academies')
            .send(validBody());

        const res = await request(app)
            .post('/api/academies')
            .send(validBody({
                email: 'other@test.edu.tr',
                wallet_address: '0x2222333344445555666677778888999900001111',
            }));

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_DUPLICATE');
    });
    
    it('returns 409 ACADEMY_SHORT_NAME_DUPLICATE when academy short name already exists', async () => {
        await request(app)
            .post('/api/academies')
            .send(validBody());

        const res = await request(app)
            .post('/api/academies')
            .send(validBody({
                email: 'other@test.edu.tr',
                name: 'Test Academy 2',
                wallet_address: '0x2222333344445555666677778888999900001111',
            }));

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_SHORT_NAME_DUPLICATE');
    });

    it('returns 422 when body is empty', async () => {
        const res = await request(app)
            .post('/api/academies')
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(res.body.errors));
        assert.ok(res.body.errors.length > 0);
    });

    it('returns 422 with correct field name for invalid wallet_address', async () => {
        const res = await request(app)
            .post('/api/academies')
            .send(validBody({ wallet_address: 'not-an-address' }));

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 for invalid academy type', async () => {
        const res = await request(app)
            .post('/api/academies')
            .send(validBody({ type: 'spaceship' }));

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'type');
        assert.ok(field, 'errors should contain a type entry');
    });

    it('returns 422 for invalid website URL', async () => {
        const res = await request(app)
            .post('/api/academies')
            .send(validBody({ website: 'not-a-url' }));

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'website');
        assert.ok(field, 'errors should contain a website entry');
    });

    it('returns 422 when each required field is missing', async () => {
        const requiredFields = [
            'email',
            'wallet_address',
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
            .send(validBody());

        assert.equal(res.status, 500);
        assert.equal(res.body.success, false);
    });
});