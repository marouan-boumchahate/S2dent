// createDepartment.js — Handles the interactive creation of a new Department.
import { askJson, askSecret, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError } from '../display.js';

const BODY_SCHEMA = {
  code: 'CSE101',
  name: 'Computer Science and Engineering',
  faculty: 'Engineering Faculty',
  total_years: 4,
  description: 'Software engineering, algorithms, and systems design.',
  is_active: true
};

export const label = 'Create Department';

export async function run() {
  while (true) {
    try {
      const academyToken = await askSecret('Enter academy access token');
      const body = await askJson('Enter department body', BODY_SCHEMA);
      const response = await apiClient.post('/departments', body, academyToken);
      
      printResult('Department created successfully', response.data);
      break;
    } catch (err) {
      printError('Failed to create department', err);
      const retry = await askConfirm('Retry?');
      if (!retry) break;
    }
  }
}
