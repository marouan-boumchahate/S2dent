import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import crypto from 'crypto';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';


const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS = ethers.getAddress('0x8fa1b2c3d4e5f67890123456789abcdefabcdef0');
const WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';

const FAKE_CERT = {
    fingerprint:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    certificatePem: '-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----',
    chainPem: '-----BEGIN CERTIFICATE-----\nFAKECHAIN\n-----END CERTIFICATE-----',
    notBefore: '2024-01-01T00:00:00.000Z',
    notAfter: '2025-01-01T00:00:00.000Z',
};

const ISSUE_OTP = 'ABC123';
const ISSUE_MESSAGE = 'academy-identity-otp-challenge';
const ISSUE_SIGNER = ethers.Wallet.createRandom();
const ISSUE_SIGNER_ADDRESS = ethers.getAddress(ISSUE_SIGNER.address);
const ISSUE_SIGNER_PUBLIC_KEY = ISSUE_SIGNER.signingKey.publicKey;
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';
const NON_EXISTENT_ID_2 = '00000000-0000-0000-0000-000000000001';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const DEFAULT_CA_ATTRS = {
    getAcademyCertificateAttrs:  () => ({ fake: 'attrs' }),
    getProfessorCertificateAttrs: () => ({ fake: 'attrs' }),
};
const DEFAULT_CA_IDENTITY = { buildIdentityCertificate: async () => FAKE_CERT };

const buildCachePayload = ({ id, role = 'academy', message = ISSUE_MESSAGE }) => JSON.stringify({
    id,
    role,
    message,
});

const buildIssueBody = async (email) => ({
    email,
    otp: ISSUE_OTP,
    signature: await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE),
});

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

const seedUser = async ({
    email,
    wallet_address = WALLET_ADDRESS,
    role = 'academy',
    is_identity_issued = false,
    first_name = 'Seed',
    middle_name = null,
    last_name = 'User',
    full_name = 'Seed User',
    date_of_birth = '1980-01-01',
    gender = 'male',
    national_id = `NID-${Math.random().toString(16).slice(2, 10)}`,
    nationality = 'Turkish',
} = {}) => {
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
    ];
    const insertVals = [
        first_name,
        middle_name,
        last_name,
        full_name,
        date_of_birth,
        gender,
        national_id,
        email,
        null,
        null,
    ];

    if (columns.has('nationality')) {
        insertCols.push('nationality');
        insertVals.push(nationality);
    }

    if (columns.has('wallet_address')) {
        insertCols.push('wallet_address');
        insertVals.push(wallet_address);
    }
    if (columns.has('role')) {
        insertCols.push('role');
        insertVals.push(role);
    }
    if (columns.has('is_identity_issued')) {
        insertCols.push('is_identity_issued');
        insertVals.push(is_identity_issued);
    }

    if (columns.has('notes')) {
        insertCols.push('notes');
        insertVals.push(null);
    }

    const placeholders = insertVals.map((_, idx) => `$${idx + 1}`).join(', ');

    const { rows: [user] } = await db.query(
        `INSERT INTO users (${insertCols.join(', ')})
         VALUES (${placeholders})
         RETURNING id, email`,
        insertVals,
    );

    return user;
};

