import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import app from '../../src/app.js';
import db from '../../src/config/db.js';

// MY SETUP
// ========
const validBody = (overrides = {}) => ({
    email: 'admin@fenerbahce.edu.tr',
    walletAddress: '0x8fA1b2C3d4E5F67890123456789abcdefABCDEF0',
    name: 'Fenerbahce University',
    short_name: 'FBU',
    type: 'university',
    country: 'Turkey',
    city: 'Istanbul',
    ...overrides,
});

const cleanupDB = async () => {
    await db.query(`
        DELETE FROM academies
        USING users
        WHERE academies.user_id = users.id
            AND (
            users.email LIKE '%@fenerbahce%'
            OR users.email LIKE '%@test%'
            OR users.wallet_address IN (
                '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0',
                '0x1111222233334444555566667777888899990000',
                '0x2222333344445555666677778888999900001111',
                '0xabcdef1234567890abcdef1234567890abcdef12'
            )
            )
    `);

    await db.query(`
        DELETE FROM users
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
        assert.equal(academy.name,          body.name);
        assert.equal(academy.shortName,     body.short_name);
        assert.equal(academy.type,          body.type);
        assert.equal(academy.email,         body.email);
        assert.equal(academy.country,       body.country);
        assert.equal(academy.city,          body.city);
        assert.equal(academy.walletAddress, body.walletAddress.toLowerCase());
        assert.equal(academy.address,       null);
        assert.equal(academy.website,       null);
    });
    
    it('stores walletAddress lowercased regardless of input casing', async () => {
        const body = validBody({ walletAddress: '0xABCDEF1234567890abcdef1234567890abcdef12' });
    
        const res = await request(app)
        .post('/api/academies')
        .send(body);
    
        assert.equal(res.status, 201);
        assert.equal(
        res.body.data.academy.walletAddress,
        body.walletAddress.toLowerCase()
        );
    });
    
    it('includes optional fields when provided', async () => {
        const body = validBody({
            address: '123 University Ave',
            website: 'https://fenerbahce.edu.tr',
        });
    
        const res = await request(app)
            .post('/api/academies')
            .send(body);
    
        assert.equal(res.status, 201);
        assert.equal(res.body.data.academy.address, body.address);
        assert.equal(res.body.data.academy.website, body.website);
    });
    
    it('returns 409 EMAIL_DUPLICATE when email already exists', async () => {
        // First request — succeeds and creates the row
        await request(app)
            .post('/api/academies')
            .send(validBody());
    
        // Second request — same email, different name and wallet
        const res = await request(app)
            .post('/api/academies')
            .send(validBody({
                name: 'Test Academy 2',
                walletAddress: '0x1111222233334444555566667777888899990000',
            }));
    
        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'EMAIL_DUPLICATE');
    });
    
    it('returns 409 ACADEMY_DUPLICATE when academy name already exists', async () => {
        // First request — succeeds and creates the row
        await request(app)
            .post('/api/academies')
            .send(validBody());
    
        // Second request — same name, different email and wallet
        const res = await request(app)
            .post('/api/academies')
            .send(validBody({
                email: 'other@test.edu.tr',
                walletAddress: '0x2222333344445555666677778888999900001111',
            }));
    
        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_DUPLICATE');
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
    
    it('returns 422 with correct field name for invalid walletAddress', async () => {
        const res = await request(app)
            .post('/api/academies')
            .send(validBody({ walletAddress: 'not-an-address' }));
    
        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'walletAddress');
        assert.ok(field, 'errors should contain a walletAddress entry');
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
        const requiredFields = ['email', 'walletAddress', 'name', 'type', 'country', 'city'];
    
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