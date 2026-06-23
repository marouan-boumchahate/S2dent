// adminAuth.js — Takes private key, returns signed token (no terminal I/O)
import { ethers } from 'ethers';
import { apiClient } from './apiClient.js';

/**
 * Authenticates as admin and returns the signed access token from the backend.
 * @param {string} privateKey
 * @returns {Promise<string>} Admin access token
 */
export async function getAdminToken(privateKey) {
  // Fetch admin nonce from backend
  const nonceRes = await apiClient.get('/auth/admin/nonce');
  const nonce = nonceRes.data.message;

  // Sign nonce with the private key
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(nonce);

  // Verify signature to get JWT token
  const verifyRes = await apiClient.post('/auth/admin/verify', { signature });
  return verifyRes.data.access_token;
}

/**
 * Authenticates a regular user (academy, professor, student) and returns access/refresh tokens.
 * @param {string} address Wallet address
 * @param {string} privateKey Wallet private key
 * @returns {Promise<{accessToken: string, refreshToken: string}>} Auth tokens
 */
export async function getUserToken(address, privateKey) {
  // Fetch user nonce from backend
  const nonceRes = await apiClient.get(`/auth/nonce?wallet_address=${address}`);
  const nonce = nonceRes.data.message;

  // Sign nonce with the private key
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(nonce);

  // Verify signature to get JWT tokens
  const verifyRes = await apiClient.post('/auth/verify', { wallet_address: address, signature });
  return {
    accessToken: verifyRes.data.access_token,
    refreshToken: verifyRes.data.refresh_token,
  };
}