const seedAcademyUser = async ({
    email = 'seed@fenerbahce.edu.tr',
    wallet_address = WALLET_ADDRESS,
    role = 'academy',
    is_identity_issued = false,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
    country = 'Turkey'
} = {}) => {
    const user = await seedUser({
        email,
        wallet_address,
        role,
        is_identity_issued,
    });

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
            academy_number, name, short_name, type,
            email, legal_name, registration_number, tax_id
         )
         VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
         RETURNING id`,
        [
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
        DELETE FROM identities
        WHERE wallet_address = $1
           OR wallet_address = $2
           OR academy_id IN (
               SELECT id FROM academies
               WHERE email LIKE '%@fenerbahce%'
                  OR email LIKE '%@test-identity%'
                  OR name LIKE 'Fenerbahce%'
           )
           OR user_id IN (
               SELECT id FROM users
               WHERE email LIKE '%@fenerbahce%'
                  OR email LIKE '%@test-identity%'
           )
    `, [WALLET_ADDRESS, ISSUE_SIGNER_ADDRESS]);

    await db.query(`
        DELETE FROM identity_certificates
        WHERE wallet_address = $1
           OR wallet_address = $2
           OR fingerprint = $3
    `, [WALLET_ADDRESS, ISSUE_SIGNER_ADDRESS, FAKE_CERT.fingerprint]);

    await db.query(`
        DELETE FROM pending_transactions
        WHERE tx_hash = $1
           OR payload->>'wallet_address' = $2
           OR payload->>'wallet_address' = $3
    `, [FAKE_TX_HASH, WALLET_ADDRESS, ISSUE_SIGNER_ADDRESS]);

    await db.query(`
        DELETE FROM addresses
        WHERE academy_id IN (
            SELECT id FROM academies
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
               OR name LIKE 'Fenerbahce%'
        )
    `);

    await db.query(`
        DELETE FROM addresses
        WHERE user_id IN (
            SELECT id FROM users
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
        )
    `);

    await db.query(`
        DELETE FROM professors
        WHERE user_id IN (
            SELECT id FROM users
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
        )
    `);

    await db.query(`
        DELETE FROM students
        WHERE user_id IN (
            SELECT id FROM users
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
        )
    `);

    await db.query(`
        DELETE FROM departments
        WHERE academy_id IN (
            SELECT id FROM academies
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
               OR name LIKE 'Fenerbahce%'
        )
    `);

    await db.query(`
        DELETE FROM academies
        WHERE email LIKE '%@fenerbahce%'
           OR email LIKE '%@test-identity%'
           OR name LIKE 'Fenerbahce%'
    `);
    
    await db.query(`
        DELETE FROM users
        WHERE email LIKE '%@fenerbahce%'
            OR email LIKE '%@test-identity%'
    `);
};


const DEFAULT_BLOCKCHAIN_IMPL = {
    issueAcademyIdentity: async () => FAKE_TX,
    revokeAcademyIdentity: async () => FAKE_TX,
    getAcademyIdentity: async () => null,
};

const DEFAULT_CACHE_IMPL = {
    getCache: async () => null,
    setCache: async () => {},
    delCache: async () => {},
};

const makeApp = async (
    blockchainImpl  = {},
    listenerImpl    = { listenOnTransaction: () => {} },
    cacheImpl       = {},
    caAttrsImpl     = {},
    caIdentityImpl  = DEFAULT_CA_IDENTITY,
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/academy.identity.blockchain.js': { ...DEFAULT_BLOCKCHAIN_IMPL, ...blockchainImpl },
            '../../src/blockchain/listener.js': listenerImpl,
            '../../src/cache/cache.client.js': { ...DEFAULT_CACHE_IMPL, ...cacheImpl },
            '../../src/ca/ca.attrs.js': { ...DEFAULT_CA_ATTRS, ...caAttrsImpl },
            '../../src/ca/ca.identity.js': caIdentityImpl,
        },
    );
    return app;
};

const endpoint = '/api/identity/academies/issue';


