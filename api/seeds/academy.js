import { post } from './http.js';

export const createAcademy = async (profile) => {
  const { data } = await post('/academies', profile);
  return data.academy.id;
};
