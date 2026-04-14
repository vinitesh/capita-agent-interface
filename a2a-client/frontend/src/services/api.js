const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function discoverAgent(agentUrl) {
  const response = await fetch(`${BASE_URL}/api/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentUrl }),
  });
  return handleResponse(response);
}

export async function sendMessage({ agentUrl, contextId, userText, taskId, agentName, webhookContextId }) {
  const response = await fetch(`${BASE_URL}/api/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentUrl, contextId, userText, taskId, agentName, webhookContextId }),
  });
  return handleResponse(response);
}

export async function listSessions() {
  const response = await fetch(`${BASE_URL}/api/sessions`);
  return handleResponse(response);
}

export async function getSession(contextId) {
  const response = await fetch(`${BASE_URL}/api/sessions/${contextId}`);
  return handleResponse(response);
}

export async function listAgents() {
  const response = await fetch(`${BASE_URL}/api/agents`);
  return handleResponse(response);
}

export async function login(username, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
}

export async function listUsers() {
  const response = await fetch(`${BASE_URL}/api/users`);
  return handleResponse(response);
}

export async function createUser({ username, password, role }) {
  const response = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  return handleResponse(response);
}

export async function deleteUser(username, currentUser) {
  const response = await fetch(`${BASE_URL}/api/users/${encodeURIComponent(username)}?currentUser=${encodeURIComponent(currentUser)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}
