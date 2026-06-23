// issueAcademyIdentity.js — Handles the OTP validation and signature submission to issue an Academy Identity.
import { askText, askSecret, askOtp, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError, printInfo } from '../display.js';
import { ethers } from 'ethers';

export const label = 'Issue Academy Identity (Admin issues to Academy)';

export async function run(adminToken) {
  while (true) {
    try {
      const email = await askText('Enter academy email');
      const academyPrivateKey = await askSecret('Enter academy private key');

      printInfo('Sending OTP code...');
      const otpSendRes = await apiClient.post('/auth/otp/send', { email });
      const messageToSign = otpSendRes.data.message;

      // Ask for OTP
      const otp = await askOtp(email);

      printInfo('Signing authentication nonce with academy private key...');
      const wallet = new ethers.Wallet(academyPrivateKey);
      const signature = await wallet.signMessage(messageToSign);

      printInfo('Submitting academy identity issuance request (authorized as admin)...');
      const response = await apiClient.post('/identity/academies/issue', {
        email,
        otp,
        signature
      }, adminToken);

      printResult('Academy identity issued successfully', response.data);
      break;
    } catch (err) {
      printError('Failed to issue academy identity', err);
      const retry = await askConfirm('Retry?');
      if (!retry) break;
    }
  }
}
