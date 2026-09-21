import { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message); // e.g. 401 "Wrong email or password"
      setBusy(false);
    }
  }

  return (
    <main className="container narrow">
      <h1 className="brand-big">LeaveFlow</h1>
      <form className="card form" onSubmit={submit}>
        <h2>Log in</h2>
        <label>
          Email
          <input type="email" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary" disabled={busy}>Log in</button>
        {error && <p role="alert" className="error">{error}</p>}
      </form>
    </main>
  );
}
