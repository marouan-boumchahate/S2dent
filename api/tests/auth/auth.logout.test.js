import esmock from 'esmock';
import request from 'supertest';
import sinon from 'sinon';
import crypto from 'crypto';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import { signTokens } from '../../src/utils/jwt.js';


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

const noopTx = async () => ({ hash: '0x0', wait: async () => ({ hash: '0x0' }) });

const DEFAULT_BLOCKCHAIN = {
    student:   { issueStudentIdentity: noopTx,   revokeStudentIdentity: noopTx,   getStudentIdentity:   async () => buildIdentity() },
    professor: { issueProfessorIdentity: noopTx, revokeProfessorIdentity: noopTx, getProfessorIdentity: async () => buildIdentity() },
    academy:   { issueAcademyIdentity: noopTx,   revokeAcademyIdentity: noopTx,   getAcademyIdentity:   async () => buildIdentity() },
};

const TEST_IP = '127.0.0.1';
const TEST_UA = 'logout-test-agent/1.0';

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const cacheKeyFor = (token) => `refresh:${sha256(token)}`;

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
            '../../src/cache/cache.client.js':  cache,
        },
    );
    return { app, cache };
};

const issueRefreshToken = (address, role = 'professor') => {
    const options = (role === 'student')
        ? { accessExpiresIn: '15m', refreshExpiresIn: '3h' }
        : { accessExpiresIn: '1h',  refreshExpiresIn: '1d' };
    return signTokens({ address, role }, options).refreshToken;
};

const logoutReq = (app, refreshToken) =>
    request(app)
        .delete('/api/auth/logout')
        .set('User-Agent', TEST_UA)
        .set('X-Forwarded-For', TEST_IP)
        .send({ refresh_token: refreshToken });


describe('DELETE /api/auth/logout', function () {
    this.timeout(10000);

    let address;

    beforeEach(() => {
        address = ethers.Wallet.createRandom().address;
    });

    // ── Validation ──────────────────────────────────────────────────────────────
    it('returns 422 VALIDATION_ERROR when refreshToken is missing', async () => {
        const { app } = await makeApp();

        const res = await request(app).delete('/api/auth/logout').send({});

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
        assert.ok(res.body.errors.find(e => e.field === 'refresh_token'));
    });

    it('returns 422 VALIDATION_ERROR when refreshToken is an empty string', async () => {
        const { app } = await makeApp();

        const res = await request(app).delete('/api/auth/logout').send({ refresh_token: '' });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
    });

    // ── Cache check (runs before delete) ───────────────────────────────────────
    it('returns 401 UNAUTHORIZED when the refresh token is not in cache', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app, cache } = await makeApp({
            cache: makeCacheStubs({ getCache: sinon.stub().resolves(null) }),
        });

        const res = await logoutReq(app, refreshToken);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
        assert.equal(cache.delCache.called, false, 'delCache must not be called on cache miss');
    });

    it('returns 401 UNAUTHORIZED when the cached ip does not match the request ip', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app, cache } = await makeApp({
            cache: makeCacheStubs({
                getCache: sinon.stub().resolves(JSON.stringify({ ip: '8.8.8.8', device: TEST_UA })),
            }),
        });

        const res = await logoutReq(app, refreshToken);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
        assert.equal(cache.delCache.called, false);
    });

    it('returns 401 UNAUTHORIZED when the cached device does not match the request user-agent', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app, cache } = await makeApp({
            cache: makeCacheStubs({
                getCache: sinon.stub().resolves(JSON.stringify({ ip: TEST_IP, device: 'other-agent' })),
            }),
        });

        const res = await logoutReq(app, refreshToken);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
        assert.equal(cache.delCache.called, false);
    });

    // ── Successful logout ──────────────────────────────────────────────────────
    it('returns 200 and deletes the refresh token from cache under key `refresh:{sha256(token)}`', async () => {
        const refreshToken = issueRefreshToken(address, 'professor');
        const { app, cache } = await makeApp();

        const res = await logoutReq(app, refreshToken);

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Logged out successfully');
        assert.equal(cache.delCache.calledOnce, true, 'delCache must be called exactly once on logout');
        assert.equal(cache.delCache.firstCall.args[0], cacheKeyFor(refreshToken));
    });
});
