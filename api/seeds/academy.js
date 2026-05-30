import { post } from './http.js';

export const createAcademy = async (profile, token) => {
  const { data } = await post('/academies', profile, token);
  return data.academy.id;
};
