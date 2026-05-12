import { post } from './http.js';

export const createDepartment = async (payload, token) => {
  const { data } = await post('/departments', payload, token);
  return data.department.id;
};
