import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';

// SETUP
// ─────
const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS = '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0';
const WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';
const PROFESSOR_EMAIL = 'prof.smith@fenerbahce.edu.tr';
const ACADEMY_WALLET = '0x1111111111111111111111111111111111111111';

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

    // Generating a unique academy_number
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

const makeApp = async (blockchainImpl) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/professor.identity.blockchain.js': blockchainImpl,
        }
    );
    return app;
};

beforeEach(async () => {
    await cleanupDB();
});

afterEach(async () => {
    await cleanupDB();
});


// TESTS
// ─────
describe('POST /api/identity/professors/issue', () => {
    it('returns 200 and the identity DTO on valid input', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({
            issueProfessorIdentity: async () => FAKE_TX_HASH,
        });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Professor identity issued successfully');

        const data = res.body.data;
        assert.equal(data.wallet_address, WALLET_ADDRESS);
        assert.equal(data.identity_tx_hash, FAKE_TX_HASH);
        assert.equal(data.is_identity_issued, true);
        assert.equal(data.role, 'professor');
        assert.ok(data.email);
    });

    it('normalizes wallet_address and email to lowercase before processing', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id });

        const calls = [];
        const app = await makeApp({
            issueProfessorIdentity: async (wallet, employee_number, full_name, title, department, faculty, academy_wallet) => {
                calls.push({ wallet, employee_number, full_name, title, department, faculty, academy_wallet });
                return FAKE_TX_HASH;
            },
        });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL.toUpperCase(), wallet_address: WALLET_UPPER });

        assert.equal(res.status, 200);
        assert.equal(calls[0].wallet, WALLET_ADDRESS);
    });

    it('persists wallet_address, is_identity_issued=true and identity_tx_hash in the DB', async () => {
        const { academy } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({
            issueProfessorIdentity: async () => FAKE_TX_HASH,
        });

        await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        const { rows: [updated] } = await db.query(
            'SELECT is_identity_issued, identity_tx_hash, wallet_address FROM users WHERE id = $1',
            [user.id],
        );

        assert.equal(updated.is_identity_issued, true);
        assert.equal(updated.identity_tx_hash, FAKE_TX_HASH);
        assert.equal(updated.wallet_address, WALLET_ADDRESS);
    });

    it('passes the correct arguments to the blockchain', async () => {
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
            issueProfessorIdentity: async (wallet, employee_number, full_name, title, department, faculty, academy_wallet) => {
                calls.push({ wallet, employee_number, full_name, title, department, faculty, academy_wallet });
                return FAKE_TX_HASH;
            },
        });

        await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].wallet, WALLET_ADDRESS);
        assert.equal(calls[0].employee_number, 'EMP-001');
        assert.equal(calls[0].full_name, 'John Smith');
        assert.equal(calls[0].title, 'Dr.');
        assert.equal(calls[0].department, 'Computer Science');
        assert.equal(calls[0].faculty, 'Engineering');
        assert.equal(calls[0].academy_wallet, ACADEMY_WALLET);
    });

    it('returns 404 USER_NOT_FOUND when email does not exist in DB', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: 'ghost@test-identity.edu', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'USER_NOT_FOUND');
    });

    it('returns 403 FORBIDDEN when user is not a professor', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, role: 'student' });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('returns 409 IDENTITY_ALREADY_ISSUED when identity was already issued', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, is_identity_issued: true });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'IDENTITY_ALREADY_ISSUED');
    });

    it('returns 409 WALLET_ADDRESS_ALREADY_ASSOCIATED when user already has a wallet address', async () => {
        const { academy } = await seedAcademy();
        await seedProfessorUser({ academy_id: academy.id, wallet_address: WALLET_ADDRESS });

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'WALLET_ADDRESS_ALREADY_ASSOCIATED');
    });

    it('returns 404 PROFESSOR_NOT_FOUND when user exists but has no professor row', async () => {
        await db.query(
            `INSERT INTO users (email, wallet_address, role, is_identity_issued)
                VALUES ('orphan@test-identity.edu', NULL, 'professor', false)`,
        );

        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
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
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not update the DB when the blockchain call fails', async () => {
        const { academy } = await seedAcademy();
        const user = await seedProfessorUser({ academy_id: academy.id });

        const app = await makeApp({
            issueProfessorIdentity: async () => {
                const err = new Error('issueProfessorIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: WALLET_ADDRESS });

        const { rows: [unchanged] } = await db.query(
            'SELECT is_identity_issued, identity_tx_hash, wallet_address FROM users WHERE id = $1',
            [user.id],
        );

        assert.equal(unchanged.is_identity_issued, false);
        assert.equal(unchanged.identity_tx_hash, null);
        assert.equal(unchanged.wallet_address, null);
    });

    it('returns 422 when wallet_address is missing', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 when email is missing', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find(e => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });

    it('returns 422 for an invalid wallet_address format', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: PROFESSOR_EMAIL, wallet_address: 'not-a-wallet' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 for an invalid email format', async () => {
        const app = await makeApp({ issueProfessorIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/professors/issue')
            .send({ email: 'not-an-email', wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'email');
        assert.ok(field, 'errors should contain an email entry');
    });
});