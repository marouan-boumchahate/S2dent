import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from './crypto.js';

const ALGORITHM = 'HS256';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ENCRYPTION_SECRET = Buffer.from(process.env.JWT_ENCRYPTION_SECRET, 'hex');

const signTokens = (payload, options, onlyAccess = false) => { // options: { accessExpiresIn, refreshExpiresIn }
    const accessToken = encrypt(
        jwt.sign(payload, ACCESS_SECRET, {
            expiresIn: options?.accessExpiresIn || '15m',
            algorithm: ALGORITHM,
        }), JWT_ENCRYPTION_SECRET
    );

    if(onlyAccess) return { accessToken }

    const refreshToken = encrypt(
        jwt.sign(payload, REFRESH_SECRET, {
            expiresIn: options?.refreshExpiresIn || '1d',
            algorithm: ALGORITHM,
        }), JWT_ENCRYPTION_SECRET
    );

    return { accessToken, refreshToken };
}

const verifyAccessToken = (token) => {
    const decryptedToken = decrypt(token, JWT_ENCRYPTION_SECRET);
    return jwt.verify(decryptedToken, ACCESS_SECRET);
};
const verifyRefreshToken = (token) => {
    const decryptedToken = decrypt(token, JWT_ENCRYPTION_SECRET);
    return jwt.verify(decryptedToken, REFRESH_SECRET);
};

export { signTokens, verifyAccessToken, verifyRefreshToken };
