import { hash } from '../utils/crypto.js';

const refreshTokenKey = (token) => `refresh:${hash(token)}`;
const otpKey = (email, otp) => `otp:${hash(`${email}:${otp}`)}`;

export { refreshTokenKey, otpKey };