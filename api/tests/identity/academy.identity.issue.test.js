import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';

// SETUP
// ─────
const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS = '0x8fa1b2c3d4e5f67890123456789abcdefabcdef0';
const WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';

const seedAcademyUser = async ({
    email = 'seed@fenerbahce.edu.tr',
    walletAddress= WALLET_ADDRESS,
    role = 'academy_admin',
    isIdentityIssued = false,
    academyName = 'Fenerbahce University',
    shortName = 'FBU',
} = {}) => {
    const { rows: [user] } = await db.query(
        `INSERT INTO users (email, wallet_address, role, is_identity_issued)
            VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [email, walletAddress, role, isIdentityIssued],
    );

    await db.query(
        `INSERT INTO academies (user_id, name, short_name, type, country, city)
            VALUES ($1, $2, $3, 'university', 'Turkey', 'Istanbul')`,
        [user.id, academyName, shortName],
    );

    return user;
};

const cleanupDB = async () => {
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
        '../../src/blockchain/identity/academy.identity.blockchain.js': blockchainImpl,
        }
    )
    return app
}

beforeEach(async () => {
  await cleanupDB();
});

afterEach(async () => {
  await cleanupDB();
});


// TESTS
// ─────
describe('POST /api/identity/academies', () => {
    it('returns 200 and the identity DTO on valid input', async () => {
        await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX_HASH,
        });

        const res = await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Academy identity issued successfully');

        const data = res.body.data;
        assert.equal(data.walletAddress, WALLET_ADDRESS);
        assert.equal(data.identityTxHash, FAKE_TX_HASH);
        assert.equal(data.isIdentityIssued, true);
        assert.equal(data.role, 'academy_admin');
        assert.ok(data.email);
    });

    it('normalizes wallet_address to lowercase before querying', async () => {
        await seedAcademyUser({ walletAddress: WALLET_ADDRESS });

        const calls = [];
        const app = await makeApp({
            issueAcademyIdentity: async (wallet, id, name, code) => {
                calls.push({ wallet, id, name, code });
                return FAKE_TX_HASH;
            },
        });

        const res = await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: WALLET_UPPER });

        assert.equal(res.status, 200);
        assert.equal(calls[0].wallet, WALLET_ADDRESS);
    });

    it('persists is_identity_issued=true and identity_tx_hash in the DB', async () => {
        const user = await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => FAKE_TX_HASH,
        });

        await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows: [updated] } = await db.query(
            'SELECT is_identity_issued, identity_tx_hash FROM users WHERE id = $1',
            [user.id],
        );

        assert.equal(updated.is_identity_issued, true);
        assert.equal(updated.identity_tx_hash,   FAKE_TX_HASH);
    });

    it('passes the correct arguments to the blockchain', async () => {
        await seedAcademyUser({
            academyName: 'Fenerbahce University',
            shortName: 'FBU',
        });

        const calls = [];
        const app = await makeApp({
            issueAcademyIdentity: async (wallet, id, name, code) => {
                calls.push({ wallet, id, name, code });
                return FAKE_TX_HASH;
            },
        });

        await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].wallet, WALLET_ADDRESS);
        assert.match(calls[0].id, /^[0-9a-f-]{36}$/);
        assert.equal(calls[0].name, 'Fenerbahce University');
        assert.equal(calls[0].code, 'FBU');
    });

    it('returns 404 USER_NOT_FOUND when wallet does not exist in DB', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: '0x0000000000000000000000000000000000000001' });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'USER_NOT_FOUND');
    });

    it('returns 403 FORBIDDEN when user is not academy_admin', async () => {
        await seedAcademyUser({ role: 'student' });

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('returns 409 IDENTITY_ALREADY_ISSUED when identity was already issued', async () => {
        await seedAcademyUser({ isIdentityIssued: true });

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/academies')
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

        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/academies')
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
            .post('/api/identity/academies')
            .send({ wallet_address: WALLET_ADDRESS });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not update the DB when the blockchain call fails', async () => {
        const user = await seedAcademyUser();

        const app = await makeApp({
            issueAcademyIdentity: async () => {
                const err = new Error('issueAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: WALLET_ADDRESS });

        const { rows: [unchanged] } = await db.query(
            'SELECT is_identity_issued, identity_tx_hash FROM users WHERE id = $1',
            [user.id],
        );

        assert.equal(unchanged.is_identity_issued, false);
        assert.equal(unchanged.identity_tx_hash,   null);
    });

    it('returns 422 when wallet_address is missing', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/academies')
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 for an invalid wallet_address format', async () => {
        const app = await makeApp({ issueAcademyIdentity: async () => FAKE_TX_HASH });

        const res = await request(app)
            .post('/api/identity/academies')
            .send({ wallet_address: 'not-a-wallet' });

        assert.equal(res.status, 422);
        const field = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

});