import esmock from 'esmock';
import request from 'supertest';
import sinon from 'sinon';
import crypto from 'crypto';
import { strict as assert } from 'assert';
import { ethers, keccak256 } from 'ethers';
import { signTokens, verifyAccessToken } from '../../src/utils/jwt.js';


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

const makeUuid = () => (crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex'));

// supertest sends from localhost; trust proxy lets us pin req.ip via X-Forwarded-For.
const TEST_IP = '127.0.0.1';
const TEST_UA = 'test-agent/1.0';

// Default cache stubs treat any refresh token as present in cache for the
// (TEST_IP, TEST_UA) tuple, so the refresh flow advances past the cache check.
// Service does JSON.parse on the cached value, so the stub must return a JSON string.
const makeCacheStubs = (overrides = {}) => ({
    getCache: sinon.stub().resolves(JSON.stringify({ ip: TEST_IP, device: TEST_UA })),
    setCache: sinon.stub().resolves(),
    delCache: sinon.stub().resolves(),
    ...overrides,
});

const makeApp = async ({ blockchain = {}, cache = makeCacheStubs() } = {}) => {
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        {
            '../../src/blockchain/identity/student.identity.blockchain.js':
                { ...DEFAULT_BLOCKCHAIN.student,   ...(blockchain.student ?? {}) },
            '../../src/blockchain/identity/professor.identity.blockchain.js':
                { ...DEFAULT_BLOCKCHAIN.professor, ...(blockchain.professor ?? {}) },
            '../../src/blockchain/identity/academy.identity.blockchain.js':
                { ...DEFAULT_BLOCKCHAIN.academy,   ...(blockchain.academy ?? {}) },
            '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
            '../../src/cache/cache.client.js': cache,
        },
    );
    return { app, cache };
};

// auth.service uses different expiries depending on role:
//   student -> { accessExpiresIn: '15m', refreshExpiresIn: '3h' }
//   else    -> { accessExpiresIn: '1h',  refreshExpiresIn: '1d' }
const issueRefreshToken = (address, role = 'professor') => {
    const options = (role === 'student')
        ? { accessExpiresIn: '15m', refreshExpiresIn: '3h' }
        : { accessExpiresIn: '1h',  refreshExpiresIn: '1d' };

    return signTokens({ sub: address, role }, options).refreshToken;
};

const issueRefreshTokenWithClaims = (address, role, claims = {}) => {
    const options = (role === 'student')
        ? { accessExpiresIn: '15m', refreshExpiresIn: '3h' }
        : { accessExpiresIn: '1h',  refreshExpiresIn: '1d' };

    return signTokens({ sub: address, role, ...claims }, options).refreshToken;
};

const refreshReq = (app, refreshToken) =>
    request(app)
        .post('/api/auth/refresh')
        .set('User-Agent', TEST_UA)
        .set('X-Forwarded-For', TEST_IP)
        .send({ refresh_token: refreshToken });


// Seed an identity row so refreshTokenService.fetchIdentityByAddress(sub) succeeds.
import db from '../../src/config/db.js';

