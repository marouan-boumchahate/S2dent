import { env } from './env.js';

const BASE_URL = env.apiUrl;

async function request(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorText;
    } catch {
      // Not JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const apiClient = {
  get: (path, token = null) => 
    request('GET', path, null, token ? { Authorization: `Bearer ${token}` } : {}),
  post: (path, body, token = null) => 
    request('POST', path, body, token ? { Authorization: `Bearer ${token}` } : {}),
  put: (path, body, token = null) => 
    request('PUT', path, body, token ? { Authorization: `Bearer ${token}` } : {}),
  delete: (path, body = null, token = null) => 
    request('DELETE', path, body, token ? { Authorization: `Bearer ${token}` } : {}),
};
