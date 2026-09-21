// One fetch wrapper for every API call: attaches the token, turns { error: { code, message } } into a thrown Error.
export const UNAUTHORIZED_EVENT = 'leaveflow:unauthorized';

export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api' + path, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // A 401 on an authenticated call means the token is missing, bad or expired: drop it and go back to Login.
    // (A 401 from the login form itself is just "wrong email or password" and is shown on the form.)
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const err = new Error(data?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}
