import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';


const FAKE_TX_HASH    = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS  = '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0';
const WALLET_UPPER    = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';
const PROFESSOR_EMAIL = 'prof.smith@fenerbahce.edu.tr';
const ACADEMY_WALLET  = '0x1111111111111111111111111111111111111111';

const FAKE_CERT = {
    fingerprint:    'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD',
    certificatePem: '-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----',
    chainPem:       '-----BEGIN CERTIFICATE-----\nFAKECHAIN\n-----END CERTIFICATE-----',
    notBefore:      '2024-01-01T00:00:00.000Z',
    notAfter:       '2025-01-01T00:00:00.000Z',
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


const seedAcademy = async ({
    email = 'academy@fenerbahce.edu.tr',
    wallet_address = ACADEMY_WALLET,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
} = {}) => {
    const { rows: [academyUser] } = await db.query(
        `INSERT INTO users (email, wallet_address, role, is_identity_issued)
             VALUES ($1, $2, 'academy_admin', true)
         RETURNING id`,
        [email, wallet_address],
    );

    const { rows: [{ nextval }] } = await db.query(
        `SELECT nextval('academy_seq')`
    );
    const SEED_ACADEMY_NUMBER = `ACD_${String(nextval).padStart(7, '0')}`;

    const { rows: [academy] } = await db.query(
        `INSERT INTO academies (user_id, academy_number, name, short_name, type, country, city)
             VALUES ($1, $2, $3, $4, 'university', 'Turkey', 'Istanbul')
         RETURNING id`,
        [academyUser.id, SEED_ACADEMY_NUMBER, academy_name, short_name],
    );

    return { academyUser, academy };
};

const seedProfessorUser = async ({
    email = PROFESSOR_EMAIL,
    wallet_address = null,
    role = 'professor',
    is_identity_issued = false,
    full_name = 'John Smith',
    employee_number = 'EMP-001',
    department = 'Computer Science',
    title = 'Dr.',
    faculty = 'Engineering',
    academy_id = null,
} = {}) => {
    const { rows: [user] } = await db.query(
        `INSERT INTO users (email, wallet_address, role, is_identity_issued)
             VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [email, wallet_address, role, is_identity_issued],
    );

    if (academy_id) {
        await db.query(
            `INSERT INTO professors (user_id, full_name, employee_number, department, title, faculty, academy_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [user.id, full_name, employee_number, department, title, faculty, academy_id],
        );
    }

    return user;
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
        DELETE FROM professors
        USING users
        WHERE professors.user_id = users.id
            AND (
                users.email LIKE '%@fenerbahce%'
                OR users.email LIKE '%@test-identity%'
            )
    `);
    await db.query(`
        DELETE FROM academies
        USING users
        WHERE academies.user_id = users.id
            AND (
                users.email LIKE '%@fenerbahce%'
                OR users.email LIKE '%@test-identity%'
            )
    `);
    await db.query(`
        DELETE FROM users
        WHERE email LIKE '%@fenerbahce%'
            OR email LIKE '%@test-identity%'
    `);
};


const makeApp = async (
    blockchainImpl  = { issueProfessorIdentity: async () => FAKE_TX },
    listenerImpl    = { listenOnTransaction: () => {} },
    caAttrsImpl     = {},
    caIdentityImpl  = DEFAULT_CA_IDENTITY,
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/professor.identity.blockchain.js': blockchainImpl,
            '../../src/blockchain/listener.js': listenerImpl,
            '../../src/ca/ca.attrs.js': { ...DEFAULT_CA_ATTRS, ...caAttrsImpl },
            '../../src/ca/ca.identity.js': caIdentityImpl,
        },
    );
    return app;
};


beforeEach(async () => { await cleanupDB(); });
afterEach(async ()  => { await cleanupDB(); });

const endpoint = '/api/identity/professors/issue';


describe('POST /api/identity/professors/issue', () => {

    it('returns 200 with blockchain_transaction and certificate_metadata on valid input', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status,         200);
        assert.equal(res.body.success,   true);
        assert.equal(res.body.message,   'Professor identity issuance request submitted successfully');

        const { blockchain_transaction, certificate_metadata } = res.body.data;

        // blockchain_transaction block
        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status,  'pending');

        // certificate_metadata block
        assert.ok(certificate_metadata, 'certificate_metadata should be present');
        assert.equal(certificate_metadata.certificate_hash, FAKE_CERT.fingerprint);
        assert.equal(certificate_metadata.issued_at, FAKE_CERT.notBefore);
        assert.equal(certificate_metadata.expires_at, FAKE_CERT.notAfter);
    });

    it('normalizes wallet_address and email to lowercase before processing', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const calls = [];
        const app = await makeApp({
            issueProfessorIdentity: async (wallet, academyWallet, employeeNumber, fullName, title, department, country, fingerprint, notBefore, notAfter) => {
                calls.push({ wallet, academyWallet, employeeNumber, fullName, title, department, country, fingerprint, notBefore, notAfter });
                return FAKE_TX;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL.toUpperCase(), wallet_address: WALLET_UPPER });

        assert.equal(res.status, 200);
        assert.equal(calls[0].wallet, WALLET_ADDRESS, 'wallet must be lowercased');
    });

    it('passes the correct 10 arguments to issueProfessorIdentity', async () => {
        const { academy } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        await seedProfessorUser({
            academy_id: academy.id,
            full_name: 'John Smith',
            employee_number: 'EMP-001',
            department: 'Computer Science',
            title: 'Dr.',
            faculty: 'Engineering',
        });

        const calls = [];
        const app = await makeApp({
            issueProfessorIdentity: async (wallet, academyWallet, employeeNumber, fullName, title, department, country, fingerprint, notBefore, notAfter) => {
                calls.push({ wallet, academyWallet, employeeNumber, fullName, title, department, country, fingerprint, notBefore, notAfter });
                return FAKE_TX;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(calls.length, 1);

        const call = calls[0];
        assert.equal(call.wallet, WALLET_ADDRESS, 'wallet must be normalised');
        assert.equal(call.academyWallet, ACADEMY_WALLET, 'academy wallet must be passed');
        assert.equal(call.employeeNumber, 'EMP-001', 'employee number must match');
        assert.equal(call.fullName, 'John Smith', 'full name must match');
        assert.equal(call.title, 'Dr.', 'title must match');
        assert.equal(call.department, 'Computer Science', 'department must match');
        assert.equal(call.country, 'Turkey', 'country must be passed from academy');
        assert.equal(call.fingerprint, FAKE_CERT.fingerprint, 'fingerprint must come from the certificate');
        assert.equal(call.notBefore, FAKE_CERT.notBefore, 'notBefore must come from the certificate');
        assert.equal(call.notAfter, FAKE_CERT.notAfter, 'notAfter must come from the certificate');
    });

    it('passes the correct arguments to getProfessorCertificateAttrs', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({
            academy_id: academy.id,
            full_name: 'John Smith',
            employee_number: 'EMP-001',
            department: 'Computer Science',
        });

        const attrCalls = [];
        const app = await makeApp(
            { issueProfessorIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            {
                getProfessorCertificateAttrs: (wallet, employeeNumber, fullName, department, academyName) => {
                    attrCalls.push({ wallet, employeeNumber, fullName, department, academyName });
                    return { fake: 'attrs' };
                },
            },
        );

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(attrCalls.length, 1);
        assert.equal(attrCalls[0].wallet, WALLET_ADDRESS);
        assert.equal(attrCalls[0].employeeNumber, 'EMP-001');
        assert.equal(attrCalls[0].fullName, 'John Smith');
        assert.equal(attrCalls[0].department, 'Computer Science');
        assert.equal(attrCalls[0].academyName, 'Fenerbahce University');
    });

    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address,  WALLET_ADDRESS);
        assert.equal(pending.payload.id, user.id);
        assert.ok(pending.payload.email, 'payload must contain email');
    });

    it('inserts an identity_certificate row after successful submission', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

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
        const { academy } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        const { rows: [unchanged] } = await db.query(
            'SELECT is_identity_issued, identity_tx_hash, wallet_address FROM users WHERE id = $1',
            [user.id],
        );

        assert.equal(unchanged.is_identity_issued, false);
        assert.equal(unchanged.identity_tx_hash, null);
        assert.equal(unchanged.wallet_address, null);
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const listenerCalls = [];
        const app = await makeApp(
            { issueProfessorIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
        );

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

    it('returns 404 USER_NOT_FOUND when email does not exist in DB', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'ghost@test-identity.edu', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'USER_NOT_FOUND');
    });

    it('returns 403 FORBIDDEN when user role is not professor', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, role: 'academy_admin' });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('returns 409 IDENTITY_ALREADY_ISSUED when identity was already issued', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, is_identity_issued: true });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'IDENTITY_ALREADY_ISSUED');
    });

    it('returns 409 WALLET_ADDRESS_ALREADY_ASSOCIATED when user already has a wallet address', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, wallet_address: WALLET_ADDRESS });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'WALLET_ADDRESS_ALREADY_ASSOCIATED');
    });

    it('returns 404 PROFESSOR_NOT_FOUND when user exists but has no professor row', async () => {
        await db.query(
            `INSERT INTO users (email, wallet_address, role, is_identity_issued)
                 VALUES ('orphan@test-identity.edu', NULL, 'professor', false)`,
        );

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'orphan@test-identity.edu', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'PROFESSOR_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({
            issueProfessorIdentity: async () => {
                const err = new Error('issueProfessorIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({
            issueProfessorIdentity: async () => {
                const err = new Error('issueProfessorIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('does not insert an identity_certificate when blockchain submission fails', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({
            issueProfessorIdentity: async () => {
                const err = new Error('issueProfessorIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        const { rows } = await db.query(
            `SELECT * FROM identity_certificates WHERE wallet_address = $1`,
            [WALLET_ADDRESS],
        );
        assert.equal(rows.length, 0,
            'No certificate row should be written when the blockchain call reverts');
    });

    it('returns 422 VALIDATION_ERROR when wallet_address is missing', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 VALIDATION_ERROR when email is missing', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find(e => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid wallet_address format', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: 'not-a-wallet' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid email format', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'not-an-email', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });
});