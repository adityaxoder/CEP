import { BASE_URL, DEFAULT_API_BASE_URL } from './emotionClient';

const API_BASE_URL = BASE_URL || DEFAULT_API_BASE_URL;

async function historyRequest(path, accessToken, method = 'GET') {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep a helpful fallback if the API returns no JSON body.
  }
  if (!response.ok) {
    throw new Error(data.message || data.detail || 'Could not update your analysis history.');
  }
  return data;
}

export async function getAnalysisHistory(accessToken) {
  const data = await historyRequest('/history', accessToken);
  return Array.isArray(data.items) ? data.items : [];
}

export function clearAnalysisHistory(accessToken) {
  return historyRequest('/history', accessToken, 'DELETE');
}

export function deleteAnalysisHistoryEntry(id, accessToken) {
  return historyRequest(`/history/${encodeURIComponent(id)}`, accessToken, 'DELETE');
}
