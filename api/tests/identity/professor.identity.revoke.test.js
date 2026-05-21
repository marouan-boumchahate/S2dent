import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const PROFESSOR_WALLET = ethers.getAddress('0x8fa1b2c3d4e5f67890123456789abcdefabcdef0');
const PROFESSOR_WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';
const PROFESSOR_EMAIL = 'prof.smith@fenerbahce.edu.tr';
const ACADEMY_WALLET = '0x1111111111111111111111111111111111111111';
const ACADEMY_WALLET_UPPER = '0x1111111111111111111111111111111111111111';
const ACADEMY_WALLET_LOWER = ACADEMY_WALLET.toLowerCase();

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const seedAcademy = async ({
    email = 'academy@fenerbahce.edu.tr',
    wallet_address = ACADEMY_WALLET,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
} = {}) => {
    const { rows: [{ nextval }] } = await db.query(
        `SELECT nextval('academy_seq')`
    );
    const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`;

    const legalName = `${academy_name} Legal ${nextval}`;
    const registrationNumber = `REG-${nextval}`;
    const taxId = `TAX-${nextval}`;
    const billingEmail = `billing-${nextval}@fenerbahce.edu.tr`;

    const { rows: [academy] } = await db.query(
        `INSERT INTO academies (
            academy_number, name, short_name, type,
            email, legal_name, registration_number, tax_id, billing_email
        )
         VALUES ($1, $2, $3, 'university', $4, $5, $6, $7, $8)
         RETURNING id, name`,
        [
            academyNumber,
            academy_name,
            short_name.toUpperCase(),
            email,
            legalName,
            registrationNumber,
            taxId,
            billingEmail,
        ],
    );

    await db.query(
        `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
         VALUES ($1, $2, $3, 'academy', NOW())`,
        [academy.id, wallet_address, ethers.Wallet.createRandom().signingKey.publicKey],
    );

    const { rows: [department] } = await db.query(
        `INSERT INTO departments (academy_id, code, name, faculty, total_years, is_active)
         VALUES ($1, 'CS', 'Computer Science', 'Engineering', 4, true)
         RETURNING id`,
        [academy.id],
    );

    return { academy, department };
};

let userColumnCache = null;

const getUserColumns = async () => {
    if (userColumnCache) return userColumnCache;
    const { rows } = await db.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = 'users'`
    );
    userColumnCache = new Set(rows.map((r) => r.column_name));
    return userColumnCache;
};

