import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';


const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS = '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0';
const WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';

const FAKE_CERT = {
    fingerprint:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    certificatePem: '-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----',
    chainPem: '-----BEGIN CERTIFICATE-----\nFAKECHAIN\n-----END CERTIFICATE-----',
    notBefore: '2024-01-01T00:00:00.000Z',
    notAfter: '2025-01-01T00:00:00.000Z',
};

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const DEFAULT_CA_ATTRS = {
    getAcademyCertificateAttrs:  () => ({ fake: 'attrs' }),
    getProfessorCertificateAttrs: () => ({ fake: 'attrs' }),
};
const DEFAULT_CA_IDENTITY = { buildIdentityCertificate: async () => FAKE_CERT };

const seedAcademyUser = async ({
    email = 'seed@fenerbahce.edu.tr',
    wallet_address = WALLET_ADDRESS,
    role = 'academy_admin',
    is_identity_issued = false,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
    country = 'Turkey'
} = {}) => {
    const { rows: [user] } = await db.query(
        `INSERT INTO users (email, wallet_address, role, is_identity_issued)
             VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [email, wallet_address, role, is_identity_issued],
    );

    const { rows: [{ nextval }] } = await db.query(
        `SELECT nextval('academy_seq')`
    );
    const SEED_ACADEMY_NUMBER = `ACD_${String(nextval).padStart(7, '0')}`;

    const academyEmail = `academy-${nextval}@fenerbahce.edu.tr`;
    const legalName = `${academy_name} Legal ${nextval}`;
    const registrationNumber = `REG-${nextval}`;
    const taxId = `TAX-${nextval}`;

    const { rows: [academy] } = await db.query(
        `INSERT INTO academies (
            wallet_address, academy_number, name, short_name, type,
            email, legal_name, registration_number, tax_id
         )
         VALUES ($1, $2, $3, $4, 'university', $5, $6, $7, $8)
         RETURNING id`,
        [
            wallet_address,
            SEED_ACADEMY_NUMBER,
            academy_name,
            short_name,
            academyEmail,
            legalName,
            registrationNumber,
            taxId,
        ],
    );

    await db.query(
        `INSERT INTO addresses (academy_id, city, country)
         VALUES ($1, 'Istanbul', $2)`,
        [academy.id, country],
    );

    return { user, academy };
};

const cleanupDB = async () => {
    await db.query(`
        DELETE FROM identity_certificates
        WHERE wallet_address = $1
    `, [WALLET_ADDRESS]);

    await db.query(`
        DELETE FROM pending_transactions
        WHERE payload->>'wallet_address' = $1
    `, [WALLET_ADDRESS]);

    await db.query(`
        DELETE FROM addresses
        WHERE academy_id IN (
            SELECT id FROM academies WHERE wallet_address = $1
        )
    `, [WALLET_ADDRESS]);

    await db.query(`
        DELETE FROM academies
        WHERE wallet_address = $1
    `, [WALLET_ADDRESS]);
    await db.query(`
        DELETE FROM users
        WHERE email LIKE '%@fenerbahce%'
            OR email LIKE '%@test-identity%'
    `);
};


const makeApp = async (
    blockchainImpl  = { issueAcademyIdentity: async () => FAKE_TX },
    listenerImpl    = { listenOnTransaction: () => {} },
    caAttrsImpl     = {},
    caIdentityImpl  = DEFAULT_CA_IDENTITY,
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/academy.identity.blockchain.js': blockchainImpl,
            '../../src/blockchain/listener.js': listenerImpl,
            '../../src/ca/ca.attrs.js': { ...DEFAULT_CA_ATTRS, ...caAttrsImpl },
            '../../src/ca/ca.identity.js': caIdentityImpl,
        },
    );
    return app;
};

beforeEach(async () => { await cleanupDB(); });
afterEach(async ()  => { await cleanupDB(); });

const endpoint = '/api/identity/academies/issue';


describe('POST /api/identity/academies/issue', () => {

    it('returns 200 with blockchain_transaction and certificate_metadata on valid input', async () => {
        await seedAcademyUser();

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Academy identity issuance request submitted successfully');

        const { blockchain_transaction, certificate_metadata } = res.body.data;

        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status,  'pending');

        assert.ok(certificate_metadata, 'certificate_metadata should be present');
        assert.equal(certificate_metadata.certificate_hash, FAKE_CERT.fingerprint);
        assert.equal(certificate_metadata.issued_at, FAKE_CERT.notBefore);
        assert.equal(certificate_metadata.expires_at, FAKE_CERT.notAfter);
    });

    it('normalizes wallet_address to lowercase before querying', async () => {
        await seedAcademyUser({ wallet_address: WALLET_ADDRESS });

        const calls = [];
        const app = await makeApp({
            issueAcademyIdentity: async (...args) => { calls.push(args); return FAKE_TX; },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_UPPER });

        assert.equal(res.status, 200);
        assert.equal(calls[0][0].walletAddress, WALLET_ADDRESS);
    });


    it('passes the correct payload to issueAcademyIdentity', async () => {
        await seedAcademyUser({
            academy_name: 'Fenerbahce University',
            short_name: 'FBU',
        });

        const calls = [];
        const app = await makeApp({
            issueAcademyIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(calls.length, 1);

        const call = calls[0];
        assert.equal(call.walletAddress, WALLET_ADDRESS, 'wallet must be normalised');
        assert.match(call.academyNumber, /^ACD_[0-9]{7}$/, 'academyNumber must match ACD_ format');
        assert.equal(call.name, 'Fenerbahce University', 'academy name must match');
        assert.equal(call.shortName, 'FBU', 'short name must match');
        assert.equal(call.country, 'Turkey', 'country must be passed');
        assert.equal(call.academyType, 0, 'university maps to uint8 0');
        assert.equal(call.certificatePem, FAKE_CERT.certificatePem);
        assert.equal(call.chainPem, FAKE_CERT.chainPem);
        assert.equal(call.fingerprint, FAKE_CERT.fingerprint, 'fingerprint must come from the certificate');
        assert.equal(call.notBefore, FAKE_CERT.notBefore, 'notBefore must come from the certificate');
        assert.equal(call.notAfter, FAKE_CERT.notAfter, 'notAfter must come from the certificate');
    });

    it('passes the correct attrs to getAcademyCertificateAttrs', async () => {
        await seedAcademyUser({
            academy_name: 'Fenerbahce University',
            short_name: 'FBU',
        });

        const attrCalls = [];
        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            {
                getAcademyCertificateAttrs: (wallet, number, name, shortName) => {
                    attrCalls.push({ wallet, number, name, shortName });
                    return { fake: 'attrs' };
                },
            },
        );

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(attrCalls.length, 1);
        assert.equal(attrCalls[0].wallet, WALLET_ADDRESS);
        assert.match(attrCalls[0].number, /^ACD_[0-9]{7}$/);
        assert.equal(attrCalls[0].name, 'Fenerbahce University');
        assert.equal(attrCalls[0].shortName, 'FBU');
    });


    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy } = await seedAcademyUser();

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address, WALLET_ADDRESS);
        assert.ok(pending.payload.email, 'payload must contain email');
    });

    it('inserts an identity_certificate row after successful submission', async () => {
        await seedAcademyUser();

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows: [cert] } = await db.query(
            `SELECT * FROM identity_certificates WHERE wallet_address = $1`,
            [WALLET_ADDRESS],
        );

        assert.ok(cert, 'identity_certificates row should exist');
        assert.equal(cert.certificate_pem, FAKE_CERT.certificatePem);
        assert.equal(cert.chain_pem, FAKE_CERT.chainPem);
        assert.equal(cert.fingerprint, FAKE_CERT.fingerprint);
    });

    it('does NOT update users table immediately after submission (listener not yet triggered)', async () => {
        const { user } = await seedAcademyUser();

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows: [unchanged] } = await db.query(
            'SELECT is_identity_issued, identity_tx_hash FROM users WHERE id = $1',
            [user.id],
        );

        assert.equal(unchanged.is_identity_issued, false);
        assert.equal(unchanged.identity_tx_hash, null);
    });


    it('fires listenOnTransaction in the background after submission', async () => {
        await seedAcademyUser();

        const listenerCalls = [];
        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
        );

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

 
    it('returns 404 ACADEMY_NOT_FOUND when wallet has no academy row', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: '0x0000000000000000000000000000000000000001' });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 200 when user role is not academy_admin (route does not enforce role)', async () => {
        await seedAcademyUser({ role: 'professor' });

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 200);
    });

    it('returns 200 when user.is_identity_issued is already true (not checked for academies)', async () => {
        await seedAcademyUser({ is_identity_issued: true });

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 200);
    });

    it('returns 404 ACADEMY_NOT_FOUND when user exists but has no academy row', async () => {
        await db.query(
            `INSERT INTO users (email, wallet_address, role, is_identity_issued)
                 VALUES ('orphan@test-identity.edu', $1, 'academy_admin', false)`,
            [WALLET_ADDRESS],
        );

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('does not insert an identity_certificate when blockchain submission fails', async () => {
        await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows } = await db.query(
            `SELECT * FROM identity_certificates WHERE wallet_address = $1`,
            [WALLET_ADDRESS],
        );
        assert.equal(rows.length, 0,
            'No certificate row should be written when the blockchain call reverts');
    });


    it('returns 422 VALIDATION_ERROR when wallet_address is missing', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors array should contain a wallet_address entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid wallet_address format', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: 'not-a-wallet' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors array should contain a wallet_address entry');
    });
});