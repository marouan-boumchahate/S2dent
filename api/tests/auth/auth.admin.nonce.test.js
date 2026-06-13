import esmock from 'esmock';
import request from 'supertest';
import sinon from 'sinon';
import crypto from 'crypto';
import { strict as assert } from 'assert';


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


describe('GET /api/auth/admin/nonce', function () {
    this.timeout(10000);

    it('should successfully generate an admin nonce', async () => {
        const { app, cache } = await makeApp();

        const res = await request(app).get('/api/auth/admin/nonce');

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'Nonce expires in 5 minutes');
        assert.match(
            res.body.data.message,
            /^Sign this nonce to authenticate as admin: [0-9a-f]{128}$/,
        );

        assert.equal(cache.setCache.calledOnce, true, 'setCache must be called exactly once');
        assert.match(cache.setCache.firstCall.args[0], /^auth:admin_nonce:0x[0-9a-f]{64}$/);
        assert.match(cache.setCache.firstCall.args[1], /^[0-9a-f]{128}$/);
        assert.equal(cache.setCache.firstCall.args[2], 5 * 60);
    });
});