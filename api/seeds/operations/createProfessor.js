// createProfessor.js — Performs full end-to-end Professor registration, OTP verification, EIP-712 signing, and identity issuance.
import { askJson, askSecret, askOtp, askText, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError, printInfo } from '../display.js';
import { getUserToken } from '../adminAuth.js';
import { ethers } from 'ethers';

const USER_SCHEMA = {
  first_name: 'Bob',
  middle_name: '',
  last_name: 'Johnson',
  date_of_birth: '1975-03-22',
  gender: 'male', // male, female
  nationality: 'Turkish',
  national_id: 'EF112233',
  email: 'bob.johnson@example.com',
  phone: '+905551234567',
  photo_url: 'https://example.com/bob.jpg'
};

const ADDRESS_SCHEMA = {
  address_line1: '789 Professor Rd',
  address_line2: 'Apt 10',
  street: 'Professor Rd',
  district: 'Sarıyer',
  state: 'Istanbul',
  postal_code: '34450',
  city: 'Istanbul',
  country: 'Türkiye',
  latitude: 41.1639,
  longitude: 29.0494
};

const PROFESSOR_SCHEMA = {
  title: 'Dr.',
  rank: 'Assist. Prof', // Assist. Prof, Assoc. Prof, Prof, Lecturer, Instructor
  specialization: 'Distributed Systems',
  hire_date: '2022-09-01',
  employment_type: 'full_time', // full_time, part_time, adjunct, visiting, contract
  office_location: 'Building B, Room 204',
  office_hours: 'Wed 10:00-12:00',
  bio: 'Experienced researcher in decentralized systems.'
};

export const label = 'Professor Registration & Identity Issuance (Full E2E Workflow)';

export async function run() {
  while (true) {
    try {
      // 1. Collect inputs
      const academyToken = await askSecret('Enter Academy access token');
      const academyPrivateKey = await askSecret('Enter Academy private key (for EIP-712 signature)');
      const profPrivateKey = await askSecret('Enter Professor private key (wallet address will be derived)');
      const departmentId = await askText('Enter Department ID (UUID)');

      const wallet = new ethers.Wallet(profPrivateKey);
      const profAddress = wallet.address.toLowerCase();
      printInfo(`Derived Professor wallet address: ${profAddress}`);

      const userProfile = await askJson('Enter Professor User Profile', USER_SCHEMA);
      const addressProfile = await askJson('Enter Professor Address details', ADDRESS_SCHEMA);
      const profDetails = await askJson('Enter Professor details', PROFESSOR_SCHEMA);

      // 2. Create Professor (User + Address + Professor details)
      printInfo('Step 1/6: Registering Professor profile on backend (authorized as Academy)...');
      const createPayload = {
        user: userProfile,
        address: addressProfile,
        department_id: departmentId,
        ...profDetails
      };
      
      // Clean up optional fields
      if (!createPayload.hire_date) delete createPayload.hire_date;
      if (!createPayload.employment_type) delete createPayload.employment_type;

      const profRes = await apiClient.post('/professors', createPayload, academyToken);
      const profId = profRes.data.professor.id;
      printInfo(`Professor profile registered. ID: ${profId}`);

      // 3. Send OTP
      printInfo(`Step 2/6: Sending verification OTP to ${userProfile.email}...`);
      const otpSendRes = await apiClient.post('/auth/otp/send', { email: userProfile.email });
      const messageToSign = otpSendRes.data.message;

      // Collect verification code (OTP)
      const otp = await askOtp(userProfile.email);

      // Sign nonce with Professor private key
      printInfo('Signing authentication nonce with Professor private key...');
      const signature = await wallet.signMessage(messageToSign);

      // 4. Request identity issuance
      printInfo('Step 3/6: Submitting identity verification request...');
      await apiClient.post('/identity/professors/request-issuance', {
        email: userProfile.email,
        otp,
        signature
      });
      printInfo('Identity request submitted successfully.');

      // 5. Get pending EIP-712 schema
      printInfo('Step 4/6: Fetching pending EIP-712 schema from Academy controller...');
      const schemaRes = await apiClient.get(`/identity/professors/pending/${profAddress}/schema`, academyToken);
      const { domain, types, message } = schemaRes.data;

      // 6. Sign schema as Academy
      printInfo('Signing pending identity schema with Academy private key...');
      const academyWallet = new ethers.Wallet(academyPrivateKey);
      const academySignature = await academyWallet.signTypedData(domain, types, message);

      // 7. Finalize identity issuance
      printInfo('Step 5/6: Submitting finalized signature to issue Professor identity...');
      const issueRes = await apiClient.post('/identity/professors/issue', {
        professor_address: profAddress,
        signature: academySignature
      }, academyToken);
      printInfo('Professor identity successfully issued on-chain.');

      // 8. Authenticate as newly created Professor to get tokens
      printInfo('Step 6/6: Waiting for identity transaction to be mined...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      printInfo('Authenticating as Professor to retrieve tokens...');
      const profTokens = await getUserToken(profAddress, profPrivateKey);

      // Display results
      printResult('Professor workflow completed successfully!', {
        profId,
        walletAddress: profAddress,
        identity: issueRes.data,
        tokens: profTokens
      });

      break;
    } catch (err) {
      printError('Professor registration workflow failed', err);
      const retry = await askConfirm('Retry the entire workflow?');
      if (!retry) break;
    }
  }
}
