import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const STUDENT_WALLET = ethers.getAddress('0x8fa1b2c3d4e5f67890123456789abcdefabcdef0');
const STUDENT_WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';
const STUDENT_EMAIL = 'student.smith@fenerbahce.edu.tr';
const ACADEMY_WALLET = ethers.getAddress('0xa111111111111111111111111111111111111111');
const ACADEMY_WALLET_UPPER = '0xA111111111111111111111111111111111111111';
const ACADEMY_WALLET_LOWER = ACADEMY_WALLET.toLowerCase();

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

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

const seedAcademy = async ({
    email = 'academy@fenerbahce.edu.tr',
    wallet_address = ACADEMY_WALLET,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
    department_is_active = true,
} = {}) => {
    const { rows: [{ nextval }] } = await db.query(`SELECT nextval('academy_seq')`);
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

    const { rows: [department] } = await db.query(
        `INSERT INTO departments (academy_id, code, name, faculty, total_years, is_active)
         VALUES ($1, 'CS', 'Computer Science', 'Engineering', 4, $2)
         RETURNING id`,
        [academy.id, department_is_active],
    );

    await db.query(
        `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
         VALUES ($1, $2, $3, 'academy', true)`,
        [academy.id, wallet_address, ethers.Wallet.createRandom().signingKey.publicKey],
    );

    return { academy, department };
};

const seedStudentUser = async ({
    email = STUDENT_EMAIL,
    first_name = 'John',
    middle_name = null,
    last_name = 'Smith',
    full_name = 'John Smith',
    date_of_birth = '2004-01-15',
    gender = 'male',
    national_id = `NID-${Math.random().toString(16).slice(2, 10)}`,
    nationality = 'Turkish',
    student_number = 'STU-001',
    enrollment_status = 'active',
    enrollment_date = '2022-09-15',
    expected_graduation_date = '2026-06-30',
    academy_id = null,
    department_id = null,
    address_city = 'Istanbul',
    address_country = 'Turkey',
    create_student_row = true,
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

    if (create_student_row && academy_id && department_id) {
        await db.query(
            `INSERT INTO students (
                user_id, academy_id, department_id,
                student_number,
                enrollment_status, enrollment_date, expected_graduation_date
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                user.id,
                academy_id,
                department_id,
                student_number,
                enrollment_status,
                enrollment_date,
                expected_graduation_date,
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

const seedStudentIdentity = async ({ user_id, wallet_address = STUDENT_WALLET } = {}) => {
    await db.query(
        `INSERT INTO identities (user_id, wallet_address, role)
         VALUES ($1, $2, 'student')`,
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
        [STUDENT_WALLET, ACADEMY_WALLET],
    );

    await db.query(
        `DELETE FROM pending_transactions
         WHERE tx_hash = $1
            OR payload->>'wallet_address' = $2`,
        [FAKE_TX_HASH, STUDENT_WALLET],
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
        `DELETE FROM students
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
    issueStudentIdentity: async () => FAKE_TX,
    revokeStudentIdentity: async () => FAKE_TX,
    getStudentIdentity: async () => null,
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
            '../../src/blockchain/identity/student.identity.blockchain.js': {
                ...DEFAULT_BLOCKCHAIN_IMPL,
                ...blockchainImpl,
            },
            '../../src/blockchain/listener.js': listenerImpl,
        },
    );

    return app;
};

const endpoint = '/api/identity/students/revoke';

describe('POST /api/identity/students/revoke', function () {
    this.timeout(10000);
    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('returns 200 with student_wallet and blockchain_transaction on valid input', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedStudentIdentity({ user_id: user.id });

        const app = await makeApp({ revokeStudentIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .query({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' })
            .send({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        const { student_wallet, blockchain_transaction } = res.body.data;

        assert.equal(student_wallet, STUDENT_WALLET);
        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status, 'pending');
    });

    it('normalizes addresses to lowercase before processing', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedStudentIdentity({ user_id: user.id });

        const calls = [];
        const app = await makeApp({
            revokeStudentIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        });
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET_UPPER });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .query({ student_address: STUDENT_WALLET_UPPER, revocation_reason: 'Identity requested by academy' })
            .send({ student_address: STUDENT_WALLET_UPPER, revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 200);
    });

    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedStudentIdentity({ user_id: user.id });

        const app = await makeApp({ revokeStudentIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET });

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .query({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' })
            .send({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' });

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address, STUDENT_WALLET);
        assert.equal(pending.payload.reason, 'Identity requested by academy');
        assert.equal(pending.payload.email, STUDENT_EMAIL);
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedStudentIdentity({ user_id: user.id });

        const listenerCalls = [];
        const app = await makeApp(
            { revokeStudentIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
        );
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET });

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .query({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' })
            .send({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' });

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

    it('returns 404 STUDENT_NOT_FOUND when identity does not exist', async () => {
        const { academy, department } = await seedAcademy();
        await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });

        const app = await makeApp({ revokeStudentIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .query({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' })
            .send({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' });
        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedStudentIdentity({ user_id: user.id });

        const app = await makeApp({
            revokeStudentIdentity: async () => {
                const err = new Error('revokeStudentIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .query({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' })
            .send({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedStudentIdentity({ user_id: user.id });

        const app = await makeApp({
            revokeStudentIdentity: async () => {
                const err = new Error('revokeStudentIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });
        const academyToken = issueAccessToken({ sub: ACADEMY_WALLET });

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .query({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' })
            .send({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' });

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('returns 401 when token is missing', async () => {
        const app = await makeApp({ revokeStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({});

        assert.equal(res.status, 401);
    });

    it('returns 422 VALIDATION_ERROR when student_address is missing', async () => {
        const app = await makeApp({ revokeStudentIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken();

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'student_address');
        assert.ok(field, 'errors should contain a student_address entry');
    });

    it('returns 403 when role is not academy', async () => {
        const app = await makeApp({ revokeStudentIdentity: async () => FAKE_TX });
        const studentToken = issueAccessToken({ role: 'student' });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${studentToken}`)
            .query({ student_address: STUDENT_WALLET, revocation_reason: 'Identity requested by academy' })
            .send({});

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('returns 422 VALIDATION_ERROR for an invalid student_address format', async () => {
        const app = await makeApp({ revokeStudentIdentity: async () => FAKE_TX });
        const academyToken = issueAccessToken();

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${academyToken}`)
            .send({ student_address: 'not-a-wallet', revocation_reason: 'Identity requested by academy' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'student_address');
        assert.ok(field, 'errors should contain a student_address entry');
    });
});
