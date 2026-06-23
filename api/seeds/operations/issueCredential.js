// issueCredential.js — Performs full end-to-end Credential creation, EIP-712 signing, and on-chain issuance.
import { askJson, askSecret, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError, printInfo } from '../display.js';
import { ethers } from 'ethers';

const CREDENTIAL_SCHEMA = {
  title: 'Enrollment Certificate',
  credential_type: 'enrollment', // enrollment, attendance, degree, certificate, achievement, transcript
  description: 'Proof of current enrollment.',
  student_address: '0x...',
  payload: {
    course_name: 'Applied Cryptography',
    course_code: 'CSE402',
    semester: 'fall', // fall, spring, summer
    enrollment_date: '2024-09-15'
  }
};

export const label = 'Create & Issue Credential (Full E2E Workflow)';

export async function run() {
  while (true) {
    try {
      // 1. Collect inputs
      const issuerToken = await askSecret('Enter issuer access token (academy or professor token)');
      const issuerPrivateKey = await askSecret('Enter issuer private key (for EIP-712 signing)');
      const body = await askJson('Enter credential details and payload', CREDENTIAL_SCHEMA);

      // 2. Create Credential draft
      printInfo('Step 1/3: Creating Credential draft on backend...');
      const draftRes = await apiClient.post('/credentials', body, issuerToken);
      const credentialId = draftRes.data.credential_id;
      printInfo(`Credential draft created. ID: ${credentialId}`);

      // 3. Fetch EIP-712 signature schema
      printInfo('Step 2/3: Fetching EIP-712 signature schema...');
      const schemaRes = await apiClient.get(`/credentials/${credentialId}/signature-schema`, issuerToken);
      const { domain, types, message } = schemaRes.data.signature_schema;

      // 4. Sign schema as Issuer
      printInfo('Signing credential data with issuer private key...');
      const wallet = new ethers.Wallet(issuerPrivateKey);
      const signature = await wallet.signTypedData(domain, types, message);

      // 5. Submit signature and finalize on-chain
      printInfo('Step 3/3: Submitting signature to issue credential on-chain...');
      const issueRes = await apiClient.post(`/credentials/${credentialId}/issue`, { signature }, issuerToken);

      // Display results
      printResult('Credential issued successfully!', {
        credentialId,
        blockchainTransaction: issueRes.data.blockchain_transaction,
        payloadHash: draftRes.data.payload_hash
      });

      break;
    } catch (err) {
      printError('Credential issuance workflow failed', err);
      const retry = await askConfirm('Retry the entire workflow?');
      if (!retry) break;
    }
  }
}
