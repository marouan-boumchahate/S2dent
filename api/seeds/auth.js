import { ethers } from 'ethers';
import { get, post } from './http.js';

export const authenticate = async ({ address, privateKey }) => {
  const { data } = await get(`/auth/nonce?address=${address}`);
  const message = data.message ?? data.nonce ?? data;

  const signature = await new ethers.Wallet(privateKey).signMessage(message);

  const verified = await post('/auth/verify', { address, signature });
  return {
    accessToken: verified.data.accessToken,
    refreshToken: verified.data.refreshToken,
  };
};
