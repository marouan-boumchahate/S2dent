import { post } from './http.js';

export const createProfessor = async (payload, token) => {
  const { data } = await post('/professors', payload, token);
  return data.professor.id;
};
