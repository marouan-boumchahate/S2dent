import { ethers } from 'ethers';
import { get, post } from './http.js';

export const authenticateAdmin = async ({ privateKey }) => {
  const { data } = await get('/auth/admin/nonce');
  const message = data.message;

  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(message);

  const verified = await post('/auth/admin/verify', { signature });
  return {
    accessToken: verified.data.access_token,
    refreshToken: verified.data.refresh_token,
  };
};

export const authenticate = async ({ address, privateKey }) => {
  console.log('Press a key to continue seeding...');
  await new Promise((resolve) => process.stdin.once('data', resolve));

  const { data } = await get(`/auth/nonce?wallet_address=${address}`);
  const message = data.message;

  const signature = await new ethers.Wallet(privateKey).signMessage(message);

  const verified = await post('/auth/verify', { wallet_address: address, signature });
  return {
    accessToken: verified.data.access_token,
    refreshToken: verified.data.refresh_token,
  };
};