const seedIdentityForAddress = async (walletAddress, role) => {
    await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [walletAddress]);
    const publicKey = '0x04' + crypto.randomBytes(64).toString('hex');
    if (role === 'academy') {
        const suffix = crypto.randomBytes(4).toString('hex');
        const { rows: [academy] } = await db.query(
            `INSERT INTO academies (academy_number, email, name, short_name, type, legal_name, registration_number, tax_id)
             VALUES ($1, $2, $3, $4, 'university', $5, $6, $7)
             RETURNING id`,
            [`ACR-${suffix}`, `refresh-${suffix}@seed.test`, `Refresh Academy ${suffix}`, `RA${suffix.slice(0,4).toUpperCase()}`, `Refresh Academy ${suffix} Legal`, `REG-RFR-${suffix}`, `TAX-RFR-${suffix}`],
        );
        await db.query(
            `INSERT INTO identities (wallet_address, public_key, role, academy_id, is_active)
             VALUES ($1, $2, 'academy', $3, TRUE)`,
            [walletAddress, publicKey, academy.id],
        );
        return { academy_id: academy.id };
    }
    const suffix = crypto.randomBytes(4).toString('hex');
    const { rows: [user] } = await db.query(
        `INSERT INTO users (first_name, middle_name, last_name, full_name, date_of_birth, gender, national_id, nationality, email)
         VALUES ($1, NULL, $2, $3, '1990-01-01', 'male', $4, 'Testland', $5)
         RETURNING id`,
        ['Refresh', `User${suffix}`, `Refresh User ${suffix}`, `NID-RFR-${suffix}`, `refresh-user-${suffix}@seed.test`],
    );
    await db.query(
        `INSERT INTO identities (wallet_address, public_key, role, user_id, is_active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [walletAddress, publicKey, role === 'system_admin' ? 'system_admin' : role, user.id],
    );
    return { user_id: user.id };
};

const cleanupSeed = async (walletAddress) => {
    const { rows } = await db.query(`SELECT academy_id, user_id FROM identities WHERE wallet_address = $1`, [walletAddress]);
    await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [walletAddress]);
    for (const r of rows) {
        if (r.academy_id) await db.query(`DELETE FROM academies WHERE id = $1`, [r.academy_id]);
        if (r.user_id)    await db.query(`DELETE FROM users WHERE id = $1`,     [r.user_id]);
    }
};


describe('POST /api/auth/refresh', function () {
    this.timeout(10000);

    let address;

    beforeEach(async () => {
        address = ethers.Wallet.createRandom().address;
        // Seed a generic identity row so fetchIdentityByAddress(sub) succeeds.
        // The seeded role is irrelevant for the refresh service: it uses the role
        // claim from the token, not the DB row.
        await seedIdentityForAddress(address, 'professor');
    });

    afterEach(async () => {
        await cleanupSeed(address);
    });

    it('returns 201 with a new accessToken and the same refreshToken on a valid input (professor)', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app } = await makeApp();

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Token refreshed successfully');

        assert.ok(res.body.data.access_token,   'response must contain accessToken');
        assert.equal(res.body.data.refresh_token, refreshToken,
            'response must echo the same refreshToken back');

        const accessPayload = verifyAccessToken(res.body.data.access_token);
        assert.equal(accessPayload.sub, address);
        assert.equal(accessPayload.role,    'professor');
    });

    it('propagates uid and rid claims from the refresh token', async () => {
        const uid = makeUuid();
        const rid = makeUuid();
        const refreshToken = issueRefreshTokenWithClaims(address, 'student', { uid, rid });
        const { app } = await makeApp();

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 201);

        const accessPayload = verifyAccessToken(res.body.data.access_token);
        assert.equal(accessPayload.uid, uid);
        assert.equal(accessPayload.rid, rid);
        assert.equal(accessPayload.role, 'student');
    });

    it('sets uid and rid to null when the refresh token belongs to an academy', async () => {
        const refreshToken = issueRefreshTokenWithClaims(address, 'academy', { uid: null, rid: null });
        const { app } = await makeApp();

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 201);

        const accessPayload = verifyAccessToken(res.body.data.access_token);
        assert.equal(accessPayload.uid, null);
        assert.equal(accessPayload.rid, null);
        assert.equal(accessPayload.role, 'academy');
    });

    it('returns 201 for a valid student refreshToken and routes to getStudentIdentity', async () => {
        const refreshToken = issueRefreshToken(address, 'student');

        const calls = { student: 0, professor: 0, academy: 0 };
        const { app } = await makeApp({
            blockchain: {
                student:   { getStudentIdentity:   async () => { calls.student++;   return buildIdentity(); } },
                professor: { getProfessorIdentity: async () => { calls.professor++; return buildIdentity(); } },
                academy:   { getAcademyIdentity:   async () => { calls.academy++;   return buildIdentity(); } },
            },
        });

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 201);
        assert.equal(calls.student, 1);
        assert.equal(calls.professor, 0);
        assert.equal(calls.academy, 0);

        const accessPayload = verifyAccessToken(res.body.data.access_token);
        assert.equal(accessPayload.role, 'student');
    });

    it('returns 201 for a valid academy refreshToken and routes to getAcademyIdentity', async () => {
        const refreshToken = issueRefreshToken(address, 'academy');

        const calls = { student: 0, professor: 0, academy: 0 };
        const { app } = await makeApp({
            blockchain: {
                student:   { getStudentIdentity:   async () => { calls.student++;   return buildIdentity(); } },
                professor: { getProfessorIdentity: async () => { calls.professor++; return buildIdentity(); } },
                academy:   { getAcademyIdentity:   async () => { calls.academy++;   return buildIdentity(); } },
            },
        });

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 201);
        assert.equal(calls.student, 0);
        assert.equal(calls.professor, 0);
        assert.equal(calls.academy, 1);
    });

    // ── Validation ──────────────────────────────────────────────────────────────
    it('returns 422 VALIDATION_ERROR when refreshToken is missing', async () => {
        const { app } = await makeApp();

        const res = await request(app)
            .post('/api/auth/refresh')
            .send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(res.body.errors));

        const found = res.body.errors.find(e => e.field === 'refresh_token');
        assert.ok(found, 'errors must contain a refreshToken entry');
    });

    it('returns 422 VALIDATION_ERROR when refreshToken is an empty string', async () => {
        const { app } = await makeApp();

        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refresh_token: '' });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const found = res.body.errors.find(e => e.field === 'refresh_token');
        assert.ok(found, 'errors must contain a refreshToken entry');
    });

    it('returns 422 VALIDATION_ERROR when refreshToken is not a string', async () => {
        const { app } = await makeApp();

        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refresh_token: 12345 });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const found = res.body.errors.find(e => e.field === 'refresh_token');
        assert.ok(found);
    });

    // ── Cache check (runs before any blockchain / jwt work) ─────────────────────
    it('returns 401 UNAUTHORIZED when the refresh token is not in cache', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app } = await makeApp({
            cache: makeCacheStubs({ getCache: sinon.stub().resolves(null) }),
        });

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED when the cached ip does not match the request ip', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app } = await makeApp({
            cache: makeCacheStubs({
                getCache: sinon.stub().resolves(JSON.stringify({ ip: '8.8.8.8', device: TEST_UA })),
            }),
        });

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED when the cached device does not match the request user-agent', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app } = await makeApp({
            cache: makeCacheStubs({
                getCache: sinon.stub().resolves(JSON.stringify({ ip: TEST_IP, device: 'other-agent' })),
            }),
        });

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    // ── Identity checks (run AFTER successful jwt verification) ─────────────────
    it('returns 404 IDENTITY_NOT_FOUND when the blockchain returns null for the identity', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app } = await makeApp({
            blockchain: { professor: { getProfessorIdentity: async () => null } },
        });

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 404);
        assert.equal(res.body.code, 'IDENTITY_NOT_FOUND');
        assert.equal(res.body.message, 'No identity found for the given address');
    });

    it('returns 403 IDENTITY_REVOKED when the blockchain identity has been revoked', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app } = await makeApp({
            blockchain: { professor: { getProfessorIdentity: async () => REVOKED_IDENTITY } },
        });

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'IDENTITY_REVOKED');
        assert.equal(res.body.message, 'Identity has been revoked');
    });

    it('returns 400 INVALID_ROLE when the token role is not one of student/professor/academy', async () => {
        const refreshToken = issueRefreshToken(address, 'system_admin');
        const { app } = await makeApp();

        const res = await refreshReq(app, refreshToken);

        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'INVALID_ROLE');
        assert.equal(res.body.message, 'Invalid role');
    });

    // ── Token failures (jwt/decrypt errors propagate without statusCode → 500) ─
    it('returns 500 when refreshToken is malformed (decryption fails)', async () => {
        const { app } = await makeApp();

        const res = await refreshReq(app, 'not-a-real-token');

        assert.equal(res.status, 500);
        assert.equal(res.body.success, false);
    });

    it('returns 500 when refreshToken decrypts but jwt signature is wrong', async () => {
        // Use the access token (signed with ACCESS_SECRET) where a refresh token
        // (signed with REFRESH_SECRET) is required — both share the same encryption
        // key so decrypt succeeds but jwt.verify with REFRESH_SECRET fails.
        const { accessToken } = signTokens({ address, role: 'professor' });
        const { app } = await makeApp();

        const res = await refreshReq(app, accessToken);

        assert.equal(res.status, 500);
        assert.equal(res.body.success, false);
    });

    // ── Cache integration (sinon-stubbed cache layer) ──────────────────────────
    describe('cache integration', () => {
        const hash = (text) => keccak256(Buffer.from(text, 'utf8'));
        const cacheKeyFor = (token) => `refresh:${hash(token)}`;

        it('looks up the refresh token in cache under key `refresh:{hash(token)}`', async () => {
            const refreshToken = issueRefreshToken(address, 'professor');
            const { app, cache } = await makeApp();

            const res = await refreshReq(app, refreshToken);

            assert.equal(res.status, 201);
            assert.equal(cache.getCache.calledOnce, true);
            assert.equal(cache.getCache.firstCall.args[0], cacheKeyFor(refreshToken));
        });

        it('returns the same refresh token without rotating it (no setCache / no delCache)', async () => {
            const refreshToken = issueRefreshToken(address, 'professor');
            const { app, cache } = await makeApp();

            const res = await refreshReq(app, refreshToken);

            assert.equal(res.status, 201);
            assert.equal(res.body.data.refresh_token, refreshToken,
                'refresh service must echo the same refreshToken back (no rotation)');
            assert.equal(cache.setCache.called, false, 'setCache must not be called on refresh');
            assert.equal(cache.delCache.called, false, 'delCache must not be called on refresh');
        });
    });
});
