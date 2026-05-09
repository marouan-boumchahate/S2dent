import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';


const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS = ethers.getAddress('0x8fa1b2c3d4e5f67890123456789abcdefabcdef0');
const WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';
const PROFESSOR_EMAIL = 'prof.smith@fenerbahce.edu.tr';
const ACADEMY_WALLET = '0x1111111111111111111111111111111111111111';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};


const seedAcademy = async ({
    email = 'academy@fenerbahce.edu.tr',
    wallet_address = ACADEMY_WALLET,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
    department_is_active = true,
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
            wallet_address, academy_number, name, short_name, type,
            email, legal_name, registration_number, tax_id, billing_email
        )
         VALUES ($1, $2, $3, $4, 'university', $5, $6, $7, $8, $9)
         RETURNING id, wallet_address, name`,
        [
            wallet_address,
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
         RETURNING id, name, faculty, is_active`,
        [academy.id, department_is_active],
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
        'notes',
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

const cleanupDB = async () => {
    await db.query(
        `DELETE FROM identities
         WHERE wallet_address = $1`,
        [WALLET_ADDRESS],
    );

    await db.query(
        `DELETE FROM identity_certificates
         WHERE wallet_address = $1`,
        [WALLET_ADDRESS],
    );

    await db.query(
        `DELETE FROM pending_transactions
         WHERE payload->>'wallet_address' = $1`,
        [WALLET_ADDRESS],
    );

    await db.query(
        `DELETE FROM addresses
         WHERE academy_id IN (
            SELECT id FROM academies
            WHERE wallet_address = $1
               OR email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
        )`,
        [ACADEMY_WALLET],
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
            WHERE wallet_address = $1
               OR email LIKE '%@fenerbahce%'
               OR email LIKE '%@test-identity%'
        )`,
        [ACADEMY_WALLET],
    );

    await db.query(
        `DELETE FROM academies
         WHERE wallet_address = $1
            OR email LIKE '%@fenerbahce%'
            OR email LIKE '%@test-identity%'`,
        [ACADEMY_WALLET],
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

const makeApp = async (
    blockchainImpl = {},
    listenerImpl = { listenOnTransaction: () => {} },
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/professor.identity.blockchain.js': { ...DEFAULT_BLOCKCHAIN_IMPL, ...blockchainImpl },
            '../../src/blockchain/listener.js': listenerImpl,
        },
    );
    return app;
};


const endpoint = '/api/identity/professors/issue';


describe('POST /api/identity/professors/issue', function () {
    this.timeout(10000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('returns 200 with professor_wallet and blockchain_transaction on valid input', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Professor identity issuance request submitted successfully');

        const { professor_wallet, blockchain_transaction } = res.body.data;

        assert.equal(professor_wallet, WALLET_ADDRESS);
        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status, 'pending');
        assert.equal(
            Object.prototype.hasOwnProperty.call(res.body.data, 'certificate_metadata'),
            false,
        );
    });

    it('normalizes wallet_address and email to lowercase before processing', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

        const calls = [];
        const app = await makeApp({
            issueProfessorIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL.toUpperCase(), wallet_address: WALLET_UPPER });

        assert.equal(res.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].professorWallet, WALLET_ADDRESS, 'wallet must be lowercased');
        assert.equal(calls[0].academyWallet, ACADEMY_WALLET, 'academy wallet must be lowercased');
    });

    it('passes the correct payload to issueProfessorIdentity', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        await seedProfessorUser({
            academy_id: academy.id,
            department_id: department.id,
            full_name: 'John Smith',
            employee_number: 'EMP-001',
            title: 'Dr.',
            rank: 'Prof',
            hire_date: '2010-01-01',
            employment_type: 'full_time',
            national_id: 'NID-12345678',
        });

        const calls = [];
        const app = await makeApp({
            issueProfessorIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(calls.length, 1);

        const call = calls[0];
        assert.equal(call.professorWallet, WALLET_ADDRESS, 'wallet must be normalised');
        assert.equal(call.academyWallet, ACADEMY_WALLET, 'academy wallet must be passed');
        assert.equal(call.employeeId, 'EMP-001', 'employeeId must match');
        assert.equal(call.fullName, 'John Smith', 'fullName must match');
        assert.equal(call.nationalId, 'NID-12345678', 'nationalId must match');
        assert.match(call.hireDate, /^\d{4}-\d{2}-\d{2}$/, 'hireDate must be formatted as YYYY-MM-DD');
        assert.equal(call.rank, 'Prof', 'rank must match');
        assert.equal(call.employmentType, 'full_time', 'employmentType must match');
    });

    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

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
        assert.equal(pending.payload.wallet_address, WALLET_ADDRESS);
        assert.equal(pending.payload.professor_number, 'EMP-001');
        assert.equal(pending.payload.name, 'John Smith');
        assert.equal(pending.payload.role, 'professor');
        assert.equal(pending.payload.email, PROFESSOR_EMAIL);
        assert.equal(pending.payload.onSuccess.subject, 'Identity Issuance Confirmed');
        assert.equal(pending.payload.onFailure.subject, 'Identity Issuance Pending Resolution');
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

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

    it('returns 404 PROFESSOR_NOT_FOUND when email does not exist in DB', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'ghost@test-identity.edu', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'PROFESSOR_NOT_FOUND');
    });

    it('returns 404 PROFESSOR_NOT_FOUND when user exists but has no professor row', async () => {
        await seedProfessorUser({ email: 'orphan@test-identity.edu' });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'orphan@test-identity.edu', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'PROFESSOR_NOT_FOUND');
    });

    it('returns 403 DEPARTMENT_INACTIVE when linked department is inactive', async () => {
        const { academy, department } = await seedAcademy({ department_is_active: false });
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'DEPARTMENT_INACTIVE');
    });

    it('returns 400 ADDRESS_NOT_FOUND when professor has no address row', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({
            academy_id: academy.id,
            department_id: department.id,
            create_address: false,
            email: 'no-address@test-identity.edu',
        });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'no-address@test-identity.edu', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

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
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

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

    it('returns 422 VALIDATION_ERROR when wallet_address is missing', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 VALIDATION_ERROR when email is missing', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid wallet_address format', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: PROFESSOR_EMAIL, wallet_address: 'not-a-wallet' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid email format', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: 'not-an-email', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });
});
