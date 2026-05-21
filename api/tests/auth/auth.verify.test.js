import esmock from 'esmock';
import request from 'supertest';
import sinon from 'sinon';
import crypto from 'crypto';
import { strict as assert } from 'assert';
import { ethers, keccak256 } from 'ethers';
import db from '../../src/config/db.js';
import { verifyAccessToken, verifyRefreshToken } from '../../src/utils/jwt.js';
import { ACADEMY_REFRESH_TOKEN_TTL, STUDENT_REFRESH_TOKEN_TTL } from '../../src/cache/cache.ttl.js';


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
    const mocks = {
        '../../src/blockchain/identity/student.identity.blockchain.js':
            { ...DEFAULT_BLOCKCHAIN.student,   ...(overrides.student ?? {}) },
        '../../src/blockchain/identity/professor.identity.blockchain.js':
            { ...DEFAULT_BLOCKCHAIN.professor, ...(overrides.professor ?? {}) },
        '../../src/blockchain/identity/academy.identity.blockchain.js':
            { ...DEFAULT_BLOCKCHAIN.academy,   ...(overrides.academy ?? {}) },
        '../../src/blockchain/listener.js': { listenOnTransaction: () => {} },
    };
    if (overrides.cache) mocks['../../src/cache/cache.client.js'] = overrides.cache;
    const { default: app } = await esmock.strict(
        '../../src/app.js',
        import.meta.url,
        {},
        mocks,
    );
    return app;
};

const uniqueSuffix = () => crypto.randomBytes(6).toString('hex');

const seedAcademy = async ({ walletAddress } = {}) => {
    const suffix = uniqueSuffix();
    const shortName = `AC${suffix.slice(0, 4).toUpperCase()}`;

    const { rows: [academy] } = await db.query(
        `INSERT INTO academies (
            email,
            academy_number,
            name,
            short_name,
            type,
            legal_name,
            registration_number,
            tax_id
        )
         VALUES ($1, $2, $3, $4, 'university', $5, $6, $7)
         RETURNING id`,
        [
            `academy-${suffix}@example.test`,
            `AC-${suffix}`,
            `Seed Academy ${suffix}`,
            shortName,
            `Seed Academy ${suffix} Legal`,
            `REG-${suffix}`,
            `TAX-${suffix}`,
        ],
    );

    return academy.id;
};

const seedDepartment = async (academyId) => {
    const suffix = uniqueSuffix();
    const { rows: [department] } = await db.query(
        `INSERT INTO departments (academy_id, code, name, faculty, total_years)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [academyId, `CS${suffix.slice(0, 3).toUpperCase()}`, `Dept ${suffix}`, 'Engineering', 4],
    );

    return department.id;
};

const seedUser = async () => {
    const suffix = uniqueSuffix();
    const { rows: [user] } = await db.query(
        `INSERT INTO users (
            first_name,
            middle_name,
            last_name,
            full_name,
            date_of_birth,
            gender,
            national_id,
            nationality,
            email,
            phone,
            photo_url
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
            'Test',
            null,
            `User${suffix}`,
            `Test User ${suffix}`,
            '1990-01-01',
            'male',
            `NID-${suffix}`,
            'Testland',
            `user-${suffix}@example.test`,
            `+100000${suffix.slice(0, 5)}`,
            null,
        ],
    );

    return user.id;
};

const seedStudent = async (userId, academyId, departmentId) => {
    const suffix = uniqueSuffix();
    const { rows: [student] } = await db.query(
        `INSERT INTO students (
            user_id,
            academy_id,
            department_id,
            student_number,
            enrollment_status,
            enrollment_date,
            expected_graduation_date
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
            userId,
            academyId,
            departmentId,
            `STU-${suffix}`,
            'active',
            '2022-09-01',
            '2026-06-30',
        ],
    );

    return student.id;
};

const seedProfessor = async (userId, academyId, departmentId) => {
    const suffix = uniqueSuffix();
    const { rows: [professor] } = await db.query(
        `INSERT INTO professors (
            user_id,
            academy_id,
            department_id,
            employee_number,
            title,
            rank,
            hire_date,
            employment_type
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
            userId,
            academyId,
            departmentId,
            `EMP-${suffix}`,
            'Dr.',
            'Assoc. Prof',
            '2022-09-01',
            'full_time',
        ],
    );

    return professor.id;
};

const HEX_NONCE_64_BYTES = 'a'.repeat(128); // 64 bytes hex

