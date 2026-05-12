import { post } from './http.js';

export const createAddress = (payload) => post('/addresses', payload);
