import esmock from 'esmock';
import request from 'supertest';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';
import { verifyAccessToken, verifyRefreshToken } from '../../src/utils/jwt.js';


const buildIdentity = (overrides = {}) => ({
    identity: {},
    status: {
        issuedAt: new Date('2024-01-01'),
        issuer: '0x0000000000000000000000000000000000000001',
        isRevoked: false,
        revokedAt: null,
        revoker: null,
        ...(overrides.status ?? {}),
    },
});

const REVOKED_IDENTITY = buildIdentity({
    status: {
        issuedAt: new Date('2024-01-01'),
        issuer: '0x0000000000000000000000000000000000000001',
        isRevoked: true,
        revokedAt: new Date('2024-06-01'),
        revoker: '0x0000000000000000000000000000000000000002',
    },
});

const noopTx = async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) });

const DEFAULT_BLOCKCHAIN = {
    student: {
        issueStudentIdentity:  noopTx,
        revokeStudentIdentity: noopTx,
        getStudentIdentity:    async () => buildIdentity(),
    },
    professor: {
        issueProfessorIdentity:  noopTx,
        revokeProfessorIdentity: noopTx,
        getProfessorIdentity:    async () => buildIdentity(),
    },
    academy: {
        issueAcademyIdentity:  noopTx,
        revokeAcademyIdentity: noopTx,
        getAcademyIdentity:    async () => buildIdentity(),
    },
};

const makeApp = async (overrides = {}) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/student.identity.blockchain.js':
                { ...DEFAULT_BLOCKCHAIN.student,   ...(overrides.student ?? {}) },
            '../../src/blockchain/identity/professor.identity.blockchain.js':
                { ...DEFAULT_BLOCKCHAIN.professor, ...(overrides.professor ?? {}) },
            '../../src/blockchain/identity/academy.identity.blockchain.js':
                { ...DEFAULT_BLOCKCHAIN.academy,   ...(overrides.academy ?? {}) },
            '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
        },
    );
    return app;
};

const HEX_NONCE_64_BYTES = 'a'.repeat(128); // 64 bytes hex

