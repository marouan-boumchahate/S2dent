import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';

// SETUP
// ─────
const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS = '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0';
const WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const seedAcademyUser = async ({
    email = 'seed@fenerbahce.edu.tr',
    wallet_address = WALLET_ADDRESS,
    role = 'academy_admin',
    is_identity_issued = false,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
} = {}) => {
    const { rows: [user] } = await db.query(
        `INSERT INTO users (email, wallet_address, role, is_identity_issued)
            VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [email, wallet_address, role, is_identity_issued],
    );

    const { rows: [{ nextval }] } = await db.query(
        `SELECT nextval('academy_seq')`
    );
    const SEED_ACADEMY_NUMBER = `ACD_${String(nextval).padStart(7, '0')}`;

    await db.query(
        `INSERT INTO academies (user_id, academy_number, name, short_name, type, country, city)
            VALUES ($1, $2, $3, $4, 'university', 'Turkey', 'Istanbul')`,
        [user.id, SEED_ACADEMY_NUMBER, academy_name, short_name],
    );

    return user;
};

const cleanupDB = async () => {
    await db.query(`
        DELETE FROM pending_transactions
        WHERE payload->>'wallet_address' = $1
    `, [WALLET_ADDRESS]);

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

const makeApp = async (blockchainImpl, listenerImpl = { listenOnTransaction: () => {} }) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/academy.identity.blockchain.js': blockchainImpl,
            '../../src/blockchain/listener.js': listenerImpl,
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

const endpoint = '/api/identity/academies/issue';

// TESTS
// ─────
describe('POST /api/identity/academies/issue', () => {
    it('returns 200 and a pending status DTO on valid input', async () => {
        await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Academy identity issuance request submitted successfully');

        const data = res.body.data;
        assert.equal(data.tx_hash, FAKE_TX_HASH);
        assert.equal(data.status, 'pending');
    });

    it('normalizes wallet_address to lowercase before querying', async () => {
        await seedAcademyUser({ wallet_address: WALLET_ADDRESS });

        const calls = [];
        const app = await makeApp({
            issueAcademyIdentity: async (wallet, id, name, code) => {
                calls.push({ wallet, id, name, code });
                return FAKE_TX;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_UPPER });

        assert.equal(res.status, 200);
        assert.equal(calls[0].wallet, WALLET_ADDRESS);
    });

    it('inserts a pending_transaction row after submission', async () => {
        const user = await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH]
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address, WALLET_ADDRESS);
        assert.equal(pending.payload.id, user.id);
    });

    it('does NOT update users table immediately after submission', async () => {
        const user = await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX,
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows: [unchanged] } = await db.query(
            'SELECT is_identity_issued, identity_tx_hash FROM users WHERE id = $1',
            [user.id],
        );

        // Listener still not triggered at this point
        assert.equal(unchanged.is_identity_issued, false);
        assert.equal(unchanged.identity_tx_hash, null);
    });

    it('passes the correct arguments to the blockchain', async () => {
        await seedAcademyUser({
            academy_name: 'Fenerbahce University',
            short_name: 'FBU',
        });

        const calls = [];
        const app = await makeApp({
            issueAcademyIdentity: async (wallet, id, name, code) => {
                calls.push({ wallet, id, name, code });
                return FAKE_TX;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].wallet, WALLET_ADDRESS);
        assert.match(calls[0].id, /^ACD_[0-9]{7}$/);
        assert.equal(calls[0].name, 'Fenerbahce University');
        assert.equal(calls[0].code, 'FBU');
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        await seedAcademyUser();

        const listenerCalls = [];
        const app = await makeApp(
            { issueAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) }
        );

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

    it('returns 404 USER_NOT_FOUND when wallet does not exist in DB', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: '0x0000000000000000000000000000000000000001' });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'USER_NOT_FOUND');
    });

    it('returns 403 FORBIDDEN when user is not academy_admin', async () => {
        await seedAcademyUser({ role: 'professor' });

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('returns 409 IDENTITY_ALREADY_ISSUED when identity was already issued', async () => {
        await seedAcademyUser({ is_identity_issued: true });

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 409);
        assert.equal(res.body.code, 'IDENTITY_ALREADY_ISSUED');
    });

    it('returns 404 ACADEMY_NOT_FOUND when user exists but has no academy row', async () => {
        await db.query(
            `INSERT INTO users (email, wallet_address, role, is_identity_issued)
                VALUES ('orphan@test-identity.edu', $1, 'academy_admin', false)`,
            [WALLET_ADDRESS],
        );

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH]
        );

        assert.equal(rows.length, 0);
    });

    it('returns 422 when wallet_address is missing', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 for an invalid wallet_address format', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: 'not-a-wallet' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });
});