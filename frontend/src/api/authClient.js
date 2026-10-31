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

export function loginWithEmail(email, password) {
  return submitAuth('login', { email, password });
}

export function signupWithEmail(email, password, confirmPassword) {
  return submitAuth('signup', { email, password, confirm_password: confirmPassword });
}
