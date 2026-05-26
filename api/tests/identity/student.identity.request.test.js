import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';

const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const STUDENT_EMAIL = 'student.smith@fenerbahce.edu.tr';
const STUDENT_SIGNER = ethers.Wallet.createRandom();
const STUDENT_WALLET = ethers.getAddress(STUDENT_SIGNER.address);
const STUDENT_PUBLIC_KEY = STUDENT_SIGNER.signingKey.publicKey;
const ACADEMY_WALLET = ethers.getAddress('0xa111111111111111111111111111111111111111');
const ACADEMY_PUBLIC_KEY = ethers.Wallet.createRandom().signingKey.publicKey;

const ISSUE_OTP = 'ABC123';
const ISSUE_MESSAGE = 'student-identity-otp-challenge';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const buildCachePayload = ({ id, role = 'student', message = ISSUE_MESSAGE }) => JSON.stringify({
    id,
    role,
    message,
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
    const { rows: [{ nextval }] } = await db.query('SELECT nextval(\'academy_seq\')');
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
        `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
         VALUES ($1, $2, $3, 'academy', NOW())`,
        [academy.id, wallet_address, ACADEMY_PUBLIC_KEY],
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

const DEFAULT_CACHE_IMPL = {
    getCache: async () => null,
    setCache: async () => {},
    delCache: async () => {},
};

const makeApp = async (
    cacheImpl = {},
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/student.identity.blockchain.js': { ...DEFAULT_BLOCKCHAIN_IMPL },
            '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
            '../../src/cache/cache.client.js': { ...DEFAULT_CACHE_IMPL, ...cacheImpl },
        },
    );

    return app;
};

const endpoint = '/api/identity/students/request-issuance';

describe('POST /api/identity/students/request-issuance', function () {
    this.timeout(10000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('creates a pending student identity after valid OTP verification', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        const cachePayload = buildCachePayload({ id: user.student_id });

        const app = await makeApp({
            getCache: async () => cachePayload,
            delCache: async () => {},
        });

        const signature = await STUDENT_SIGNER.signMessage(ISSUE_MESSAGE);

        const res = await request(app)
            .post(endpoint)
            .send({
                email: STUDENT_EMAIL,
                otp: ISSUE_OTP,
                signature,
            });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Student identity issuance request submitted successfully');
        assert.equal(res.body.data.wallet_address, STUDENT_WALLET);

        const { rows: [identity] } = await db.query(
            `SELECT wallet_address, public_key, role, status, signature
             FROM identities
             WHERE user_id = $1 AND role = 'student'`,
            [user.id],
        );

        assert.ok(identity, 'identity should be inserted');
        assert.equal(identity.wallet_address, STUDENT_WALLET);
        assert.equal(identity.public_key, STUDENT_PUBLIC_KEY);
        assert.equal(identity.role, 'student');
        assert.equal(identity.status, 'pending');
        assert.equal(identity.signature, signature);
    });

    it('returns 400 INVALID_OTP when cache is empty', async () => {
        const { academy, department } = await seedAcademy();
        await seedStudentUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({ getCache: async () => null });

        const res = await request(app)
            .post(endpoint)
            .send({
                email: STUDENT_EMAIL,
                otp: ISSUE_OTP,
                signature: await STUDENT_SIGNER.signMessage(ISSUE_MESSAGE),
            });

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_OTP');
    });
});
