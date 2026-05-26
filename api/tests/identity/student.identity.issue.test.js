import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

process.env.BLOCKCHAIN_DEPLOYED_CONTRACT_ADDRESS ??= '0x1000000000000000000000000000000000000002';

const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const STUDENT_EMAIL = 'student.smith@fenerbahce.edu.tr';
const STUDENT_SIGNER = ethers.Wallet.createRandom();
const STUDENT_WALLET = ethers.getAddress(STUDENT_SIGNER.address);
const STUDENT_PUBLIC_KEY = STUDENT_SIGNER.signingKey.publicKey;
const STUDENT_WALLET_LOWER = STUDENT_WALLET.toLowerCase();
const ACADEMY_SIGNER = ethers.Wallet.createRandom();
const ACADEMY_WALLET = ethers.getAddress(ACADEMY_SIGNER.address);
const ACADEMY_PUBLIC_KEY = ACADEMY_SIGNER.signingKey.publicKey;
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const buildIssueBody = (student_address, signature) => ({
    student_address,
    signature,
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
        `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
         VALUES ($1, $2, $3, 'academy', NOW())`,
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
        [STUDENT_WALLET, ACADEMY_WALLET, STUDENT_WALLET],
    );

    await db.query(
        `DELETE FROM identity_certificates
         WHERE wallet_address = $1
            OR wallet_address = $2`,
        [STUDENT_WALLET, STUDENT_WALLET],
    );

    await db.query(
        `DELETE FROM pending_transactions
         WHERE tx_hash = $1
            OR payload->>'wallet_address' = $2
            OR payload->>'wallet_address' = $3`,
        [FAKE_TX_HASH, STUDENT_WALLET, STUDENT_WALLET],
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

const issueAccessToken = (academyId) => signTokens({
    sub: ACADEMY_WALLET,
    role: 'academy',
    rid: academyId,
}).accessToken;

const buildIssueSignature = async (app, academyId, studentWallet, academySigner = ACADEMY_SIGNER) => {
    const schemaRes = await request(app)
        .get(`/api/identity/students/pending/${studentWallet}/schema`)
        .set('Authorization', `Bearer ${issueAccessToken(academyId)}`);

    assert.equal(schemaRes.status, 200);

    const { domain, types, message } = schemaRes.body.data;
    return academySigner.signTypedData(domain, types, message);
};

describe('POST /api/identity/students/issue', function () {
    this.timeout(10000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('returns 200 with student_wallet and blockchain_transaction on valid input', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });
        const signature = await buildIssueSignature(app, academy.id, STUDENT_WALLET);
        const body = buildIssueBody(STUDENT_WALLET, signature);

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(body);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Student identity issued successfully');

        const { student_wallet, blockchain_transaction } = res.body.data;

        assert.equal(student_wallet, STUDENT_WALLET);
        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status, 'pending');
    });

    it('normalizes student_address before processing', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
        });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });
        const signature = await buildIssueSignature(app, academy.id, STUDENT_WALLET);

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET_LOWER, signature));

        assert.equal(res.status, 200);
        assert.equal(res.body.data.student_wallet, STUDENT_WALLET);
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
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({
            issueStudentIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        }, { listenOnTransaction: () => {} });

        const signature = await buildIssueSignature(app, academy.id, STUDENT_WALLET);

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        assert.equal(calls.length, 1);

        const call = calls[0];
        assert.equal(call.studentAddress, STUDENT_WALLET, 'student address must come from the request');
        assert.equal(call.academyAddress, ACADEMY_WALLET, 'academy address must come from the academy identity');
        assert.equal(call.publicKey, STUDENT_PUBLIC_KEY, 'public key must come from the identity record');
        assert.equal(call.signature, signature, 'signature must match the academy signature');
        assert.equal(call.studentId, 'STU-001', 'studentId must match');
        assert.equal(call.fullName, 'John Smith', 'fullName must match');
        assert.equal(call.nationalId, 'NID-12345678', 'nationalId must match');
        assert.equal(call.nationality, 'Turkish', 'nationality must match');
        assert.match(call.enrollmentDate, /^\d{4}-\d{2}-\d{2}$/, 'enrollmentDate must be YYYY-MM-DD');
        assert.equal(call.department, 'Computer Science', 'department must match');
        assert.equal(call.country, 'Turkey', 'country must match');
    });

    it('inserts a pending_transaction row after successful submission', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });
        const signature = await buildIssueSignature(app, academy.id, STUDENT_WALLET);

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address, STUDENT_WALLET);
        assert.equal(pending.payload.public_key, STUDENT_PUBLIC_KEY);
        assert.equal(pending.payload.entity_id, user.id);
        assert.equal(pending.payload.role, 'student');
        assert.equal(pending.payload.email, STUDENT_EMAIL);
        assert.equal(pending.payload.signature, signature);
        assert.match(pending.payload.notification.email.success.subject, /^Identity Issuance Confirmed/);
        assert.match(pending.payload.notification.emit.failure.message, /issuance needs attention$/);
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const listenerCalls = [];
        const app = await makeApp(
            { issueStudentIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
        );

        const signature = await buildIssueSignature(app, academy.id, STUDENT_WALLET);

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

    it('returns 404 STUDENT_NOT_FOUND when email does not exist in DB', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(NON_EXISTENT_ID)}`)
            .send(buildIssueBody(STUDENT_WALLET, '0x' + '1'.repeat(130)));

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
    });

    it('returns 404 STUDENT_NOT_FOUND when user exists but has no student row', async () => {
        await seedStudentUser({
            email: 'orphan@test-identity.edu',
            create_student_row: false,
            create_address: true,
        });

        await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(NON_EXISTENT_ID)}`)
            .send(buildIssueBody(STUDENT_WALLET, '0x' + '1'.repeat(130)));

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
    });

    it('returns 403 DEPARTMENT_INACTIVE when linked department is inactive', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET, department_is_active: false });
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });
        const signature = '0x' + '1'.repeat(130);

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'DEPARTMENT_INACTIVE');
    });

    it('returns 400 ADDRESS_NOT_FOUND when student has no address row', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
            create_address: false,
            email: 'no-address@test-identity.edu',
        });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });
        const signature = '0x' + '1'.repeat(130);

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
    });

    it('returns 400 ADDRESS_NOT_FOUND when student address has empty country', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({
            academy_id: academy.id,
            department_id: department.id,
            address_country: '',
            email: 'empty-country@test-identity.edu',
        });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });
        const signature = '0x' + '1'.repeat(130);

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({
            issueStudentIdentity: async () => {
                const err = new Error('issueStudentIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        }, { listenOnTransaction: () => {} });

        const signature = await buildIssueSignature(app, academy.id, STUDENT_WALLET);

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({
            issueStudentIdentity: async () => {
                const err = new Error('issueStudentIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        }, { listenOnTransaction: () => {} });

        const signature = await buildIssueSignature(app, academy.id, STUDENT_WALLET);

        await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, signature));

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('returns 400 INVALID_SIGNATURE when the academy signature is invalid', async () => {
        const { academy, department } = await seedAcademy({ wallet_address: ACADEMY_WALLET });
        const user = await seedStudentUser({ academy_id: academy.id, department_id: department.id });
        await seedPendingIdentity({
            user_id: user.id,
            wallet_address: STUDENT_WALLET,
            public_key: STUDENT_PUBLIC_KEY,
        });

        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX }, { listenOnTransaction: () => {} });
        const badSignature = await buildIssueSignature(app, academy.id, STUDENT_WALLET, ethers.Wallet.createRandom());

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(academy.id)}`)
            .send(buildIssueBody(STUDENT_WALLET, badSignature));

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_SIGNATURE');
    });

    it('returns 422 VALIDATION_ERROR when student_address is missing', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(NON_EXISTENT_ID)}`)
            .send({ signature: '0x' + '1'.repeat(130) });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'student_address');
        assert.ok(field, 'errors should contain a student_address entry');
    });

    it('returns 422 VALIDATION_ERROR when signature is missing', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(NON_EXISTENT_ID)}`)
            .send({ student_address: STUDENT_WALLET });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'signature');
        assert.ok(field, 'errors should contain a signature entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid student_address format', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken(NON_EXISTENT_ID)}`)
            .send({ student_address: 'not-an-address', signature: '0x' + '1'.repeat(130) });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'student_address');
        assert.ok(field, 'errors should contain a student_address entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid signature format', async () => {
        const app = await makeApp({ issueStudentIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .set('Authorization', `Bearer ${issueAccessToken('academy-id')}`)
            .send({ student_address: STUDENT_WALLET, signature: 'not-a-signature' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'signature');
        assert.ok(field, 'errors should contain a signature entry');
    });
});
