import { ethers } from 'ethers';
import { get, post } from './http.js';

const PATHS = {
  academy: 'academies',
  student: 'students',
  professor: 'professors',
};

// NOTE: Requires the test path in src/modules/auth/auth.service.js to be active
// (otp = "000000", message = "Sign this nonce to verify your identity: Testing Nonce").
const TEST_OTP = '000000';

export const requestIdentity = async (role, { email, privateKey }) => {
  const { data } = await post('/auth/otp/send', { email });
  const message = data.message;

  const signature = await new ethers.Wallet(privateKey).signMessage(message);

  return post(`/identity/${PATHS[role]}/request-issuance`, {
    email,
    otp: TEST_OTP,
    signature,
  });
};

const ISSUE_ADDRESS_FIELD = {
  student: 'student_address',
  professor: 'professor_address',
};

export const finalizeIdentity = async (role, { walletAddress, academyToken, academyPrivateKey }) => {
  const { data } = await get(`/identity/${PATHS[role]}/pending/${walletAddress}/schema`, academyToken);
  const { domain, types, message } = data;

  const academyWallet = new ethers.Wallet(academyPrivateKey);
  const signature = await academyWallet.signTypedData(domain, types, message);

  return post(
    `/identity/${PATHS[role]}/issue`,
    {
      [ISSUE_ADDRESS_FIELD[role]]: walletAddress,
      signature,
    },
    academyToken,
  );
};

export const issueIdentity = async (role, { email, privateKey }) => {
  const { data } = await post('/auth/otp/send', { email });
  const message = data.message;

  const signature = await new ethers.Wallet(privateKey).signMessage(message);

  return post(`/identity/${PATHS[role]}/issue`, {
    email,
    otp: TEST_OTP,
    signature,
  });
};