const seedIdentity = async (
    walletAddress,
    role = 'professor',
    {
        nonce = HEX_NONCE_64_BYTES,
        nonce_expires_at = new Date(Date.now() + 5 * 60 * 1000),
        issued_at = new Date(),
        revoked_at = null,
        user_id = null,
        academy_id = null,
    } = {},
) => {
    await db.query(`DELETE FROM identities WHERE wallet_address = $1`, [walletAddress]);

    let resolvedUserId = user_id;
    let resolvedAcademyId = academy_id;
    let createdUserId = null;
    let createdAcademyId = null;

    if (role === 'academy') {
        if (!resolvedAcademyId) {
            createdAcademyId = await seedAcademy();
            resolvedAcademyId = createdAcademyId;
        }
        resolvedUserId = null;
    } else {
        if (!resolvedUserId) {
            createdUserId = await seedUser();
            resolvedUserId = createdUserId;
        }
        resolvedAcademyId = null;
    }

    const publicKey = '0x04' + crypto.randomBytes(64).toString('hex');
    await db.query(
        `INSERT INTO identities (wallet_address, public_key, role, user_id, academy_id, nonce, nonce_expires_at, issued_at, revoked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [walletAddress, publicKey, role, resolvedUserId, resolvedAcademyId, nonce, nonce_expires_at, issued_at, revoked_at],
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
            .send({ wallet_address: address, signature });

        assert.equal(res.status, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'User authenticated successfully');

        assert.ok(res.body.data.access_token,  'response must contain accessToken');
        assert.ok(res.body.data.refresh_token, 'response must contain refreshToken');

        // Tokens are encrypted JWTs - verify they decrypt and carry the right payload
        const accessPayload  = verifyAccessToken(res.body.data.access_token);
        const refreshPayload = verifyRefreshToken(res.body.data.refresh_token);

        assert.equal(accessPayload.sub,  address);
        assert.equal(accessPayload.role,     'professor');
        assert.equal(refreshPayload.sub, address);
        assert.equal(refreshPayload.role,    'professor');
    });

    it('returns 201 for a student with valid signature', async () => {
        const nonce = await seedIdentity(address, 'student');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address, signature });

        assert.equal(res.status, 201);
        const accessPayload = verifyAccessToken(res.body.data.access_token);
        assert.equal(accessPayload.role, 'student');
    });

    it('returns 201 for an academy with valid signature', async () => {
        const nonce = await seedIdentity(address, 'academy');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address, signature });

        assert.equal(res.status, 201);
        const accessPayload = verifyAccessToken(res.body.data.access_token);
        assert.equal(accessPayload.role, 'academy');
    });

    it('adds uid and rid claims for a student identity with a user_id', async () => {
        let academyId;
        let departmentId;
        let userId;
        let studentId;

        try {
            academyId = await seedAcademy();
            departmentId = await seedDepartment(academyId);
            userId = await seedUser();
            studentId = await seedStudent(userId, academyId, departmentId);

            const nonce = await seedIdentity(address, 'student', { user_id: userId });
            const signature = await signNonce(wallet, nonce);
            const app = await makeApp();

            const res = await request(app)
                .post('/api/auth/verify')
                .send({ wallet_address: address, signature });

            assert.equal(res.status, 201);

            const accessPayload = verifyAccessToken(res.body.data.access_token);
            const refreshPayload = verifyRefreshToken(res.body.data.refresh_token);

            assert.equal(accessPayload.uid, userId);
            assert.equal(accessPayload.rid, studentId);
            assert.equal(refreshPayload.uid, userId);
            assert.equal(refreshPayload.rid, studentId);
        } finally {
            await cleanupIdentity(address);
            await cleanupIdentity(address.toLowerCase());
            if (studentId) await db.query(`DELETE FROM students WHERE id = $1`, [studentId]);
            if (userId) await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
            if (departmentId) await db.query(`DELETE FROM departments WHERE id = $1`, [departmentId]);
            if (academyId) await db.query(`DELETE FROM academies WHERE id = $1`, [academyId]);
        }
    });

    it('adds uid and rid claims for a professor identity with a user_id', async () => {
        let academyId;
        let departmentId;
        let userId;
        let professorId;

        try {
            academyId = await seedAcademy();
            departmentId = await seedDepartment(academyId);
            userId = await seedUser();
            professorId = await seedProfessor(userId, academyId, departmentId);

            const nonce = await seedIdentity(address, 'professor', { user_id: userId });
            const signature = await signNonce(wallet, nonce);
            const app = await makeApp();

            const res = await request(app)
                .post('/api/auth/verify')
                .send({ wallet_address: address, signature });

            assert.equal(res.status, 201);

            const accessPayload = verifyAccessToken(res.body.data.access_token);
            const refreshPayload = verifyRefreshToken(res.body.data.refresh_token);

            assert.equal(accessPayload.uid, userId);
            assert.equal(accessPayload.rid, professorId);
            assert.equal(refreshPayload.uid, userId);
            assert.equal(refreshPayload.rid, professorId);
        } finally {
            await cleanupIdentity(address);
            await cleanupIdentity(address.toLowerCase());
            if (professorId) await db.query(`DELETE FROM professors WHERE id = $1`, [professorId]);
            if (userId) await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
            if (departmentId) await db.query(`DELETE FROM departments WHERE id = $1`, [departmentId]);
            if (academyId) await db.query(`DELETE FROM academies WHERE id = $1`, [academyId]);
        }
    });

    it('sets uid and rid to academy_id when role is academy', async () => {
        let academyId;

        try {
            academyId = await seedAcademy();

            const nonce = await seedIdentity(address, 'academy', { academy_id: academyId });
            const signature = await signNonce(wallet, nonce);

            const app = await makeApp();

            const res = await request(app)
                .post('/api/auth/verify')
                .send({ wallet_address: address, signature });

            assert.equal(res.status, 201);

            const accessPayload = verifyAccessToken(res.body.data.access_token);
            const refreshPayload = verifyRefreshToken(res.body.data.refresh_token);

            assert.equal(accessPayload.uid, academyId);
            assert.equal(accessPayload.rid, academyId);
            assert.equal(refreshPayload.uid, academyId);
            assert.equal(refreshPayload.rid, academyId);
        } finally {
            await cleanupIdentity(address);
            await cleanupIdentity(address.toLowerCase());
            if (academyId) await db.query(`DELETE FROM academies WHERE id = $1`, [academyId]);
        }
    });

    it('clears the nonce columns after successful verification', async () => {
        const nonce = await seedIdentity(address, 'professor');
        const signature = await signNonce(wallet, nonce);

        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address, signature });

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
            .send({ wallet_address: address.toLowerCase(), signature });

        assert.equal(res.status, 201);
        const accessPayload = verifyAccessToken(res.body.data.access_token);
        assert.equal(accessPayload.sub, address, 'accessToken must carry the checksummed address in sub');
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

        const found = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(found, 'errors must contain an address entry');
    });

    it('returns 422 VALIDATION_ERROR when signature is missing', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const found = res.body.errors.find(e => e.field === 'signature');
        assert.ok(found, 'errors must contain a signature entry');
    });

    it('returns 422 VALIDATION_ERROR when address has an invalid format', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: 'not-an-address', signature: FILLER_SIGNATURE });

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'VALIDATION_ERROR');

        const found = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(found, 'errors must contain an address entry');
    });

    it('returns 422 VALIDATION_ERROR when address is too short (39 hex chars)', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: '0x' + 'a'.repeat(39), signature: FILLER_SIGNATURE });

        assert.equal(res.status, 422);
        const found = res.body.errors.find(e => e.field === 'wallet_address');
        assert.ok(found);
    });

    it('returns 422 VALIDATION_ERROR when signature is shorter than 132 chars', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address, signature: '0x' + '11'.repeat(64) }); // 130 chars

        assert.equal(res.status, 422);
        const found = res.body.errors.find(e => e.field === 'signature');
        assert.ok(found, 'errors must contain a signature entry');
    });

    it('returns 422 VALIDATION_ERROR when signature is longer than 132 chars', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address, signature: '0x' + '11'.repeat(66) }); // 134 chars

        assert.equal(res.status, 422);
        const found = res.body.errors.find(e => e.field === 'signature');
        assert.ok(found);
    });

    // ── Identity lookup ────────────────────────────────────────────────────────
    it('returns 404 IDENTITY_NOT_FOUND when no identity row exists', async () => {
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address, signature: FILLER_SIGNATURE });

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
            .send({ wallet_address: address, signature: FILLER_SIGNATURE });

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
            .send({ wallet_address: address, signature: FILLER_SIGNATURE });

        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'IDENTITY_REVOKED');
        assert.equal(res.body.message, 'Identity has been revoked');
    });

    it('returns 400 INVALID_ROLE when the DB role is not handled (system_admin)', async () => {
        await seedIdentity(address, 'system_admin');
        const app = await makeApp();

        const res = await request(app)
            .post('/api/auth/verify')
            .send({ wallet_address: address, signature: FILLER_SIGNATURE });

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
            .send({ wallet_address: address, signature: FILLER_SIGNATURE });

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
            .send({ wallet_address: address, signature: FILLER_SIGNATURE });

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
            .send({ wallet_address: address, signature: FILLER_SIGNATURE });

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
            .send({ wallet_address: address, signature: wrongSignature });

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
            .send({ wallet_address: address, signature: wrongSignature });

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
            .send({ wallet_address: address, signature: wrongSignature });

        assert.equal(res.status, 401);

        const { rows: [row] } = await db.query(
            `SELECT nonce FROM identities WHERE wallet_address = $1`,
            [address],
        );
        assert.equal(row.nonce, nonce, 'nonce must remain when signature check fails');
    });

    // ── Cache integration (sinon-stubbed cache layer) ──────────────────────────
    describe('cache integration', () => {
        const TEST_IP = '127.0.0.1';
        const TEST_UA = 'verify-cache-test/1.0';

        const hash = (text) => keccak256(Buffer.from(text, 'utf8'));
        const cacheKeyFor = (token) => `refresh:${hash(token)}`;

        const makeCacheStubs = () => ({
            getCache: sinon.stub().resolves(null),
            setCache: sinon.stub().resolves(),
            delCache: sinon.stub().resolves(),
        });

        const verifyReq = (app, addr, sig) =>
            request(app)
                .post('/api/auth/verify')
                .set('User-Agent', TEST_UA)
                .set('X-Forwarded-For', TEST_IP)
                .send({ wallet_address: addr, signature: sig });

        it('saves the refresh token in cache under key `refresh:{hash(token)}`', async () => {
            const nonce = await seedIdentity(address, 'professor');
            const signature = await signNonce(wallet, nonce);
            const cache = makeCacheStubs();
            const app = await makeApp({ cache });

            const res = await verifyReq(app, address, signature);

            assert.equal(res.status, 201);
            assert.equal(cache.setCache.calledOnce, true, 'setCache must be called exactly once');
            assert.equal(cache.setCache.firstCall.args[0], cacheKeyFor(res.body.data.refresh_token));
        });

        it('saves the payload { ip, device } where device is the request user-agent', async () => {
            const nonce = await seedIdentity(address, 'professor');
            const signature = await signNonce(wallet, nonce);
            const cache = makeCacheStubs();
            const app = await makeApp({ cache });

            const res = await verifyReq(app, address, signature);

            assert.equal(res.status, 201);
            assert.equal(cache.setCache.firstCall.args[1], JSON.stringify({ ip: TEST_IP, device: TEST_UA }));
        });

        it('uses STUDENT_REFRESH_TOKEN_TTL as TTL for the student role', async () => {
            const nonce = await seedIdentity(address, 'student');
            const signature = await signNonce(wallet, nonce);
            const cache = makeCacheStubs();
            const app = await makeApp({ cache });

            const res = await verifyReq(app, address, signature);

            assert.equal(res.status, 201);
            assert.equal(cache.setCache.firstCall.args[2], STUDENT_REFRESH_TOKEN_TTL);
        });

        it('uses ACADEMY_REFRESH_TOKEN_TTL as TTL for the professor role', async () => {
            const nonce = await seedIdentity(address, 'professor');
            const signature = await signNonce(wallet, nonce);
            const cache = makeCacheStubs();
            const app = await makeApp({ cache });

            const res = await verifyReq(app, address, signature);

            assert.equal(res.status, 201);
            assert.equal(cache.setCache.firstCall.args[2], ACADEMY_REFRESH_TOKEN_TTL);
        });

        it('uses ACADEMY_REFRESH_TOKEN_TTL as TTL for the academy role', async () => {
            const nonce = await seedIdentity(address, 'academy');
            const signature = await signNonce(wallet, nonce);
            const cache = makeCacheStubs();
            const app = await makeApp({ cache });

            const res = await verifyReq(app, address, signature);

            assert.equal(res.status, 201);
            assert.equal(cache.setCache.firstCall.args[2], ACADEMY_REFRESH_TOKEN_TTL);
        });

        it('does not call setCache when verification fails (invalid signature)', async () => {
            const nonce = await seedIdentity(address, 'professor');
            const otherWallet = ethers.Wallet.createRandom();
            const wrongSignature = await signNonce(otherWallet, nonce);
            const cache = makeCacheStubs();
            const app = await makeApp({ cache });

            const res = await verifyReq(app, address, wrongSignature);

            assert.equal(res.status, 401);
            assert.equal(cache.setCache.called, false, 'setCache must not be called when verify fails');
        });
    });
});
