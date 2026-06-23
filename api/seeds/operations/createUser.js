// createUser.js — Handles the interactive creation of a new base User.
import { askJson, askSecret, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError } from '../display.js';

const BODY_SCHEMA = {
  first_name: 'John',
  middle_name: '',
  last_name: 'Doe',
  date_of_birth: '1995-05-15',
  gender: 'male', // male, female
  nationality: 'Moroccan',
  national_id: 'AB123456',
  email: 'johndoe@example.com',
  phone: '+14167894567',
  photo_url: 'https://example.com/photo.jpg'
};

export const label = 'Create User';

export async function run() {
  while (true) {
    try {
      const academyToken = await askSecret('Enter academy access token');
      const body = await askJson('Enter user body', BODY_SCHEMA);
      const response = await apiClient.post('/users', body, academyToken);
      printResult('User created successfully', response.data);
      break;
    } catch (err) {
      printError('Failed to create user', err);
      const retry = await askConfirm('Retry?');
      if (!retry) break;
    }
  }
}