const seedIdentity = async (
    walletAddress,
    role = 'professor',
    {
        nonce = HEX_NONCE_64_BYTES,
        nonce_expires_at = new Date(Date.now() + 5 * 60 * 1000),
        is_active = true,
    } = {},
) => {
    await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [walletAddress]);
    await db.query(
        `INSERT INTO identities (wallet_address, role, nonce, nonce_expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        [walletAddress, role, nonce, nonce_expires_at, is_active],
    );
    return nonce;
};

const cleanupIdentity = async (walletAddress) => {
    await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [walletAddress]);
};

const signNonce = (wallet, nonce) =>
    wallet.signMessage(`Sign this nonce to authenticate: ${nonce}`);

// 132-char filler signature for tests where we know we'll fail before signature verification.
// (The Joi validator only checks length, not cryptographic validity.)
const FILLER_SIGNATURE = '0x' + '11'.repeat(65);


describe('POST /api/auth/verify', function () {
    this.timeout(10000);

    let wallet;
    let address;

    beforeEach(() => {
        wallet  = ethers.Wallet.createRandom();
        address = wallet.address; // checksummed
    });

    afterEach(async () => {
        await cleanupIdentity(address);
        await cleanupIdentity(address.toLowerCase());
    });

    it('returns 201 with { accessToken, refreshToken } on a valid signature for a professor', async () => {
        const nonce = await seedIdentity(address, 'professor');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature });

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'User authenticated successfully');

        assert.ok(res.body.data.accessToken,  'response must contain accessToken');
        assert.ok(res.body.data.refreshToken, 'response must contain refreshToken');

        // Tokens are encrypted JWTs - verify they decrypt and carry the right payload
        const accessPayload  = verifyAccessToken(res.body.data.accessToken);
        const refreshPayload = verifyRefreshToken(res.body.data.refreshToken);

        assert.equal(accessPayload.address,  address);
        assert.equal(accessPayload.role,     'professor');
        assert.equal(refreshPayload.address, address);
        assert.equal(refreshPayload.role,    'professor');
    });

    it('returns 201 for a student with valid signature', async () => {
        const nonce = await seedIdentity(address, 'student');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature });

        assert.equal(res.status, 201);
        const accessPayload = verifyAccessToken(res.body.data.accessToken);
        assert.equal(accessPayload.role, 'student');
    });

    it('returns 201 for an academy with valid signature', async () => {
        const nonce = await seedIdentity(address, 'academy');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature });

        assert.equal(res.status, 201);
        const accessPayload = verifyAccessToken(res.body.data.accessToken);
        assert.equal(accessPayload.role, 'academy');
    });

    it('clears the nonce columns after successful verification', async () => {
        const nonce = await seedIdentity(address, 'professor');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature });

        assert.equal(res.status, 201);

        const { rows: [row] } = await db.query(
            `SELECT nonce, nonce_expires_at FROM identities WHERE wallet_address = $1`,
            [address],
        );
        assert.equal(row.nonce, null,            'nonce must be cleared after successful verify');
        assert.equal(row.nonce_expires_at, null, 'nonce_expires_at must be cleared after successful verify');
    });

    it('checksum-normalises the input address before lookup', async () => {
        const nonce = await seedIdentity(address, 'professor');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address: address.toLowerCase(), signature });

        assert.equal(res.status, 201);
        const accessPayload = verifyAccessToken(res.body.data.accessToken);
        assert.equal(accessPayload.address, address, 'accessToken must carry the checksummed address');
    });

    // ── Validation ──────────────────────────────────────────────────────────────
    it('returns 422 VALIDATION_ERROR when address is missing', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ signature: FILLER_SIGNATURE });

        assert.equal(res.status, 422);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(res.body.errors));

        const found = res.body.errors.find(e => e.field === 'address');
        assert.ok(found, 'errors must contain an address entry');
    });

    it('returns 422 VALIDATION_ERROR when signature is missing', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const found = res.body.errors.find(e => e.field === 'signature');
        assert.ok(found, 'errors must contain a signature entry');
    });

    it('returns 422 VALIDATION_ERROR when address has an invalid format', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address: 'not-an-address', signature: FILLER_SIGNATURE });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const found = res.body.errors.find(e => e.field === 'address');
        assert.ok(found, 'errors must contain an address entry');
    });

    it('returns 422 VALIDATION_ERROR when address is too short (39 hex chars)', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address: '0x' + 'a'.repeat(39), signature: FILLER_SIGNATURE });

        assert.equal(res.status, 422);
        const found = res.body.errors.find(e => e.field === 'address');
        assert.ok(found);
    });

    it('returns 422 VALIDATION_ERROR when signature is shorter than 132 chars', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: '0x' + '11'.repeat(64) }); // 130 chars

        assert.equal(res.status, 422);
        const found = res.body.errors.find(e => e.field === 'signature');
        assert.ok(found, 'errors must contain a signature entry');
    });

    it('returns 422 VALIDATION_ERROR when signature is longer than 132 chars', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: '0x' + '11'.repeat(66) }); // 134 chars

        assert.equal(res.status, 422);
        const found = res.body.errors.find(e => e.field === 'signature');
        assert.ok(found);
    });

    // ── Identity lookup ────────────────────────────────────────────────────────
    it('returns 404 IDENTITY_NOT_FOUND when no identity row exists', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'IDENTITY_NOT_FOUND');
        assert.equal(res.body.message, 'No identity found for the given address');
    });

    it('returns 404 IDENTITY_NOT_FOUND when DB has the row but the blockchain returns null', async () => {
        await seedIdentity(address, 'professor');
        const app = await makeApp({
            professor: { getProfessorIdentity: async () => null },
        });

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'IDENTITY_NOT_FOUND');
    });

    it('returns 403 IDENTITY_REVOKED when the blockchain identity is revoked', async () => {
        await seedIdentity(address, 'professor');
        const app = await makeApp({
            professor: { getProfessorIdentity: async () => REVOKED_IDENTITY },
        });

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'IDENTITY_REVOKED');
        assert.equal(res.body.message, 'Identity has been revoked');
    });

    it('returns 400 INVALID_ROLE when the DB role is not handled (system_admin)', async () => {
        await seedIdentity(address, 'system_admin');
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_ROLE');
        assert.equal(res.body.message, 'Invalid role');
    });

    // ── Nonce expiration ───────────────────────────────────────────────────────
    it('returns 400 INVALID_NONCE when no nonce is stored on the row', async () => {
        await seedIdentity(address, 'professor', { nonce: null, nonce_expires_at: null });
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_NONCE');
        assert.equal(res.body.message, 'Nonce is missing or has expired');
    });

    it('returns 400 INVALID_NONCE when the nonce has expired', async () => {
        await seedIdentity(address, 'professor', {
            nonce: HEX_NONCE_64_BYTES,
            nonce_expires_at: new Date(Date.now() - 1000),
        });
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_NONCE');
    });

    it('does not clear the nonce when verification fails before deleteNonce', async () => {
        await seedIdentity(address, 'professor', {
            nonce: HEX_NONCE_64_BYTES,
            nonce_expires_at: new Date(Date.now() - 1000),
        });
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 400);

        const { rows: [row] } = await db.query(
            `SELECT nonce FROM identities WHERE wallet_address = $1`,
            [address],
        );
        assert.equal(row.nonce, HEX_NONCE_64_BYTES, 'nonce must remain when expired-check fails');
    });

    // ── Signature validation ───────────────────────────────────────────────────
    it('returns 401 INVALID_SIGNATURE when the signature is from a different wallet', async () => {
        const nonce = await seedIdentity(address, 'professor');
        const otherWallet = ethers.Wallet.createRandom();
        const wrongSignature = await signNonce(otherWallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: wrongSignature });

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'INVALID_SIGNATURE');
        assert.equal(res.body.message, 'Invalid signature');
    });

    it('returns 401 INVALID_SIGNATURE when the signature is for a different nonce', async () => {
        await seedIdentity(address, 'professor', { nonce: HEX_NONCE_64_BYTES });
        const wrongSignature = await signNonce(wallet, 'a-different-nonce');

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: wrongSignature });

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'INVALID_SIGNATURE');
    });

    it('does not clear the nonce when the signature is invalid', async () => {
        const nonce = await seedIdentity(address, 'professor');
        const otherWallet = ethers.Wallet.createRandom();
        const wrongSignature = await signNonce(otherWallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ address, signature: wrongSignature });

        assert.equal(res.status, 401);

        const { rows: [row] } = await db.query(
            `SELECT nonce FROM identities WHERE wallet_address = $1`,
            [address],
        );
        assert.equal(row.nonce, nonce, 'nonce must remain when signature check fails');
    });
});
