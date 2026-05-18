import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import crypto from 'crypto';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';


const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const STUDENT_WALLET = ethers.getAddress('0x8fa1b2c3d4e5f67890123456789abcdefabcdef0');
const STUDENT_WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';
const STUDENT_EMAIL = 'student.smith@fenerbahce.edu.tr';
const ACADEMY_WALLET = ethers.getAddress('0xa111111111111111111111111111111111111111');
const ACADEMY_WALLET_LOWER = ACADEMY_WALLET.toLowerCase();

const ISSUE_OTP = 'ABC123';
const ISSUE_MESSAGE = 'student-identity-otp-challenge';
const ISSUE_SIGNER = ethers.Wallet.createRandom();
const ISSUE_SIGNER_ADDRESS = ethers.getAddress(ISSUE_SIGNER.address);
const ACADEMY_PUBLIC_KEY = ethers.Wallet.createRandom().signingKey.publicKey;
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const buildCachePayload = ({ id, role = 'student', message = ISSUE_MESSAGE }) => JSON.stringify({
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

    await db.query(
        `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
         VALUES ($1, $2, $3, 'academy', true)`,
        [academy.id, wallet_address, ACADEMY_PUBLIC_KEY],
    );

    const { rows: [department] } = await db.query(
        `INSERT INTO departments (academy_id, code, name, faculty, total_years, is_active)
         VALUES ($1, 'CS', 'Computer Science', 'Engineering', 4, $2)
         RETURNING id, name, faculty, is_active`,
        [academy.id, department_is_active],
    );

    return { academy, department, academyPublicKey: ACADEMY_PUBLIC_KEY };
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

    let student = null;
    if (create_student_row && academy_id && department_id) {
        const { rows: [studentRow] } = await db.query(
            `INSERT INTO students (
                user_id, academy_id, department_id,
                student_number,
                enrollment_status, enrollment_date, expected_graduation_date
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
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
        student = studentRow;
    }

    if (create_address) {
        await db.query(
            `INSERT INTO addresses (user_id, city, country)
             VALUES ($1, $2, $3)`,
            [user.id, address_city, address_country],
        );
    }

    return { ...user, student_id: student?.id ?? null };
};

const cleanupDB = async () => {
    await db.query(
        `DELETE FROM identities
         WHERE wallet_address = $1
            OR wallet_address = $2
            OR wallet_address = $3
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
        [STUDENT_WALLET, ACADEMY_WALLET, ISSUE_SIGNER_ADDRESS],
    );

    await db.query(
        `DELETE FROM identity_certificates
         WHERE wallet_address = $1
            OR wallet_address = $2`,
        [STUDENT_WALLET, ISSUE_SIGNER_ADDRESS],
    );

    await db.query(
        `DELETE FROM pending_transactions
         WHERE tx_hash = $1
            OR payload->>'wallet_address' = $2
            OR payload->>'wallet_address' = $3`,
        [FAKE_TX_HASH, STUDENT_WALLET, ISSUE_SIGNER_ADDRESS],
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

const DEFAULT_CACHE_IMPL = {
    getCache: async () => null,
    setCache: async () => {},
    delCache: async () => {},
};

const makeApp = async (
    blockchainImpl = {},
    listenerImpl = { listenOnTransaction: () => {} },
    cacheImpl = {},
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/student.identity.blockchain.js': { ...DEFAULT_BLOCKCHAIN_IMPL, ...blockchainImpl },
            '../../src/blockchain/listener.js': listenerImpl,
            '../../src/cache/cache.client.js': { ...DEFAULT_CACHE_IMPL, ...cacheImpl },
        },
    );

    return app;
};

const endpoint = '/api/identity/students/issue';

describe('POST /api/identity/students/issue', function () {
    this.timeout(10000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('returns 200 with student_wallet and blockchain_transaction on valid input', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        const body = await buildIssueBody(STUDENT_EMAIL);

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Student identity issuance request submitted successfully');

        const { student_wallet, blockchain_transaction } = res.body.data;

        assert.equal(student_wallet, ISSUE_SIGNER_ADDRESS);
        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status, 'pending');
        assert.equal(
            Object.prototype.hasOwnProperty.call(res.body.data, 'certificate_metadata'),
            false,
        );
    });

    it('normalizes wallet_address and email to lowercase before processing', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });

        const cacheCalls = [];
        const app = await makeApp({
            issueStudentIdentity: async () => FAKE_TX,
        }, { listenOnTransaction: () => {} }, {
            getCache: async (key) => {
                cacheCalls.push(key);
                return buildCachePayload({ id: user.student_id });
            },
        });

        const body = await buildIssueBody(STUDENT_EMAIL.toUpperCase());
        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 200);
        assert.equal(cacheCalls.length, 1);
        const expectedKey = `otp:${ethers.keccak256(Buffer.from(`${STUDENT_EMAIL.toLowerCase()}:${ISSUE_OTP}`, 'utf8'))}`;
        assert.equal(cacheCalls[0], expectedKey);
    });

    it('passes the correct payload to issueStudentIdentity', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
            full_name: 'John Smith',
            student_number: 'STU-001',
            national_id: 'NID-12345678',
            nationality: 'Turkish',
            enrollment_date: '2022-09-15',
            address_country: 'Turkey',
        });

        const calls = [];
        const app = await makeApp({
            issueStudentIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const body = await buildIssueBody(STUDENT_EMAIL);

        await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(calls.length, 1);

        const call = calls[0];
        assert.equal(call.studentAddress, ISSUE_SIGNER_ADDRESS, 'student address must come from the signer');
        assert.equal(call.academyAddress, ACADEMY_WALLET, 'academy address must come from the academy identity');
        assert.equal(call.publicKey, ISSUE_SIGNER.signingKey.publicKey, 'public key must come from the signer');
        assert.equal(call.studentId, 'STU-001', 'studentId must match');
        assert.equal(call.fullName, 'John Smith', 'fullName must match');
        assert.equal(call.nationalId, 'NID-12345678', 'nationalId must match');
        assert.equal(call.nationality, 'Turkish', 'nationality must match');
        assert.match(call.enrollmentDate, /^\d{4}-\d{2}-\d{2}$/, 'enrollmentDate must be YYYY-MM-DD');
        assert.equal(call.department, 'Computer Science', 'department must match');
        assert.equal(call.country, 'Turkey', 'country must match');
    });

    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const body = await buildIssueBody(STUDENT_EMAIL);

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
        assert.equal(pending.payload.public_key, ISSUE_SIGNER.signingKey.publicKey);
        assert.equal(pending.payload.entity_id, user.id);
        assert.equal(pending.payload.role, 'student');
        assert.equal(pending.payload.email, STUDENT_EMAIL);
        assert.equal(pending.payload.onSuccess.subject, 'Identity Issuance Confirmed');
        assert.equal(pending.payload.onFailure.subject, 'Identity Issuance Pending Resolution');
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });

        const listenerCalls = [];
        const app = await makeApp(
            { issueStudentIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
            { getCache: async () => buildCachePayload({ id: user.student_id }) },
        );

        const body = await buildIssueBody(STUDENT_EMAIL);

        await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

    it('returns 404 STUDENT_NOT_FOUND when email does not exist in DB', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: NON_EXISTENT_ID }),
        });

        const body = await buildIssueBody('ghost@test-identity.edu');

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
    });

    it('returns 404 STUDENT_NOT_FOUND when user exists but has no student row', async () => {
        await seedStudentUser({
            email: 'orphan@test-identity.edu',
            create_student_row: false,
            create_address: true,
        });

        await seedAcademy();
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: NON_EXISTENT_ID }),
        });

        const body = await buildIssueBody('orphan@test-identity.edu');

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
    });

    it('returns 403 DEPARTMENT_INACTIVE when linked department is inactive', async () => {
        const { academy, department } = await seedAcademy({ department_is_active: false });
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const body = await buildIssueBody(STUDENT_EMAIL);

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'DEPARTMENT_INACTIVE');
    });

    it('returns 400 ADDRESS_NOT_FOUND when student has no address row', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
            create_address: false,
            email: 'no-address@test-identity.edu',
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const body = await buildIssueBody('no-address@test-identity.edu');

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
    });

    it('returns 400 ADDRESS_NOT_FOUND when student address has empty country', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
            address_country: '',
            email: 'empty-country@test-identity.edu',
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const body = await buildIssueBody('empty-country@test-identity.edu');

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({
            issueStudentIdentity: async () => {
                const err = new Error('issueStudentIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const body = await buildIssueBody(STUDENT_EMAIL);

        const res = await request(app)
            .post(endpoint)
            .send(body);

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({
            issueStudentIdentity: async () => {
                const err = new Error('issueStudentIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        }, { listenOnTransaction: () => {} }, {
            getCache: async () => buildCachePayload({ id: user.student_id }),
        });

        const body = await buildIssueBody(STUDENT_EMAIL);

        await request(app)
            .post(endpoint)
            .send(body);

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('returns 422 VALIDATION_ERROR when otp is missing', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: STUDENT_EMAIL, signature: await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE) });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'otp');
        assert.ok(field, 'errors should contain an otp entry');
    });

    it('returns 422 VALIDATION_ERROR when email is missing', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ otp: ISSUE_OTP, signature: await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE) });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid otp format', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: STUDENT_EMAIL, otp: '12', signature: await ISSUE_SIGNER.signMessage(ISSUE_MESSAGE) });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'otp');
        assert.ok(field, 'errors should contain an otp entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid signature format', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ email: STUDENT_EMAIL, otp: ISSUE_OTP, signature: 'not-a-signature' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'signature');
        assert.ok(field, 'errors should contain a signature entry');
    });
});
