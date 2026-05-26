import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';
import { hash } from '../../src/utils/crypto.js';

process.env.BLOCKCHAIN_DEPLOYED_CONTRACT_ADDRESS ??= '0x2000000000000000000000000000000000000002';

const STUDENT_EMAIL = 'student.smith@fenerbahce.edu.tr';
const STUDENT_WALLET = ethers.getAddress('0x8fa1b2c3d4e5f67890123456789abcdefabcdef0');
const STUDENT_PUBLIC_KEY = ethers.Wallet.createRandom().signingKey.publicKey;
const ACADEMY_WALLET = ethers.getAddress('0xa111111111111111111111111111111111111111');
const ACADEMY_PUBLIC_KEY = ethers.Wallet.createRandom().signingKey.publicKey;

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
    national_id = 'NID-12345678',
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

const seedPendingIdentity = async ({ user_id, wallet_address, public_key }) => {
    await db.query(
        `INSERT INTO identities (user_id, wallet_address, public_key, role, status)
         VALUES ($1, $2, $3, 'student', 'pending')`,
        [user_id, wallet_address, public_key],
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

const makeApp = async () => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {},
    );

    return app;
};

const endpoint = '/api/identity/students/pending';

const issueAccessToken = (academyId, role = 'academy') => signTokens({
    sub: ACADEMY_WALLET,
    role,
    rid: academyId,
}).accessToken;

describe('GET /api/identity/students/pending/:wallet_address/schema', function () {
    this.timeout(10000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('returns the student EIP-712 schema for the academy', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp();

        const res = await request(app)
            .get(`${endpoint}/${STUDENT_WALLET}/schema`)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Student identity signature schema generated successfully');

        const { domain, types, message } = res.body.data;

        assert.equal(domain.name, 'S2dent');
        assert.equal(domain.version, '1');
        assert.equal(domain.chainId, 31337);
        assert.equal(domain.verifyingContract, process.env.BLOCKCHAIN_DEPLOYED_CONTRACT_ADDRESS);

        const typeNames = types.StudentIdentity.map((field) => field.name);
        assert.deepEqual(typeNames, [
            'studentIdHash',
            'fullName',
            'nationalIdHash',
            'publicKey',
            'walletAddress',
            'academyWalletAddress',
            'academyName',
            'enrollmentDate',
            'department',
        ]);

        assert.equal(message.studentIdHash, hash('STU-001'));
        assert.equal(message.fullName, 'John Smith');
        assert.equal(message.nationalIdHash, hash('NID-12345678'));
        assert.equal(message.publicKey, STUDENT_PUBLIC_KEY);
        assert.equal(message.walletAddress, STUDENT_WALLET);
        assert.equal(message.academyWalletAddress, ACADEMY_WALLET);
        assert.equal(message.academyName, 'Fenerbahce University');
        assert.match(message.enrollmentDate, /^(2022-09-15|2022-09-14|Thu Sep 15 2022|Wed Sep 14 2022)/);
        assert.equal(message.department, 'Computer Science');
    });

    it('returns 403 FORBIDDEN for non-academy callers', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp();

        const res = await request(app)
            .get(`${endpoint}/${STUDENT_WALLET}/schema`)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id, 'professor')}`);

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });
});
