import { post } from './http.js';

export const createStudent = async (payload, token) => {
  const { data } = await post('/students', payload, token);
  return data.student.id;
};
