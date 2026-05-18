import { ethers } from 'ethers';
import { get, post } from './http.js';

export const authenticate = async ({ address, privateKey }) => {
  const { data } = await get(`/auth/nonce?wallet_address=${address}`);
  const message = data.message;

  const signature = await new ethers.Wallet(privateKey).signMessage(message);

  const verified = await post('/auth/verify', { wallet_address: address, signature });
  return {
    accessToken: verified.data.access_token,
    refreshToken: verified.data.refresh_token,
  };
};
