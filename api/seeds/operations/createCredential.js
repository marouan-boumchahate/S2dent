// createCredential.js — Handles the interactive creation of a new Credential.
import { askJson, askSecret, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError } from '../display.js';

const BODY_SCHEMA = {
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

export const label = 'Create Credential';

export async function run() {
  while (true) {
    try {
      const issuerToken = await askSecret('Enter issuer access token (academy or professor token)');
      const body = await askJson('Enter credential body', BODY_SCHEMA);
      const response = await apiClient.post('/credentials', body, issuerToken);
      printResult('Credential draft created successfully', response.data);
      break;
    } catch (err) {
      printError('Failed to create credential', err);
      const retry = await askConfirm('Retry?');
      if (!retry) break;
    }
  }
}
