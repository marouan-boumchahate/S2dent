const BASE = process.env.API_URL ?? 'http://localhost:3000/api';

const request = async (method, path, { body, token } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  }

  return res.json();
};

export const get = (path, token) => request('GET', path, { token });
export const post = (path, body, token) => request('POST', path, { body, token });
