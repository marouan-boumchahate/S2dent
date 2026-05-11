import crypto from 'crypto';
import { ethers, recoverAddress } from 'ethers';
import db from '../../config/db.js';
import { setCache, getCache, delCache } from '../../cache/cache.client.js';
import { refreshToken } from '../../cache/cache.keys.js';
import { ACADEMY_REFRESH_TOKEN, STUDENT_REFRESH_TOKEN } from '../../cache/cache.ttl.js';
import { getNonce } from '../../utils/crypto.js';
import { getAcademyIdentity } from '../../blockchain/identity/academy.identity.blockchain.js';
import { getStudentIdentity } from '../../blockchain/identity/student.identity.blockchain.js';
import { getProfessorIdentity } from '../../blockchain/identity/professor.identity.blockchain.js';
import { recoverSigner, hash } from '../../utils/crypto.js';
import { signTokens, verifyRefreshToken } from '../../utils/jwt.js';
import { get } from 'http';


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
const fetchIdentityByAddress = async (address) => {
    const { rows: [identity] } = await db.query(
        `SELECT * FROM identities WHERE wallet_address = $1`,
        [address]
    );

    if(!identity){
        const err = new Error('No identity found for the given address');
        err.statusCode = 404;
        err.code = 'IDENTITY_NOT_FOUND';
        throw err;
    }

    return identity;
}
const ensureIdentityExistsInBlockchain = async (address, role) => {
    let result;

    switch (role) {
        case 'student':
            result = await getStudentIdentity(address);
            break;
        case 'professor':
            result = await getProfessorIdentity(address);
            break;
        case 'academy':
            result = await getAcademyIdentity(address);
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
const isNonceExpired = (nonce, nonce_expires_at) => {
    if (!nonce || new Date() > nonce_expires_at) {
        const err = new Error('Nonce is missing or has expired');
        err.statusCode = 400;
        err.code = 'INVALID_NONCE';
        throw err;
    }
}
const isSignatureValid = (address, nonce, signature) => {
    const message = `Sign this nonce to authenticate: ${nonce}`;
    const signer = recoverSigner(message, signature);

    if (signer.toLowerCase() !== address.toLowerCase()) {
        const err = new Error('Invalid signature');
        err.statusCode = 401;
        err.code = 'INVALID_SIGNATURE';
        throw err;
    }
}
const getJwt = (address, role, isRefresh = false) => {
    const payload = { address, role };
    const options = (role === 'student') ? { accessExpiresIn: '15m', refreshExpiresIn: '3h' } 
                                         : { accessExpiresIn: '1h',  refreshExpiresIn: '1d' };

    return signTokens(payload, options, isRefresh);
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
    const tokenHash = hash(token);

    const cacheKey = refreshToken(tokenHash);
    const ttl = role === 'student' ? STUDENT_REFRESH_TOKEN : ACADEMY_REFRESH_TOKEN;
    const payload = { ip, device };

    await setCache(cacheKey, payload, ttl);
}
const isRefreshTokenExistingInCache = async (token, ip, device) => {
    const tokenHash = hash(token);
    const cacheKey = refreshToken(tokenHash);
    const cachedData = await getCache(cacheKey);

    if (!cachedData) {
        const err = new Error('Refresh token not found or expired');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
    }

    if (cachedData.ip !== ip || cachedData.device !== device) {
        const err = new Error('Refresh token is being used from an unauthorized device or IP');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
    }
}
const revokeRefreshTokenFromCache = async (token) => {
    const tokenHash = hash(token);
    const cacheKey = refreshToken(tokenHash);

    await delCache(cacheKey);
}


// Services
const generateNonceService = async (address) => {
    const checksumAddr = ethers.getAddress(address);
    const { role } = await fetchIdentityByAddress(checksumAddr);

    await ensureIdentityExistsInBlockchain(checksumAddr, role);

    const nonce = getNonce(64);
    await storeNonce(checksumAddr, nonce);

    return { message: `Sign this nonce to authenticate: ${nonce}` };
}
const verifySignatureService = async (address, signature, { ip, device }) => {
    const checksumAddr = ethers.getAddress(address);
    const { role, nonce, nonce_expires_at } = await fetchIdentityByAddress(checksumAddr);

    await ensureIdentityExistsInBlockchain(checksumAddr, role);

    isNonceExpired(nonce, nonce_expires_at);
    isSignatureValid(checksumAddr, nonce, signature);

    await deleteNonce(checksumAddr);
    
    const tokens = getJwt(checksumAddr, role);
    await saveRefreshTokenInCache(tokens.refreshToken, ip, device, role);

    return tokens;
}
const refreshTokenService = async (refreshToken, { ip, device }) => {
    await isRefreshTokenExistingInCache(refreshToken, ip, device);

    const { address, role } = await isRefreshTokenValid(refreshToken);
    await ensureIdentityExistsInBlockchain(address, role);

    const { accessToken } = getJwt(address, role, true);

    return { accessToken, refreshToken };
}
const logoutService = async (refreshToken, { ip, device }) => {
    await isRefreshTokenExistingInCache(refreshToken, ip, device);
    await revokeRefreshTokenFromCache(refreshToken);
}


export { generateNonceService, verifySignatureService, refreshTokenService, logoutService };