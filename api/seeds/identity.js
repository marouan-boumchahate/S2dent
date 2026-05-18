import { ethers } from 'ethers';
import { post } from './http.js';

const PATHS = {
  academy: 'academies',
  student: 'students',
  professor: 'professors',
};

// NOTE: Requires the test path in src/modules/auth/auth.service.js to be active
// (otp = "000000", message = "Sign this nonce to verify your identity: Testing Nonce").
const TEST_OTP = '000000';

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
