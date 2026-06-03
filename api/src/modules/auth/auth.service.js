import crypto from 'crypto';
import { ethers, recoverAddress } from 'ethers';
import db from '../../config/db.js';
import { setCache, getCache, delCache } from '../../cache/cache.client.js';
import { refreshTokenKey, otpKey } from '../../cache/cache.keys.js';
import { ACADEMY_REFRESH_TOKEN_TTL, STUDENT_REFRESH_TOKEN_TTL, OTP_TTL } from '../../cache/cache.ttl.js';
import { getNonce } from '../../utils/crypto.js';
import { getAcademyIdentity } from '../../blockchain/identity/academy.identity.blockchain.js';
import { getStudentIdentity } from '../../blockchain/identity/student.identity.blockchain.js';
import { getProfessorIdentity } from '../../blockchain/identity/professor.identity.blockchain.js';
import { isOwnerService } from '../../blockchain/s2dent.blockchain.js';
import { recoverSigner, hash } from '../../utils/crypto.js';
import { signTokens, verifyRefreshToken } from '../../utils/jwt.js';
import { sendOtpEmail } from '../../utils/email.js';


// DTOs
const tokenResponseDto = (tokens) => ({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken
});


// Helpers
const storeNonce = async (address, nonce) => await db.query(
      `UPDATE identities
       SET nonce = $2, nonce_expires_at = $3
       WHERE wallet_address = $1`,
      [address, nonce, new Date(Date.now() + 5 * 60 * 1000)]
    );
const deleteNonce = async (address) => await db.query(
      `UPDATE identities
       SET nonce = NULL, nonce_expires_at = NULL
       WHERE wallet_address = $1`,
      [address]
    );
const isNonceExpired = (nonce, nonce_expires_at) => {
    if (!nonce || new Date() > nonce_expires_at) {
        const err = new Error('Nonce is missing or has expired');
        err.statusCode = 400;
        err.code = 'INVALID_NONCE';
        throw err;
    }
}

const fetchIdentityByAddress = async (wallet_address) => { // used for: role
    const { rows: [identity] } = await db.query(`
        SELECT * 
        FROM identities 
        WHERE wallet_address = $1`,
        [wallet_address]
    );

    if(!identity){
        const err = new Error('No identity found for the given address');
        err.statusCode = 404;
        err.code = 'IDENTITY_NOT_FOUND';
        throw err;
    }

    return identity;
}
const ensureIdentityExistsInBlockchain = async (wallet_address, role) => {
    let result;

    switch (role) {
        case 'student':
            result = await getStudentIdentity(wallet_address);
            break;
        case 'professor':
            result = await getProfessorIdentity(wallet_address);
            break;
        case 'academy':
            result = await getAcademyIdentity(wallet_address);
            break;
        default:
            const err = new Error('Invalid role');
            err.statusCode = 400;
            err.code = 'INVALID_ROLE';
            throw err;
    }

    if(!result){
        const err = new Error('No identity found for the given address');
        err.statusCode = 404;
        err.code = 'IDENTITY_NOT_FOUND';
        throw err;
    }

    if(result.status.isRevoked) {
        const err = new Error('Identity has been revoked');
        err.statusCode = 403;
        err.code = 'IDENTITY_REVOKED';
        throw err;
    }
};

const isSignatureValid = (address, nonce, signature) => {
    const message = `Sign this nonce to authenticate: ${nonce}`;
    const { signerAddress} = recoverSigner(message, signature);

    if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        const err = new Error('Invalid signature');
        err.statusCode = 401;
        err.code = 'INVALID_SIGNATURE';
        throw err;
    }
}
const isRefreshTokenValid = async (refreshToken) => {
    const user = await verifyRefreshToken(refreshToken);

    if(!user) {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
    }

    return user;
}
const saveRefreshTokenInCache = async (token, ip, device, role) => {
    const cacheKey = refreshTokenKey(token);
    const ttl = role === 'student' ? STUDENT_REFRESH_TOKEN_TTL : ACADEMY_REFRESH_TOKEN_TTL;
    const payload = { ip, device };

    await setCache(cacheKey, JSON.stringify(payload), ttl);
}

const isRefreshTokenExistingInCache = async (token, ip, device) => {
    const cacheKey = refreshTokenKey(token);
    const cachedData = await getCache(cacheKey);

    if (!cachedData) {
        const err = new Error('Refresh token not found or expired');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
    }

    const payload = JSON.parse(cachedData);
    if (payload.ip !== ip || payload.device !== device) {
        const err = new Error('Refresh token is being used from an unauthorized device or IP');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
    }
}
const revokeRefreshTokenFromCache = async (token) => {
    const cacheKey = refreshTokenKey(token);
    await delCache(cacheKey);
}
const fetchStudentIdByUserId = async (userId) => {
    const { rows: [student] } = await db.query(
        `SELECT id FROM students WHERE user_id = $1`,
        [userId]
    );

    return student?.id || null;
}
const fetchProfessorIdByUserId = async (userId) => {
    const { rows: [professor] } = await db.query(
        `SELECT id FROM professors WHERE user_id = $1`,
        [userId]
    );

    return professor?.id || null;
}
const createJwtOptions = (role) => {
    return role === 'student' 
        ? { accessExpiresIn: '15m', refreshExpiresIn: '3h' } 
        : { accessExpiresIn: '1h',  refreshExpiresIn: '1d' };
}
const createJwtPayloadAndOptions = async (wallet_address, role, entity_id) => {
    let roleId = null;
    switch (role) {
        case 'academy':
            roleId = entity_id;
            break;
        case 'professor':
            roleId = await fetchProfessorIdByUserId(entity_id);
            break;
        case 'student':
            roleId = await fetchStudentIdByUserId(entity_id);
            break;
        default:
            const err = new Error('Invalid role');
            err.statusCode = 400;
            err.code = 'INVALID_ROLE';
            throw err;
    }

    const payload = { sub: wallet_address, uid: entity_id, role, rid: roleId };
    const options = createJwtOptions(role);

    return { payload, options };
}
const getJwt = (payload, options, isRefresh = false) => signTokens(payload, options, isRefresh);

