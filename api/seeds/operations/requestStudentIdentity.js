// requestStudentIdentity.js — Handles the OTP and signature verification request for a Student Identity.
import { askText, askSecret, askOtp, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError, printInfo } from '../display.js';
import { ethers } from 'ethers';

export const label = 'Request Student Identity';

export async function run() {
  while (true) {
    try {
      const email = await askText('Enter student email');
      const privateKey = await askSecret('Enter student private key');

      printInfo('Sending OTP code...');
      const otpSendRes = await apiClient.post('/auth/otp/send', { email });
      const messageToSign = otpSendRes.data.message;

      // Ask for OTP (collect code)
      const otp = await askOtp(email);

      printInfo('Signing authentication nonce...');
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(messageToSign);

      printInfo('Submitting student identity issuance request...');
      const requestRes = await apiClient.post('/identity/students/request-issuance', {
        email,
        otp,
        signature
      });

      printResult('Student identity request submitted successfully', requestRes.data);
      break;
    } catch (err) {
      printError('Failed to request student identity', err);
      const retry = await askConfirm('Retry?');
      if (!retry) break;
    }
  }
}
