import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';

const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const PROFESSOR_EMAIL = 'prof.smith@fenerbahce.edu.tr';
const PROFESSOR_SIGNER = ethers.Wallet.createRandom();
const PROFESSOR_WALLET = ethers.getAddress(PROFESSOR_SIGNER.address);
const PROFESSOR_PUBLIC_KEY = PROFESSOR_SIGNER.signingKey.publicKey;
const ACADEMY_WALLET = ethers.getAddress('0x1111111111111111111111111111111111111111');
const ACADEMY_PUBLIC_KEY = ethers.Wallet.createRandom().signingKey.publicKey;

const ISSUE_OTP = 'ABC123';
const ISSUE_MESSAGE = 'professor-identity-otp-challenge';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const buildCachePayload = ({ id, role = 'professor', message = ISSUE_MESSAGE }) => JSON.stringify({
    id,
    role,
    message,
});

const seedAcademy = async ({
    email = 'academy@fenerbahce.edu.tr',
    wallet_address = ACADEMY_WALLET,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
} = {}) => {
    const { rows: [{ nextval }] } = await db.query(
        'SELECT nextval(\'academy_seq\')'
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
        [academy.id, wallet_address, ACADEMY_PUBLIC_KEY],
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

    let professor = null;
    if (academy_id && department_id) {
        const { rows: [professorRow] } = await db.query(
            `INSERT INTO professors (
                user_id, academy_id, department_id,
                employee_number, title, rank, hire_date, employment_type
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
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
        professor = professorRow;
    }

    if (create_address) {
        await db.query(
            `INSERT INTO addresses (user_id, city, country)
             VALUES ($1, $2, $3)`,
            [user.id, address_city, address_country],
        );
    }

    return { ...user, professor_id: professor?.id ?? null };
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
            '../../src/blockchain/identity/professor.identity.blockchain.js': { ...DEFAULT_BLOCKCHAIN_IMPL },
            '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
            '../../src/cache/cache.client.js': { ...DEFAULT_CACHE_IMPL, ...cacheImpl },
        },
    );
    return app;
};

const endpoint = '/api/identity/professors/request-issuance';

describe('POST /api/identity/professors/request-issuance', function () {
    this.timeout(10000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('creates a pending professor identity after valid OTP verification', async () => {
        const { academy, department } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id, department_id: department.id });
        const cachePayload = buildCachePayload({ id: user.professor_id });

        const app = await makeApp({
            getCache: async () => cachePayload,
            delCache: async () => {},
        });

        const signature = await PROFESSOR_SIGNER.signMessage(ISSUE_MESSAGE);

        const res = await request(app)
            .post(endpoint)
            .send({
                email: PROFESSOR_EMAIL,
                otp: ISSUE_OTP,
                signature,
            });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Professor identity issuance request submitted successfully');
        assert.equal(res.body.data.wallet_address, PROFESSOR_WALLET);

        const { rows: [identity] } = await db.query(
            `SELECT wallet_address, public_key, role, status, signature
             FROM identities
             WHERE user_id = $1 AND role = 'professor'`,
            [user.id],
        );

        assert.ok(identity, 'identity should be inserted');
        assert.equal(identity.wallet_address, PROFESSOR_WALLET);
        assert.equal(identity.public_key, PROFESSOR_PUBLIC_KEY);
        assert.equal(identity.role, 'professor');
        assert.equal(identity.status, 'pending');
        assert.equal(identity.signature, signature);
    });

    it('returns 400 INVALID_OTP when cache is empty', async () => {
        const { academy, department } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, department_id: department.id });

        const app = await makeApp({ getCache: async () => null });

        const res = await request(app)
            .post(endpoint)
            .send({
                email: PROFESSOR_EMAIL,
                otp: ISSUE_OTP,
                signature: await PROFESSOR_SIGNER.signMessage(ISSUE_MESSAGE),
            });

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_OTP');
    });
});