const getUserByEmail = async (email) => {
    const { rows: [user] } = await db.query(
        `SELECT id FROM users WHERE email = $1`,
        [email]
    );

    if(!user) {
        const { rows: [academy] } = await db.query(
            `SELECT id FROM academies WHERE email = $1`,
            [email]
        );

        if(!academy) {
            const err = new Error('Email is not registered');
            err.statusCode = 404;
            err.code = 'EMAIL_NOT_FOUND';
            throw err;
        }

        return { id: academy.id, role: 'academy' };
    }

    const { rows: [student] } = await db.query(
        `SELECT id FROM students WHERE user_id = $1`,
        [user.id]
    );

    if(student) return { id: student.id, role: 'student' };

    const { rows: [professor] } = await db.query(
        `SELECT id FROM professors WHERE user_id = $1`,
        [user.id]
    );

    if(professor) return { id: professor.id, role: 'professor' };
}


// Services
const generateAdminNonceService = async () => {
    const nonce = getNonce(64);
    await setCache('admin_nonce', nonce, 5 * 60);

    return { message: `Sign this nonce to authenticate as admin: ${nonce}` };
}
const verifyAdminSignatureService = async (signature) => {
    const nonce = await getCache('admin_nonce');

    if (!nonce) {
        const err = new Error('Nonce is missing or has expired');
        err.statusCode = 400;
        err.code = 'INVALID_NONCE';
        throw err;
    }

    const message = `Sign this nonce to authenticate as admin: ${nonce}`;
    const isValid = await isOwnerService(message, signature);

    if (!isValid) {
        const err = new Error('Invalid signature');
        err.statusCode = 401;
        err.code = 'INVALID_SIGNATURE';
        throw err;
    }

    const tokens = getJwt(
        { role: 'admin' }, 
        { accessExpiresIn: '1h', refreshExpiresIn: '1d' }
    );
    await delCache('admin_nonce');
    
    return tokenResponseDto(tokens);
}
const generateNonceService = async (wallet_address) => {
    const checksumAddr = ethers.getAddress(wallet_address);
    const { role } = await fetchIdentityByAddress(checksumAddr);

    await ensureIdentityExistsInBlockchain(checksumAddr, role);

    const nonce = getNonce(64);
    await storeNonce(checksumAddr, nonce);

    return { message: `Sign this nonce to authenticate: ${nonce}` };
}
const verifySignatureService = async (wallet_address, signature, { ip, device }) => {
    const checksumAddr = ethers.getAddress(wallet_address);
    const { 
        academy_id, 
        user_id, 
        role, 
        nonce, 
        nonce_expires_at,
    } = await fetchIdentityByAddress(checksumAddr);

    await ensureIdentityExistsInBlockchain(checksumAddr, role);

    isNonceExpired(nonce, nonce_expires_at);
    isSignatureValid(checksumAddr, nonce, signature);

    await deleteNonce(checksumAddr);

    const entity_id = role === 'academy' ? academy_id : user_id;
    const { payload, options } = await createJwtPayloadAndOptions(checksumAddr, role, entity_id);

    const tokens = signTokens(payload, options);
    await saveRefreshTokenInCache(tokens.refreshToken, ip, device, role);

    return tokenResponseDto(tokens);
}
const refreshTokenService = async (refresh_token, { ip, device }) => {
    await isRefreshTokenExistingInCache(refresh_token, ip, device);

    const { sub, uid, role, rid } = await isRefreshTokenValid(refresh_token);

    await ensureIdentityExistsInBlockchain(sub, role);
    
    const payload = { sub, uid, role, rid };
    const options = createJwtOptions(role);
    const { accessToken } = signTokens(payload, options, true);

    const tokens = { accessToken, refreshToken: refresh_token };
    return tokenResponseDto(tokens);
}
const logoutService = async (refresh_token, { ip, device }) => {
    await isRefreshTokenExistingInCache(refresh_token, ip, device);
    await revokeRefreshTokenFromCache(refresh_token);
}
const sendOtpService = async (email) => {
    email = email.toLowerCase();

    const { id, role } = await getUserByEmail(email);

    // const otp = crypto.randomBytes(3).toString('hex').slice(0, 6);
    // const message = `Sign this nonce to verify your identity: ${getNonce()}`;

    const otp = "000000";
    const message = 'Sign this nonce to verify your identity: Testing Nonce';

    const cacheKey = otpKey(email, otp);
    const payload = { id, message, role };

    await setCache(cacheKey, JSON.stringify(payload), OTP_TTL);

    await sendOtpEmail(email, otp);

    return { message };
}


export { 
    generateAdminNonceService,
    generateNonceService, 
    verifyAdminSignatureService,
    verifySignatureService, 
    refreshTokenService, 
    logoutService, 
    sendOtpService
};