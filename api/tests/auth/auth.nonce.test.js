import esmock from 'esmock';
import request from 'supertest';
import crypto from 'crypto';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import db from '../../src/config/db.js';


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

const ensureNonceFkOwner = async (role) => {
    if (role === 'academy') {
        const suffix = crypto.randomBytes(4).toString('hex');
        const { rows: [academy] } = await db.query(
            `INSERT INTO academies (
                academy_number, email, name, short_name, type,
                legal_name, registration_number, tax_id
            ) VALUES ($1, $2, $3, $4, 'university', $5, $6, $7)
            RETURNING id`,
            [
                `ACDN-${suffix}`,
                `nonce-acad-${suffix}@seed.test`,
                `Nonce Test Academy ${suffix}`,
                `NTA${suffix.slice(0,4).toUpperCase()}`,
                `Nonce Test Academy ${suffix} Legal`,
                `REG-NONCE-${suffix}`,
                `TAX-NONCE-${suffix}`,
            ],
        );
        return { academy_id: academy.id, user_id: null };
    }
    // For 'student', 'professor', 'system_admin' — need a real user_id.
    const suffix = crypto.randomBytes(4).toString('hex');
    const { rows: [user] } = await db.query(
        `INSERT INTO users (
            first_name, middle_name, last_name, full_name,
            date_of_birth, gender, national_id, nationality, email
        ) VALUES ($1, NULL, $2, $3, '1990-01-01', 'male', $4, 'Testland', $5)
        RETURNING id`,
        [
            'Nonce', `User${suffix}`, `Nonce User ${suffix}`,
            `NID-NONCE-${suffix}`, `nonce-user-${suffix}@seed.test`,
        ],
    );
    return { academy_id: null, user_id: user.id };
};

