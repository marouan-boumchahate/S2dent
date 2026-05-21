import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';

const FAKE_TX_HASH = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
const WALLET_ADDRESS = ethers.getAddress('0x8fa1b2c3d4e5f67890123456789abcdefabcdef0');
const WALLET_UPPER = '0x8FA1B2C3D4E5F67890123456789ABCDEFABCDEF0';

const FAKE_TX = {
    hash: FAKE_TX_HASH,
    wait: async () => ({ hash: FAKE_TX_HASH }),
};

const REVOCATION_REASON = 'Identity requested by academy';
const ACADEMY_IDENTITY_PUBLIC_KEY = ethers.Wallet.createRandom().signingKey.publicKey;

const DEFAULT_CA_ATTRS = {
    getAcademyCertificateAttrs: () => ({ fake: 'attrs' }),
};
const DEFAULT_CA_IDENTITY = { buildIdentityCertificate: async () => ({}) };

const seedAcademy = async ({
    wallet_address = WALLET_ADDRESS,
    academy_name = 'Fenerbahce University',
    short_name = 'FBU',
} = {}) => {
    const { rows: [{ nextval }] } = await db.query(
        `SELECT nextval('academy_seq')`
    );
    const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`;

    const legalName = `${academy_name} Legal ${nextval}`;
    const registrationNumber = `REG-${nextval}`;
    const taxId = `TAX-${nextval}`;
    const billingEmail = `billing-${nextval}@test-identity.edu`;
    const email = `academy-${nextval}@test-identity.edu`;

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
        [academy.id, wallet_address, ACADEMY_IDENTITY_PUBLIC_KEY],
    );

    return academy;
};

const cleanupDB = async () => {
    await db.query(
        `DELETE FROM identities
         WHERE wallet_address = $1
            OR academy_id IN (
                SELECT id FROM academies
                WHERE email LIKE '%@fenerbahce%'
                   OR email LIKE '%@test-identity%'
                   OR name LIKE 'Fenerbahce%'
            )`,
        [WALLET_ADDRESS],
    );

    await db.query(
        `DELETE FROM identity_certificates
         WHERE wallet_address = $1`,
        [WALLET_ADDRESS],
    );

    await db.query(
        `DELETE FROM pending_transactions
         WHERE tx_hash = $1
            OR payload->>'wallet_address' = $2`,
        [FAKE_TX_HASH, WALLET_ADDRESS],
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
};

const DEFAULT_BLOCKCHAIN_IMPL = {
    issueAcademyIdentity: async () => FAKE_TX,
    revokeAcademyIdentity: async () => FAKE_TX,
    getAcademyIdentity: async () => null,
};

const makeApp = async (
    blockchainImpl = {},
    listenerImpl = { listenOnTransaction: () => {} },
    caAttrsImpl = {},
    caIdentityImpl = DEFAULT_CA_IDENTITY,
) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/academy.identity.blockchain.js': {
                ...DEFAULT_BLOCKCHAIN_IMPL,
                ...blockchainImpl,
            },
            '../../src/blockchain/listener.js': listenerImpl,
            '../../src/ca/ca.attrs.js': { ...DEFAULT_CA_ATTRS, ...caAttrsImpl },
            '../../src/ca/ca.identity.js': caIdentityImpl,
        },
    );
    return app;
};

const endpoint = '/api/identity/academies/revoke';

describe('POST /api/identity/academies/revoke', function () {
    this.timeout(15000);

    beforeEach(async () => { await cleanupDB(); });
    afterEach(async () => { await cleanupDB(); });

    it('returns 200 with blockchain_transaction on valid input', async () => {
        await seedAcademy();

        const app = await makeApp({ revokeAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS, revocation_reason: REVOCATION_REASON });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Academy identity revocation request submitted successfully');

        const { blockchain_transaction } = res.body.data;

        assert.equal(blockchain_transaction.tx_hash, FAKE_TX_HASH);
        assert.equal(blockchain_transaction.status, 'pending');
    });

    it('normalizes wallet_address to lowercase before processing', async () => {
        await seedAcademy({ wallet_address: WALLET_ADDRESS });

        const calls = [];
        const app = await makeApp({
            revokeAcademyIdentity: async (payload) => {
                calls.push(payload);
                return FAKE_TX;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_UPPER, revocation_reason: REVOCATION_REASON });

        assert.equal(res.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].academyAddress, WALLET_ADDRESS);
        assert.equal(calls[0].reason, REVOCATION_REASON);
    });

    it('inserts a pending_transaction row after successful submission', async () => {
        await seedAcademy();

        const app = await makeApp({ revokeAcademyIdentity: async () => FAKE_TX });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS, revocation_reason: REVOCATION_REASON });

        const { rows: [pending] } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );

        assert.ok(pending, 'pending_transaction row should exist');
        assert.equal(pending.status, 'pending');
        assert.equal(pending.payload.wallet_address, WALLET_ADDRESS);
        assert.equal(pending.payload.reason, REVOCATION_REASON);
        assert.equal(pending.payload.action, 'identity_revoke');
    });

    it('fires listenOnTransaction in the background after submission', async () => {
        await seedAcademy();

        const listenerCalls = [];
        const app = await makeApp(
            { revokeAcademyIdentity: async () => FAKE_TX },
            { listenOnTransaction: (tx) => listenerCalls.push(tx) },
        );

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS, revocation_reason: REVOCATION_REASON });

        assert.equal(listenerCalls.length, 1);
        assert.equal(listenerCalls[0].hash, FAKE_TX_HASH);
    });

    it('returns 404 ACADEMY_NOT_FOUND when wallet has no academy row', async () => {
        const app = await makeApp({ revokeAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: '0x0000000000000000000000000000000000000001', revocation_reason: REVOCATION_REASON });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'ACADEMY_NOT_FOUND');
    });

    it('returns 502 BLOCKCHAIN_ERROR when the blockchain call fails', async () => {
        await seedAcademy();

        const app = await makeApp({
            revokeAcademyIdentity: async () => {
                const err = new Error('revokeAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS, revocation_reason: REVOCATION_REASON });

        assert.equal(res.status, 502);
        assert.equal(res.body.code, 'BLOCKCHAIN_ERROR');
    });

    it('does not insert a pending_transaction when blockchain submission fails', async () => {
        await seedAcademy();

        const app = await makeApp({
            revokeAcademyIdentity: async () => {
                const err = new Error('revokeAcademyIdentity failed: execution reverted');
                err.statusCode = 502;
                err.code = 'BLOCKCHAIN_ERROR';
                throw err;
            },
        });

        await request(app)
            .post(endpoint)
            .send({ wallet_address: WALLET_ADDRESS, revocation_reason: REVOCATION_REASON });

        const { rows } = await db.query(
            `SELECT * FROM pending_transactions WHERE tx_hash = $1`,
            [FAKE_TX_HASH],
        );
        assert.equal(rows.length, 0);
    });

    it('returns 422 VALIDATION_ERROR when wallet_address is missing', async () => {
        const app = await makeApp({ revokeAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ revocation_reason: REVOCATION_REASON });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        const field = res.body.errors.find((e) => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });

    it('returns 422 VALIDATION_ERROR for an invalid wallet_address format', async () => {
        const app = await makeApp({ revokeAcademyIdentity: async () => FAKE_TX });

        const res = await request(app)
            .post(endpoint)
            .send({ wallet_address: 'not-a-wallet', revocation_reason: REVOCATION_REASON });

        assert.equal(res.status, 422);
        const field = res.body.errors.find((e) => e.field === 'wallet_address');
        assert.ok(field, 'errors should contain a wallet_address entry');
    });
});
