import esmock from 'esmock';
import request from 'supertest';
import sinon from 'sinon';
import crypto from 'crypto';
import { strict as assert } from 'assert';
import { ethers } from 'ethers';
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

const makeCacheStubs = (overrides = {}) => ({
    getCache: sinon.stub().resolves(null),
    setCache: sinon.stub().resolves(),
    delCache: sinon.stub().resolves(),
    ...overrides,
});

const makeApp = async ({ cache = makeCacheStubs(), blockchain = {} } = {}) => {
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
            '../../src/blockchain/s2dent.blockchain.js': {
                isOwnerService: sinon.stub().resolves(true),
                ...(blockchain.s2dent ?? {}),
            },
            '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
            '../../src/cache/cache.client.js': cache,
        },
    );

    return { app, cache };
};

const ADMIN_NONCE_PREFIX = 'Sign this nonce to authenticate as admin: ';
const FILLER_SIGNATURE = '0x' + '11'.repeat(65);

const signAdminNonce = async (wallet, nonce) =>
    wallet.signMessage(`${ADMIN_NONCE_PREFIX}${nonce}`);


describe('POST /api/auth/admin/verify', function () {
    this.timeout(10000);

    let wallet;

    beforeEach(() => {
        wallet = ethers.Wallet.createRandom();
    });

    it('should successfully authenticate the admin and return tokens', async () => {
        const nonce = crypto.randomBytes(64).toString('hex');
        const signature = await signAdminNonce(wallet, nonce);
        const isOwnerService = sinon.stub().resolves(true);

        const { app, cache } = await makeApp({
            cache: makeCacheStubs({ getCache: sinon.stub().resolves(nonce) }),
            blockchain: { s2dent: { isOwnerService } },
        });

        const res = await request(app)
            .post('/api/auth/admin/verify')
            .send({ signature });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Admin authenticated successfully');
        assert.ok(res.body.data.access_token, 'response must contain access_token');
        assert.ok(res.body.data.refresh_token, 'response must contain refresh_token');

        const accessPayload = verifyAccessToken(res.body.data.access_token);
        const refreshPayload = verifyRefreshToken(res.body.data.refresh_token);

        assert.equal(accessPayload.role, 'admin');
        assert.equal(refreshPayload.role, 'admin');

        assert.equal(cache.getCache.calledOnce, true, 'getCache must be called exactly once');
        assert.equal(cache.getCache.firstCall.args[0], 'admin_nonce');
        assert.equal(cache.delCache.calledOnce, true, 'delCache must be called exactly once');
        assert.equal(cache.delCache.firstCall.args[0], 'admin_nonce');
        assert.equal(isOwnerService.calledOnce, true, 'isOwnerService must be called exactly once');
    });

    it('should return 400 Bad Request if the signature fails schema validation', async () => {
        const { app } = await makeApp();

        const cases = [
            { body: {}, field: 'signature' },
            { body: { signature: 12345 }, field: 'signature' },
            { body: { signature: '0x' + '11'.repeat(64) }, field: 'signature' },
        ];

        for (const { body, field } of cases) {
            const res = await request(app)
                .post('/api/auth/admin/verify')
                .send(body);

            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
            assert.equal(res.body.code, 'VALIDATION_ERROR');
            assert.ok(Array.isArray(res.body.errors));
            assert.ok(
                res.body.errors.some((error) => error.field === field),
                `errors must contain a ${field} entry`,
            );
        }
    });

    it('should return 400 Bad Request if the admin nonce is missing or expired', async () => {
        const signature = FILLER_SIGNATURE;
        const { app } = await makeApp({
            cache: makeCacheStubs({ getCache: sinon.stub().resolves(null) }),
        });

        const res = await request(app)
            .post('/api/auth/admin/verify')
            .send({ signature });

        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, 'INVALID_NONCE');
        assert.equal(res.body.message, 'Nonce is missing or has expired');
    });

    it('should return 401 Unauthorized if the signature is invalid', async () => {
        const nonce = crypto.randomBytes(64).toString('hex');
        const signature = FILLER_SIGNATURE;
        const isOwnerService = sinon.stub().resolves(false);

        const { app, cache } = await makeApp({
            cache: makeCacheStubs({ getCache: sinon.stub().resolves(nonce) }),
            blockchain: { s2dent: { isOwnerService } },
        });

        const res = await request(app)
            .post('/api/auth/admin/verify')
            .send({ signature });

        assert.equal(res.status, 401);
        assert.equal(res.body.success, false);
        assert.equal(res.body.code, 'INVALID_SIGNATURE');
        assert.equal(res.body.message, 'Invalid signature');
        assert.equal(cache.delCache.called, false, 'nonce must not be deleted on invalid signature');
        assert.equal(isOwnerService.calledOnce, true, 'isOwnerService must be called exactly once');
    });
});