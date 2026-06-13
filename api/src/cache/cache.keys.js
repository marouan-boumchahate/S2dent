import { hash } from '../utils/crypto.js';

const refreshTokenKey = (token) => `auth:refresh:${hash(token)}`;
const otpKey = (email, otp) => `auth:otp:${hash(`${email}:${otp}`)}`;
const adminNonceKey = (ip, device) => `auth:admin_nonce:${hash(`${ip || ''}:${device || ''}`)}`;

export { refreshTokenKey, otpKey, adminNonceKey };