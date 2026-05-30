import { post } from './http.js';

export const createAddress = (payload, token) => post('/addresses', payload, token);