const seedProfessorUser = async ({
    email = PROFESSOR_EMAIL,
    first_name = 'John',
    middle_name = null,
    last_name = 'Smith',
    full_name = 'John Smith',
    date_of_birth = '1980-01-01',
    gender = 'male',
    national_id = `NID-${Math.random().toString(16).slice(2, 10)}`,
    nationality = 'Turkish',
    employee_number = 'EMP-001',
    title = 'Dr.',
    rank = 'Prof',
    hire_date = '2010-01-01',
    employment_type = 'full_time',
    department_id = null,
    academy_id = null,
    address_city = 'Istanbul',
    address_country = 'Turkey',
    create_address = true,
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

    if (columns.has('is_active')) {
        insertCols.push('is_active');
        insertVals.push(true);
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

    if (academy_id && department_id) {
        await db.query(
            `INSERT INTO professors (
                user_id, academy_id, department_id,
                employee_number, title, rank, hire_date, employment_type
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                user.id,
                academy_id,
                department_id,
                employee_number,
                title,
                rank,
                hire_date,
                employment_type,
            ],
        );
    }

    if (create_address) {
        await db.query(
            `INSERT INTO addresses (user_id, city, country)
             VALUES ($1, $2, $3)`,
            [user.id, address_city, address_country],
        );
    }

    return user;
};

const seedProfessorIdentity = async ({ user_id, wallet_address = PROFESSOR_WALLET } = {}) => {
    await db.query(
        `INSERT INTO identities (user_id, wallet_address, role, issued_at)
         VALUES ($1, $2, 'professor', NOW())`,
        [user_id, wallet_address],
    );
};

const cleanupDB = async () => {
    await db.query(
        `DELETE FROM identities
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
            )`,
        [PROFESSOR_WALLET, ACADEMY_WALLET],
    );

    await db.query(
        `DELETE FROM pending_transactions
         WHERE tx_hash = $1
            OR payload->>'wallet_address' = $2`,
        [FAKE_TX_HASH, PROFESSOR_WALLET],
    );

    await db.query(
        `DELETE FROM addresses
         WHERE academy_id IN (
            SELECT id FROM academies
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
               OR name LIKE 'Fenerbahce%'
        )`,
    );

    await db.query(
        `DELETE FROM addresses
         WHERE user_id IN (
            SELECT id FROM users
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
        )`,
    );

    await db.query(
        `DELETE FROM professors
         WHERE user_id IN (
            SELECT id FROM users
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
        )`,
    );

    await db.query(
        `DELETE FROM departments
         WHERE academy_id IN (
            SELECT id FROM academies
            WHERE email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
               OR name LIKE 'Fenerbahce%'
        )`,
    );

    await db.query(
        `DELETE FROM academies
         WHERE email LIKE '%@fenerbahce%'
            OR email LIKE '%@test-identity%'
            OR name LIKE 'Fenerbahce%'`,
    );

    await db.query(
        `DELETE FROM users
         WHERE email LIKE '%@fenerbahce%'
            OR email LIKE '%@test-identity%'`,
    );
};

const DEFAULT_BLOCKCHAIN_IMPL = {
    issueProfessorIdentity: async () => FAKE_TX,
    revokeProfessorIdentity: async () => FAKE_TX,
    getProfessorIdentity: async () => null,
};

const issueAccessToken = (payload = {}) => signTokens(
    { sub: ACADEMY_WALLET, role: 'academy', ...payload },
    undefined,
    true,
).accessToken;

const makeApp = async (
    blockchainImpl = {},
    listenerImpl = { listenOnTransaction: () => {} },
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/professor.identity.blockchain.js': {
                ...DEFAULT_BLOCKCHAIN_IMPL,
                ...blockchainImpl,
            },
            '../../src/blockchain/listener.js': listenerImpl,
        },
    );
    return app;
};

const endpoint = '/api/identity/professors/revoke';

describe('POST /api/identity/professors/revoke', function () {
    this.timeout(10000);
    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('returns 200 with professor_wallet and blockchain_transaction on valid input', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id, department_id: department.id });
        await seedProfessorIdentity({ user_id: user.id });

        const app = await makeApp({ revokeProfessorIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken();

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: PROFESSOR_WALLET, revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Professor identity revocation request submitted successfully');

        const { professor_wallet, blockchain_transaction } = res.body.data;

        assert.equal(professor_wallet, PROFESSOR_WALLET);
        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status, 'pending');
    });

    it('normalizes addresses to lowercase before processing', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedProfessorUser({ academy_id: academy.id, department_id: department.id });
        await seedProfessorIdentity({ user_id: user.id });

        const calls = [];
        const app = await makeApp({
            revokeProfessorIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        });
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET_UPPER });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: PROFESSOR_WALLET_UPPER, revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].reason, 'Identity requested by academy');
    });

    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id, department_id: department.id });
        await seedProfessorIdentity({ user_id: user.id });

        const app = await makeApp({ revokeProfessorIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken();

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: PROFESSOR_WALLET, revocation_reason: 'Identity requested by academy' });

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address, PROFESSOR_WALLET);
        assert.equal(pending.payload.reason, 'Identity requested by academy');
        assert.equal(pending.payload.email, PROFESSOR_EMAIL);
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id, department_id: department.id });
        await seedProfessorIdentity({ user_id: user.id });

        const listenerCalls = [];
        const app = await makeApp(
            { revokeProfessorIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
        );
        const academyToken = issueAccessToken();

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: PROFESSOR_WALLET, revocation_reason: 'Identity requested by academy' });

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

    it('returns 404 PROFESSOR_NOT_FOUND when identity does not exist', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({ revokeProfessorIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken();

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: PROFESSOR_WALLET, revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'PROFESSOR_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id, department_id: department.id });
        await seedProfessorIdentity({ user_id: user.id });

        const app = await makeApp({
            revokeProfessorIdentity: async () => {
                const err = new Error('revokeProfessorIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });
        const academyToken = issueAccessToken();

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: PROFESSOR_WALLET, revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id, department_id: department.id });
        await seedProfessorIdentity({ user_id: user.id });

        const app = await makeApp({
            revokeProfessorIdentity: async () => {
                const err = new Error('revokeProfessorIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });
        const academyToken = issueAccessToken();

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: PROFESSOR_WALLET, revocation_reason: 'Identity requested by academy' });

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('returns 401 when token is missing', async () => {
        const app = await makeApp({ revokeProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ professor_address: PROFESSOR_WALLET });

        assert.equal(res.status, 401);
    });

    it('returns 422 VALIDATION_ERROR when professor_address is missing', async () => {
        const app = await makeApp({ revokeProfessorIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken();

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'professor_address');
        assert.ok(field, 'errors should contain a professor_address entry');
    });

    it('returns 403 when role is not academy', async () => {
        const app = await makeApp({ revokeProfessorIdentity: async () => FAKE_TX });
        const studentToken = issueAccessToken({ role: 'student' });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({});

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('returns 422 VALIDATION_ERROR for an invalid professor_address format', async () => {
        const app = await makeApp({ revokeProfessorIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken();

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ professor_address: 'not-a-wallet', revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'professor_address');
        assert.ok(field, 'errors should contain a professor_address entry');
    });
});
