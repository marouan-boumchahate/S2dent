// index.js — Wires everything together, runs the full automated seeding pipeline from JSON files.
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { env } from './env.js';
import { getAdminToken, getUserToken } from './adminAuth.js';
import { apiClient } from './apiClient.js';
import { askText } from './prompt.js';
import { printInfo, printResult, printError } from './display.js';

// Helper to read and parse JSON seed files
const loadSeedData = (filename) => {
  const filePath = path.resolve(process.cwd(), 'seeds/data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  printInfo('=== Starting Automated Interactive Seed Pipeline ===');

  // 1. Authenticate as Admin
  let adminToken;
  try {
    const adminPrivateKey = env.blockchain.platformPrivateKey;
    printInfo('Authenticating admin via blockchain signature...');
    adminToken = await getAdminToken(adminPrivateKey);
    printInfo('Admin authenticated successfully.');
  } catch (err) {
    printError('Admin authentication failed. Cannot continue.', err);
    process.exit(1);
  }

  // 2. Load JSON data files
  let academiesData, professorsData, studentsData, credentialsData;
  try {
    academiesData = loadSeedData('academies.json');
    professorsData = loadSeedData('professors.json');
    studentsData = loadSeedData('students.json');
    credentialsData = loadSeedData('credentials.json');
    printInfo('Successfully loaded all JSON seed data files.');
  } catch (err) {
    printError('Failed to load JSON seed data files. Check file paths and JSON syntax.', err);
    process.exit(1);
  }

  // Maps to store created records and tokens in-memory for subsequent steps
  const academiesMap = {};    // email -> { token, privateKey, address, id }
  const departmentsMap = {};  // department_code -> department_uuid
  const professorsMap = {};   // email -> { id, token, privateKey, address }
  const studentsMap = {};     // email -> { id, walletAddress, token }

  // ==========================================
  // STEP A: CREATE & VERIFY ACADEMIES
  // ==========================================
  printInfo('\n--- Phase 1/4: Seeding Academies ---');
  for (const acad of academiesData) {
    try {
      const email = acad.profile.email;
      const privateKey = acad.privateKey;
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;

      printInfo(`Registering Academy: "${acad.profile.name}" (${email})`);

      // 1. Create Academy Profile
      const academyRes = await apiClient.post('/academies', acad.profile, adminToken);
      const academyId = academyRes.data.academy.id;
      printInfo(`Academy created. ID: ${academyId}`);

      // 2. Create Academy Address
      const addressPayload = { ...acad.address, academy_id: academyId };
      await apiClient.post('/addresses', addressPayload, adminToken);
      printInfo('Linked address to Academy.');

      printInfo(`Sending verification OTP to: ${email}`);
      const otpSendRes = await apiClient.post('/auth/otp/send', { email });
      const messageToSign = otpSendRes.data.message;

      // 4. Prompt user for OTP (waits for verification code)
      const otp = '000000';
      printInfo('Auto-filling OTP: 000000');

      // 5. Sign the verification message
      printInfo('Signing OTP nonce with Academy private key...');
      const signature = await wallet.signMessage(messageToSign);

      // 6. Submit signature to issue identity
      printInfo('Finalizing Academy identity on-chain...');
      const issueRes = await apiClient.post('/identity/academies/issue', {
        email,
        otp,
        signature
      }, adminToken);
      printInfo('Academy identity successfully issued.');

      // 7. Wait and login to get Academy tokens
      printInfo('Waiting 3s for transaction to be mined...');
      await wait(3000);
      printInfo('Retrieving Academy auth tokens...');
      const tokens = await getUserToken(address, privateKey);

      // 8. Create Departments for this Academy
      if (acad.departments && Array.isArray(acad.departments)) {
        for (const dept of acad.departments) {
          printInfo(`Creating Department: "${dept.name}" (${dept.code})`);
          const deptRes = await apiClient.post('/departments', dept, tokens.accessToken);
          departmentsMap[dept.code] = deptRes.data.department.id;
          printInfo(`Department created. ID: ${departmentsMap[dept.code]}`);
        }
      }

      // Save academy mappings
      academiesMap[email] = {
        token: tokens.accessToken,
        privateKey,
        address,
        id: academyId
      };

      printResult(`Academy "${acad.profile.name}" fully seeded and verified!`, {
        academyId,
        walletAddress: address,
        tokens
      });
    } catch (err) {
      printError(`Failed to seed Academy: ${acad.profile?.name || 'Unknown'}`, err);
      process.exit(1);
    }
  }

  // ==========================================
  // STEP B: CREATE & VERIFY PROFESSORS
  // ==========================================
  printInfo('\n--- Phase 2/4: Seeding Professors ---');
  for (const prof of professorsData) {
    try {
      const email = prof.user.email;
      const privateKey = prof.privateKey;
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;

      // Retrieve parent Academy's tokens & keys
      const academy = academiesMap[prof.academy_email];
      if (!academy) {
        throw new Error(`Parent academy "${prof.academy_email}" was not seeded or is missing.`);
      }

      // Retrieve Department UUID
      const deptId = departmentsMap[prof.department_code];
      if (!deptId) {
        throw new Error(`Department code "${prof.department_code}" was not resolved.`);
      }

      printInfo(`Registering Professor: "${prof.user.first_name} ${prof.user.last_name}" (${email})`);

      // 1. Create Professor profile (implicitly creates base User + Address)
      const createPayload = {
        user: prof.user,
        address: prof.address,
        department_id: deptId,
        title: prof.title,
        rank: prof.rank,
        specialization: prof.specialization,
        hire_date: prof.hire_date,
        employment_type: prof.employment_type,
        office_location: prof.office_location,
        office_hours: prof.office_hours,
        bio: prof.bio
      };

      const profRes = await apiClient.post('/professors', createPayload, academy.token);
      const profId = profRes.data.professor.id;
      printInfo(`Professor profile created. ID: ${profId}`);

      // 2. Trigger verification OTP
      printInfo(`Sending verification OTP to: ${email}`);
      const otpSendRes = await apiClient.post('/auth/otp/send', { email });
      const messageToSign = otpSendRes.data.message;

      // 3. Prompt user for OTP (waits for verification code)
      const otp = '000000';
      printInfo('Auto-filling OTP: 000000');

      // 4. Sign OTP nonce with Professor private key
      printInfo('Signing OTP nonce with Professor private key...');
      const signature = await wallet.signMessage(messageToSign);

      // 5. Request identity issuance
      printInfo('Submitting Professor identity request...');
      await apiClient.post('/identity/professors/request-issuance', {
        email,
        otp,
        signature
      });

      // 6. Fetch pending EIP-712 schema
      printInfo('Fetching pending EIP-712 schema...');
      const schemaRes = await apiClient.get(`/identity/professors/pending/${address}/schema`, academy.token);
      const { domain, types, message } = schemaRes.data;

      // 7. Sign EIP-712 schema with Academy private key
      printInfo('Signing EIP-712 schema as Academy...');
      const academyWallet = new ethers.Wallet(academy.privateKey);
      const academySignature = await academyWallet.signTypedData(domain, types, message);

      // 8. Finalize identity on-chain
      printInfo('Submitting finalized Academy signature to issue Professor identity...');
      const issueRes = await apiClient.post('/identity/professors/issue', {
        professor_address: address,
        signature: academySignature
      }, academy.token);
      printInfo('Professor identity successfully issued.');

      // 9. Wait and login to get Professor tokens
      printInfo('Waiting 3s for transaction to be mined...');
      await wait(3000);
      printInfo('Retrieving Professor auth tokens...');
      const tokens = await getUserToken(address, privateKey);

      // Save professor mappings
      professorsMap[email] = {
        id: profId,
        token: tokens.accessToken,
        privateKey,
        address
      };

      printResult(`Professor "${prof.user.first_name}" fully seeded and verified!`, {
        profId,
        walletAddress: address,
        tokens
      });
    } catch (err) {
      printError(`Failed to seed Professor: ${prof.user?.email || 'Unknown'}`, err);
      process.exit(1);
    }
  }

  // ==========================================
  // STEP C: CREATE & VERIFY STUDENTS
  // ==========================================
  printInfo('\n--- Phase 3/4: Seeding Students ---');
  for (const student of studentsData) {
    try {
      const email = student.user.email;
      const privateKey = student.privateKey;
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;

      // Retrieve parent Academy's tokens & keys
      const academy = academiesMap[student.academy_email];
      if (!academy) {
        throw new Error(`Parent academy "${student.academy_email}" was not seeded or is missing.`);
      }

      // Retrieve Department UUID
      const deptId = departmentsMap[student.department_code];
      if (!deptId) {
        throw new Error(`Department code "${student.department_code}" was not resolved.`);
      }

      // Retrieve Advisor UUID
      const advisor = professorsMap[student.advisor_email];
      if (!advisor) {
        throw new Error(`Advisor "${student.advisor_email}" was not seeded or is missing.`);
      }

      printInfo(`Registering Student: "${student.user.first_name} ${student.user.last_name}" (${email})`);

      // 1. Create Student profile (implicitly creates User + Address)
      const createPayload = {
        user: student.user,
        address: student.address,
        department_id: deptId,
        advisor_id: advisor.id,
        enrollment_status: student.enrollment_status,
        enrollment_date: student.enrollment_date,
        actual_graduation_date: student.actual_graduation_date
      };

      if (!createPayload.actual_graduation_date) delete createPayload.actual_graduation_date;
      if (!createPayload.enrollment_status) delete createPayload.enrollment_status;
      if (!createPayload.enrollment_date) delete createPayload.enrollment_date;

      const studentRes = await apiClient.post('/students', createPayload, academy.token);
      const studentId = studentRes.data.student.id;
      printInfo(`Student profile created. ID: ${studentId}`);

      // 2. Trigger verification OTP
      printInfo(`Sending verification OTP to: ${email}`);
      const otpSendRes = await apiClient.post('/auth/otp/send', { email });
      const messageToSign = otpSendRes.data.message;

      // 3. Prompt user for OTP (waits for verification code)
      const otp = '000000';
      printInfo('Auto-filling OTP: 000000');

      // 4. Sign OTP nonce with Student private key
      printInfo('Signing OTP nonce with Student private key...');
      const signature = await wallet.signMessage(messageToSign);

      // 5. Request identity issuance
      printInfo('Submitting Student identity request...');
      await apiClient.post('/identity/students/request-issuance', {
        email,
        otp,
        signature
      });

      // 6. Fetch pending EIP-712 schema
      printInfo('Fetching pending EIP-712 schema...');
      const schemaRes = await apiClient.get(`/identity/students/pending/${address}/schema`, academy.token);
      const { domain, types, message } = schemaRes.data;

      // 7. Sign EIP-712 schema with Academy private key
      printInfo('Signing EIP-712 schema as Academy...');
      const academyWallet = new ethers.Wallet(academy.privateKey);
      const academySignature = await academyWallet.signTypedData(domain, types, message);

      // 8. Finalize identity on-chain
      printInfo('Submitting finalized Academy signature to issue Student identity...');
      const issueRes = await apiClient.post('/identity/students/issue', {
        student_address: address,
        signature: academySignature
      }, academy.token);
      printInfo('Student identity successfully issued.');

      // 9. Wait and login to get Student tokens
      printInfo('Waiting 3s for transaction to be mined...');
      await wait(3000);
      printInfo('Retrieving Student auth tokens...');
      const tokens = await getUserToken(address, privateKey);

      // Save student mappings
      studentsMap[email] = {
        id: studentId,
        walletAddress: address,
        token: tokens.accessToken
      };

      printResult(`Student "${student.user.first_name}" fully seeded and verified!`, {
        studentId,
        walletAddress: address,
        tokens
      });
    } catch (err) {
      printError(`Failed to seed Student: ${student.user?.email || 'Unknown'}`, err);
      process.exit(1);
    }
  }

  // ==========================================
  // STEP D: CREATE & ISSUE CREDENTIALS
  // ==========================================
  printInfo('\n--- Phase 4/4: Seeding Credentials ---');
  for (const cred of credentialsData) {
    try {
      const studentEmail = cred.student_email;
      const issuerEmail = cred.issuer_email;

      // Retrieve Student wallet address
      const student = studentsMap[studentEmail];
      if (!student) {
        throw new Error(`Recipient student "${studentEmail}" was not seeded or is missing.`);
      }

      // Retrieve Issuer details (Can be Academy or Professor)
      let issuerToken, issuerPrivateKey;
      if (academiesMap[issuerEmail]) {
        const academy = academiesMap[issuerEmail];
        issuerToken = academy.token;
        issuerPrivateKey = academy.privateKey;
        printInfo(`Issuing credential as Academy: ${issuerEmail}`);
      } else if (professorsMap[issuerEmail]) {
        const prof = professorsMap[issuerEmail];
        issuerToken = prof.token;
        issuerPrivateKey = prof.privateKey;
        printInfo(`Issuing credential as Professor: ${issuerEmail}`);
      } else {
        throw new Error(`Issuer email "${issuerEmail}" matches neither a seeded Academy nor Professor.`);
      }

      printInfo(`Creating Credential draft: "${cred.details.title}" for ${studentEmail}`);

      // 1. Create Credential draft
      const draftPayload = {
        ...cred.details,
        student_address: student.walletAddress
      };
      const draftRes = await apiClient.post('/credentials', draftPayload, issuerToken);
      const credentialId = draftRes.data.credential_id;
      printInfo(`Credential draft created. ID: ${credentialId}`);

      // 2. Fetch signature schema
      printInfo('Fetching credential EIP-712 signing schema...');
      const schemaRes = await apiClient.get(`/credentials/${credentialId}/signature-schema`, issuerToken);
      const { domain, types, message } = schemaRes.data.signature_schema;

      // 3. Sign EIP-712 schema with Issuer private key
      printInfo('Signing credential schema with issuer private key...');
      const wallet = new ethers.Wallet(issuerPrivateKey);
      const signature = await wallet.signTypedData(domain, types, message);

      // 4. Finalize credential issuance on-chain
      printInfo('Finalizing credential issuance...');
      const issueRes = await apiClient.post(`/credentials/${credentialId}/issue`, { signature }, issuerToken);

      printResult(`Credential "${cred.details.title}" successfully issued!`, {
        credentialId,
        blockchainTransaction: issueRes.data.blockchain_transaction
      });
      printInfo('Waiting 3s for transaction to be mined...');
      await wait(3000);
    } catch (err) {
      printError(`Failed to seed Credential: ${cred.details?.title || 'Unknown'}`, err);
      process.exit(1);
    }
  }

  printInfo('\n=== Seeding Pipeline Completed Successfully! ===\n');
  process.exit(0);
}

main();
