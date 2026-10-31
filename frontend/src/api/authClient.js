import { BASE_URL, DEFAULT_API_BASE_URL } from './emotionClient';

const API_BASE_URL = BASE_URL || DEFAULT_API_BASE_URL;

async function submitAuth(path, payload) {
  const response = await fetch(`${API_BASE_URL}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep a useful fallback when the backend does not return JSON.
  }

  if (!response.ok) {
    const message = typeof data.detail === 'string' ? data.detail : 'Could not sign in. Check your details and try again.';
    throw new Error(message);
  }

  return data;
}

export function loginWithUsername(username, password) {
  return submitAuth('login', { username, password });
}

export function signupWithUsername(username, password, confirmPassword) {
  return submitAuth('signup', { username, password, confirm_password: confirmPassword });
}
