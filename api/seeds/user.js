import { post } from './http.js';

export const createUser = async (profile, token) => {
  const { data } = await post('/users', profile, token);
  return data.user.id;
};