describe('POST /api/identity/academies/issue', function () {
    this.timeout(15000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async ()  => { await cleanupDB(); });

    it('returns 200 with blockchain_transaction and certificate_metadata on valid input', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
        );

        const res = await request(app)
            .post(endpoint)
            .send(body);

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
        const { academy } = await seedAcademyUser({ wallet_address: WALLET_ADDRESS });

        const cacheCalls = [];
        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        }, { listenOnTransaction: () => {} }, {
            getCache: async (key) => {
                cacheCalls.push(key);
                return buildCachePayload({ id: academy.id });
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'seed@fenerbahce.edu.tr', otp: ISSUE_OTP, signature: await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE) });

        assert.equal(res.status, 200);
        assert.equal(cacheCalls.length, 1);
        const expectedKey = `otp:${crypto.createHash('sha256').update(`seed@fenerbahce.edu.tr:${ISSUE_OTP}`).digest('hex')}`;
        assert.equal(cacheCalls[0], expectedKey);
    });


    it('passes the correct payload to issueAcademyIdentity', async () => {
        const { academy } = await seedAcademyUser({
            academy_name: 'Fenerbahce University',
            short_name: 'FBU',
        });

        const signature = await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE);
        const calls = [];
        const app = await makeApp({
            issueAcademyIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: academy.id }),
        });

        await request(app)
            .post(endpoint)
            .send({ email: 'seed@fenerbahce.edu.tr', otp: ISSUE_OTP, signature });

        assert.equal(calls.length, 1);

        const call = calls[0];
        assert.equal(call.academyAddress, ISSUE_SIGNER_ADDRESS, 'academyAddress must come from the signer');
        assert.equal(call.publicKey, ISSUE_SIGNER_PUBLIC_KEY, 'publicKey must come from the signer');
        assert.match(call.academyNumber, /^ACD_[0-9]{7}$/, 'academyNumber must match ACD_ format');
        assert.equal(call.name, 'Fenerbahce University', 'academy name must match');
        assert.equal(call.shortName, 'FBU', 'short name must match');
        assert.equal(call.academyType, 'university', 'academyType must be passed as string');
        assert.match(call.legalName, /^Fenerbahce University Legal [0-9]+$/);
        assert.match(call.registrationNumber, /^REG-[0-9]+$/);
        assert.match(call.taxId, /^TAX-[0-9]+$/);
        assert.equal(call.billingEmail, '', 'missing billingEmail should be mapped to empty string');
        assert.equal(call.certificatePem, FAKE_CERT.certificatePem);
        assert.equal(call.chainPem, FAKE_CERT.chainPem);
        assert.equal(call.fingerprint, FAKE_CERT.fingerprint, 'fingerprint must come from the certificate');
        assert.equal(call.notBefore, FAKE_CERT.notBefore, 'notBefore must come from the certificate');
        assert.equal(call.notAfter, FAKE_CERT.notAfter, 'notAfter must come from the certificate');
    });

    it('passes the correct attrs to getAcademyCertificateAttrs', async () => {
        const { academy } = await seedAcademyUser({
            academy_name: 'Fenerbahce University',
            short_name: 'FBU',
        });

        const signature = await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE);
        const attrCalls = [];
        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
            {
                getAcademyCertificateAttrs: (wallet, number, name, shortName) => {
                    attrCalls.push({ wallet, number, name, shortName });
                    return { fake: 'attrs' };
                },
            },
        );

        await request(app)
            .post(endpoint)
            .send({ email: 'seed@fenerbahce.edu.tr', otp: ISSUE_OTP, signature });

        assert.equal(attrCalls.length, 1);
        assert.equal(attrCalls[0].wallet, ISSUE_SIGNER_ADDRESS);
        assert.match(attrCalls[0].number, /^ACD_[0-9]{7}$/);
        assert.equal(attrCalls[0].name, 'Fenerbahce University');
        assert.equal(attrCalls[0].shortName, 'FBU');
    });


    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
        );

        await request(app)
            .post(endpoint)
            .send(body);

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address, ISSUE_SIGNER_ADDRESS);
        assert.ok(pending.payload.email, 'payload must contain email');
    });

    it('inserts an identity_certificate row after successful submission', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
        );

        await request(app)
            .post(endpoint)
            .send(body);

        const { rows: [cert] } = await db.query(
            `SELECT * FROM identity_certificates WHERE wallet_address = $1`,
            [ISSUE_SIGNER_ADDRESS],
        );

        assert.ok(cert, 'identity_certificates row should exist');
        assert.equal(cert.certificate_pem, FAKE_CERT.certificatePem);
        assert.equal(cert.chain_pem, FAKE_CERT.chainPem);
        assert.equal(cert.fingerprint, FAKE_CERT.fingerprint);
    });

    it('does NOT insert into identities immediately after submission (listener not yet triggered)', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
        );

        await request(app)
            .post(endpoint)
            .send(body);

        const { rows } = await db.query(
            'SELECT id FROM identities WHERE wallet_address = $1',
            [ISSUE_SIGNER_ADDRESS],
        );

        assert.equal(rows.length, 0);
    });


    it('fires listenOnTransaction in the background after submission', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const listenerCalls = [];
        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
        );

        await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

 
    it('returns 404 ACADEMY_NOT_FOUND when wallet has no academy row', async () => {
        const signature = await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE);
        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: NON_EXISTENT_ID, role: 'academy' }),
        });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'ghost@test-identity.edu', otp: ISSUE_OTP, signature });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 409 ACADEMY_ADDRESS_REQUIRED when academy has no address row', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');
        await db.query(
            `DELETE FROM addresses
             WHERE academy_id = $1`,
            [academy.id],
        );

        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: academy.id }),
        });

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'ACADEMY_ADDRESS_REQUIRED');
    });

    it('returns 404 ACADEMY_NOT_FOUND when cached role is not academy', async () => {
        await seedAcademyUser({ role: 'professor' });
        const signature = await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE);

        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: 1, role: 'professor' }),
        });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'seed@fenerbahce.edu.tr', otp: ISSUE_OTP, signature });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 200 when user.is_identity_issued is already true (not checked for academies)', async () => {
        const { academy } = await seedAcademyUser({ is_identity_issued: true });
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: () => {} },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
        );

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 200);
    });

    it('returns 404 ACADEMY_NOT_FOUND when user exists but has no academy row', async () => {
        await seedUser({
            email: 'orphan@test-identity.edu',
            wallet_address: WALLET_ADDRESS,
            role: 'academy',
            is_identity_issued: false,
            first_name: 'Orphan',
            last_name: 'User',
            full_name: 'Orphan User',
        });

        const signature = await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE);
        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: NON_EXISTENT_ID_2, role: 'academy' }),
        });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'orphan@test-identity.edu', otp: ISSUE_OTP, signature });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: academy.id }),
        });

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: academy.id }),
        });

        await request(app)
            .post(endpoint)
            .send(body);

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('does not insert an identity_certificate when blockchain submission fails', async () => {
        const { academy } = await seedAcademyUser();
        const body = await buildIssueBody('seed@fenerbahce.edu.tr');

        const app = await makeApp(
            {
                issueAcademyIdentity: async () => {
                    const err = new Error('issueAcademyIdentity failed: execution reverted');
                    err.statusCode = 502;
                    err.code = 'BLOCKCHAIN_ERROR';
                    throw err;
                },
            },
            { listenOnTransaction: () => {} },
            { getCache: async () => buildCachePayload({ id: academy.id }) },
        );

        await request(app)
            .post(endpoint)
            .send(body);

        const { rows } = await db.query(
            `SELECT * FROM identity_certificates WHERE wallet_address = $1`,
            [ISSUE_SIGNER_ADDRESS],
        );
        assert.equal(rows.length, 0,
            'No certificate row should be written when the blockchain call reverts');
    });


    it('returns 422 VALIDATION_ERROR when otp is missing', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'seed@fenerbahce.edu.tr', signature: await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE) });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const field = res.body.errors.find(e => e.field === 'otp');
        assert.ok(field, 'errors array should contain an otp entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid otp format', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'seed@fenerbahce.edu.tr', otp: '12', signature: await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE) });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'otp');
        assert.ok(field, 'errors array should contain an otp entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid signature format', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'seed@fenerbahce.edu.tr', otp: ISSUE_OTP, signature: 'not-a-signature' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'signature');
        assert.ok(field, 'errors array should contain a signature entry');
    });
});