const seedIdentity = async (walletAddress, role = 'professor', opts = {}) => {
    await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [walletAddress]);
    const { academy_id, user_id } = await ensureNonceFkOwner(role);
    const publicKey = '0x04' + crypto.randomBytes(64).toString('hex');
    await db.query(
        `INSERT INTO identities (wallet_address, public_key, role, nonce, nonce_expires_at, issued_at, revoked_at, academy_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            walletAddress,
            publicKey,
            role,
            opts.nonce ?? null,
            opts.nonce_expires_at ?? null,
            opts.issued_at ?? new Date(),
            opts.revoked_at ?? null,
            academy_id,
            user_id,
        ],
    );
    return { academy_id, user_id };
};

const cleanupIdentity = async (walletAddress) => {
    const { rows } = await db.query(
        `SELECT academy_id, user_id FROM identities WHERE wallet_address = $1`,
        [walletAddress],
    );
    await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [walletAddress]);
    for (const r of rows) {
        if (r.academy_id) await db.query(`DELETE FROM academies WHERE id = $1`, [r.academy_id]);
        if (r.user_id)    await db.query(`DELETE FROM users WHERE id = $1`,     [r.user_id]);
    }
};


describe('GET /api/auth/nonce', function () {
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

    it('returns 200 with the exact response shape on a valid professor identity', async () => {
        await seedIdentity(address, 'professor');
        const app = await makeApp();

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Nonce expires in 5 minutes');
        assert.match(
            res.body.data.message,
            /^Sign this nonce to authenticate: [0-9a-f]{128}$/,
            'data.message must match the exact "Sign this nonce..." prefix with a 64-byte hex nonce',
        );
    });

    it('returns 200 for the student role and routes to getStudentIdentity', async () => {
        await seedIdentity(address, 'student');

        const calls = { student: 0, professor: 0, academy: 0 };
        const app = await makeApp({
            student:   { getStudentIdentity:   async () => { calls.student++;   return buildIdentity(); } },
            professor: { getProfessorIdentity: async () => { calls.professor++; return buildIdentity(); } },
            academy:   { getAcademyIdentity:   async () => { calls.academy++;   return buildIdentity(); } },
        });

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 200);
        assert.equal(calls.student, 1);
        assert.equal(calls.professor, 0);
        assert.equal(calls.academy, 0);
    });

    it('returns 200 for the academy role and routes to getAcademyIdentity', async () => {
        await seedIdentity(address, 'academy');

        const calls = { student: 0, professor: 0, academy: 0 };
        const app = await makeApp({
            student:   { getStudentIdentity:   async () => { calls.student++;   return buildIdentity(); } },
            professor: { getProfessorIdentity: async () => { calls.professor++; return buildIdentity(); } },
            academy:   { getAcademyIdentity:   async () => { calls.academy++;   return buildIdentity(); } },
        });

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 200);
        assert.equal(calls.student, 0);
        assert.equal(calls.professor, 0);
        assert.equal(calls.academy, 1);
    });

    it('persists the nonce and an expiration ~5 minutes in the future', async () => {
        await seedIdentity(address, 'professor');
        const app = await makeApp();

        const before = Date.now();
        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });
        const after = Date.now();

        assert.equal(res.status, 200);
        const expectedNonce = res.body.data.message.replace('Sign this nonce to authenticate: ', '');

        const { rows: [row] } = await db.query(
            `SELECT nonce, nonce_expires_at FROM identities WHERE wallet_address = $1`,
            [address],
        );

        assert.equal(row.nonce, expectedNonce, 'stored nonce must equal the one in the response message');

        const expiresMs = new Date(row.nonce_expires_at).getTime();
        // 5 * 60 * 1000 ms ahead of Date.now() at storeNonce call time
        const lower = before + 4 * 60 * 1000;
        const upper = after  + 6 * 60 * 1000;
        assert.ok(
            expiresMs >= lower && expiresMs <= upper,
            `nonce_expires_at (${expiresMs}) must be between ${lower} and ${upper}`,
        );
    });

    it('checksum-normalises the input address before reading the DB row', async () => {
        // Insert with the checksummed (mixed case) address
        await seedIdentity(address, 'professor');
        const app = await makeApp();

        // Send the lowercase form - the service must call ethers.getAddress() and
        // look the row up with the checksummed value
        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address.toLowerCase() });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);

        const { rows: [row] } = await db.query(
            `SELECT nonce FROM identities WHERE wallet_address = $1`,
            [address],
        );
        assert.ok(row, 'a checksummed row must still exist after the call');
        assert.ok(row.nonce, 'nonce must have been stored on the checksummed row');
    });

    it('returns 404 IDENTITY_NOT_FOUND when no identity row matches the wallet', async () => {
        const app = await makeApp();

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 404);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, 'IDENTITY_NOT_FOUND');
        assert.equal(res.body.message, 'No identity found for the given address');
    });

    it('returns 404 IDENTITY_NOT_FOUND when DB has the row but blockchain returns null', async () => {
        await seedIdentity(address, 'professor');
        const app = await makeApp({
            professor: { getProfessorIdentity: async () => null },
        });

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'IDENTITY_NOT_FOUND');
        assert.equal(res.body.message, 'No identity found for the given address');
    });

    it('returns 403 IDENTITY_REVOKED when blockchain returns isRevoked=true', async () => {
        await seedIdentity(address, 'professor');
        const app = await makeApp({
            professor: { getProfessorIdentity: async () => REVOKED_IDENTITY },
        });

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'IDENTITY_REVOKED');
        assert.equal(res.body.message, 'Identity has been revoked');
    });

    it('returns 400 INVALID_ROLE when the DB role is not student/professor/academy', async () => {
        // 'system_admin' is in the user_role enum but not handled in the switch
        await seedIdentity(address, 'system_admin');
        const app = await makeApp();

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_ROLE');
        assert.equal(res.body.message, 'Invalid role');
    });

    it('does not persist a nonce when the blockchain returns null (404 short-circuit)', async () => {
        await seedIdentity(address, 'professor');
        const app = await makeApp({
            professor: { getProfessorIdentity: async () => null },
        });

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: address });

        assert.equal(res.status, 404);
        const { rows: [row] } = await db.query(
            `SELECT nonce, nonce_expires_at FROM identities WHERE wallet_address = $1`,
            [address],
        );
        assert.equal(row.nonce, null);
        assert.equal(row.nonce_expires_at, null);
    });

    it('returns 422 when the address query parameter is missing', async () => {
        const app = await makeApp();

        const res = await request(app).get('/api/auth/nonce');

        assert.equal(res.status, 422);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
    });

    it('returns 422 when the address query parameter has an invalid format', async () => {
        const app = await makeApp();

        const res = await request(app)
            .get('/api/auth/nonce')
            .query({ wallet_address: 'not-an-address' });

        assert.equal(res.status, 422);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
    });
});
