// createStudent.js — Performs full end-to-end Student registration, OTP verification, EIP-712 signing, and identity issuance.
import { askJson, askSecret, askOtp, askText, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError, printInfo } from '../display.js';
import { getUserToken } from '../adminAuth.js';
import { ethers } from 'ethers';

const USER_SCHEMA = {
  first_name: 'Alice',
  middle_name: '',
  last_name: 'Smith',
  date_of_birth: '2001-09-10',
  gender: 'female', // male, female
  nationality: 'French',
  national_id: 'CD987654',
  email: 'alice.smith@example.com',
  phone: '+14167894567',
  photo_url: 'https://example.com/alice.jpg'
};

const ADDRESS_SCHEMA = {
  address_line1: '456 Student Oak Ave',
  address_line2: '',
  street: 'Oak Ave',
  district: 'North',
  state: 'State',
  postal_code: '54321',
  city: 'City',
  country: 'Country',
  latitude: 48.8566,
  longitude: 2.3522
};

const STUDENT_SCHEMA = {
  enrollment_status: 'active',
  enrollment_date: '2023-09-01',
  actual_graduation_date: null
};

export const label = 'Student Registration & Identity Issuance (Full E2E Workflow)';

export async function run() {
  while (true) {
    try {
      // 1. Collect inputs
      const academyToken = await askSecret('Enter Academy access token');
      const academyPrivateKey = await askSecret('Enter Academy private key (for EIP-712 signature)');
      const studentPrivateKey = await askSecret('Enter Student private key (wallet address will be derived)');
      const departmentId = await askText('Enter Department ID (UUID)');
      const advisorId = await askText('Enter Advisor ID (Professor UUID)');

      const wallet = new ethers.Wallet(studentPrivateKey);
      const studentAddress = wallet.address.toLowerCase();
      printInfo(`Derived Student wallet address: ${studentAddress}`);

      const userProfile = await askJson('Enter Student User Profile', USER_SCHEMA);
      const addressProfile = await askJson('Enter Student Address details', ADDRESS_SCHEMA);
      const studentDetails = await askJson('Enter Student details', STUDENT_SCHEMA);

      // 2. Create Student (User + Address + Student details)
      printInfo('Step 1/6: Registering Student profile on backend (authorized as Academy)...');
      const createPayload = {
        user: userProfile,
        address: addressProfile,
        department_id: departmentId,
        advisor_id: advisorId,
        ...studentDetails
      };
      
      // Clean up optional fields
      if (!createPayload.actual_graduation_date) delete createPayload.actual_graduation_date;
      if (!createPayload.enrollment_status) delete createPayload.enrollment_status;
      if (!createPayload.enrollment_date) delete createPayload.enrollment_date;

      const studentRes = await apiClient.post('/students', createPayload, academyToken);
      const studentId = studentRes.data.student.id;
      printInfo(`Student profile registered. ID: ${studentId}`);

      // 3. Send OTP
      printInfo(`Step 2/6: Sending verification OTP to ${userProfile.email}...`);
      const otpSendRes = await apiClient.post('/auth/otp/send', { email: userProfile.email });
      const messageToSign = otpSendRes.data.message;

      // Collect verification code (OTP)
      const otp = await askOtp(userProfile.email);

      // Sign nonce with Student private key
      printInfo('Signing authentication nonce with Student private key...');
      const signature = await wallet.signMessage(messageToSign);

      // 4. Request identity issuance
      printInfo('Step 3/6: Submitting identity verification request...');
      await apiClient.post('/identity/students/request-issuance', {
        email: userProfile.email,
        otp,
        signature
      });
      printInfo('Identity request submitted successfully.');

      // 5. Get pending EIP-712 schema
      printInfo('Step 4/6: Fetching pending EIP-712 schema from Academy controller...');
      const schemaRes = await apiClient.get(`/identity/students/pending/${studentAddress}/schema`, academyToken);
      const { domain, types, message } = schemaRes.data;

      // 6. Sign schema as Academy
      printInfo('Signing pending identity schema with Academy private key...');
      const academyWallet = new ethers.Wallet(academyPrivateKey);
      const academySignature = await academyWallet.signTypedData(domain, types, message);

      // 7. Finalize identity issuance
      printInfo('Step 5/6: Submitting finalized signature to issue Student identity...');
      const issueRes = await apiClient.post('/identity/students/issue', {
        student_address: studentAddress,
        signature: academySignature
      }, academyToken);
      printInfo('Student identity successfully issued on-chain.');

      // 8. Authenticate as newly created Student to get tokens
      printInfo('Step 6/6: Waiting for identity transaction to be mined...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      printInfo('Authenticating as Student to retrieve tokens...');
      const studentTokens = await getUserToken(studentAddress, studentPrivateKey);

      // Display results
      printResult('Student workflow completed successfully!', {
        studentId,
        walletAddress: studentAddress,
        identity: issueRes.data,
        tokens: studentTokens
      });

      break;
    } catch (err) {
      printError('Student registration workflow failed', err);
      const retry = await askConfirm('Retry the entire workflow?');
      if (!retry) break;
    }
  }
}
