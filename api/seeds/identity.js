import { post } from './http.js';

const PATHS = {
  academy: 'academies',
  student: 'students',
  professor: 'professors',
};

export const issueIdentity = (role, payload, token) =>
  post(`/identity/${PATHS[role]}/issue`, payload, token);
