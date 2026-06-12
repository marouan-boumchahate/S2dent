import { hash } from '../utils/crypto.js';

const refreshTokenKey = (token) => `refresh:${hash(token)}`;
const otpKey = (email, otp) => `otp:${hash(`${email}:${otp}`)}`;
const adminNonceKey = (ip, device) => `admin_nonce:${hash(`${ip || ''}:${device || ''}`)}`;

export { refreshTokenKey, otpKey, adminNonceKey };