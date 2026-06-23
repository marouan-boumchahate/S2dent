// createAcademy.js — Performs full end-to-end Academy registration, address creation, OTP verification, and identity issuance.
import { askJson, askSecret, askOtp, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError, printInfo } from '../display.js';
import { getUserToken } from '../adminAuth.js';
import { ethers } from 'ethers';

const ACADEMY_SCHEMA = {
  name: 'Innovation Institute',
  short_name: 'II',
  type: 'college', // university, college, school, institute, online_platform, other
  description: 'A modern academy fostering innovation in tech.',
  website: 'https://www.ii.edu',
  logo_url: 'https://www.ii.edu/logo.png',
  email: 'academy@example.com',
  phone: '+14167894567',
  legal_name: 'Innovation Institute Trust',
  registration_number: 'REG-12345678',
  tax_id: 'TAX-12345678',
  billing_email: 'finance@example.com'
};

const ADDRESS_SCHEMA = {
  address_line1: '123 Main St',
  address_line2: 'Apt 4B',
  street: 'Main St',
  district: 'Central',
  state: 'State',
  postal_code: '12345',
  city: 'City',
  country: 'Country',
  latitude: 40.7128,
  longitude: -74.006
};

export const label = 'Academy Registration & Identity Issuance (Full E2E Workflow)';

export async function run(adminToken) {
  while (true) {
    try {
      // 1. Collect inputs
      const academyProfile = await askJson('Enter Academy Profile details', ACADEMY_SCHEMA);
      const addressProfile = await askJson('Enter Academy Address details', ADDRESS_SCHEMA);
      const academyPrivateKey = await askSecret('Enter Academy private key (wallet address will be derived)');

      const wallet = new ethers.Wallet(academyPrivateKey);
      const academyAddress = wallet.address.toLowerCase();
      printInfo(`Derived Academy wallet address: ${academyAddress}`);

      // 2. Create Academy profile
      printInfo('Step 1/5: Creating Academy profile (authorized as Admin)...');
      const academyRes = await apiClient.post('/academies', academyProfile, adminToken);
      const academyId = academyRes.data.academy.id;
      printInfo(`Academy profile created successfully. ID: ${academyId}`);

      // 3. Create Academy address
      printInfo('Step 2/5: Creating Academy address...');
      const addressPayload = { ...addressProfile, academy_id: academyId };
      await apiClient.post('/addresses', addressPayload, adminToken);
      printInfo('Address linked to Academy successfully.');

      // 4. Request identity: send OTP
      printInfo(`Step 3/5: Sending verification OTP to ${academyProfile.email}...`);
      const otpSendRes = await apiClient.post('/auth/otp/send', { email: academyProfile.email });
      const messageToSign = otpSendRes.data.message;

      // Collect verification code (OTP) from user
      const otp = await askOtp(academyProfile.email);

      // Sign the verification nonce message
      printInfo('Signing authentication nonce with Academy private key...');
      const signature = await wallet.signMessage(messageToSign);

      // 5. Finalize identity issuance
      printInfo('Step 4/5: Finalizing and issuing Academy identity...');
      const issueRes = await apiClient.post('/identity/academies/issue', {
        email: academyProfile.email,
        otp,
        signature
      }, adminToken);
      printInfo('Academy identity successfully issued on-chain.');

      // 6. Authenticate as newly created Academy to get tokens
      printInfo('Step 5/5: Waiting for identity transaction to be mined...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      printInfo('Authenticating as Academy to retrieve tokens...');
      const academyTokens = await getUserToken(academyAddress, academyPrivateKey);

      // Display results
      printResult('Academy workflow completed successfully!', {
        academyId,
        walletAddress: academyAddress,
        identity: issueRes.data,
        tokens: academyTokens
      });

      break;
    } catch (err) {
      printError('Academy registration workflow failed', err);
      const retry = await askConfirm('Retry the entire workflow?');
      if (!retry) break;
    }
  }
}
