// createAddress.js — Handles the interactive creation of a new Address for a User or Academy.
import { askJson, askSecret, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError } from '../display.js';

const BODY_SCHEMA = {
  user_id: '', // optional (xor with academy_id)
  academy_id: '', // optional (xor with user_id)
  address_line1: '123 Main St',
  address_line2: 'Apt 4B',
  street: 'Main St',
  district: 'Central',
  state: 'StateName',
  postal_code: '12345',
  city: 'City',
  country: 'Country',
  latitude: 40.7128,
  longitude: -74.006
};

export const label = 'Create Address';

export async function run(adminToken) {
  while (true) {
    try {
      const customToken = await askSecret('Enter auth token (leave empty to use current admin token)');
      const tokenToUse = customToken || adminToken;

      const body = await askJson('Enter address body', BODY_SCHEMA);
      // Clean up empty fields to avoid Joi schema validation issues
      if (!body.user_id) delete body.user_id;
      if (!body.academy_id) delete body.academy_id;

      const response = await apiClient.post('/addresses', body, tokenToUse);
      printResult('Address created successfully', response.data);
      break;
    } catch (err) {
      printError('Failed to create address', err);
      const retry = await askConfirm('Retry?');
      if (!retry) break;
    }
  }
}
