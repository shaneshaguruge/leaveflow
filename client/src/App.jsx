import { useEffect, useState } from 'react';
import { api, UNAUTHORIZED_EVENT } from './api';
import Login from './components/Login';
import MyLeave from './components/MyLeave';
import Approvals from './components/Approvals';
import AllRequests from './components/AllRequests';
import Holidays from './components/Holidays';

const PAGES = [
  { key: 'leave', label: 'My leave', roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'] },
  { key: 'approvals', label: 'Approvals', roles: ['MANAGER', 'HR_ADMIN'] },
  { key: 'all', label: 'All requests', roles: ['HR_ADMIN'] },
  { key: 'holidays', label: 'Holidays', roles: ['HR_ADMIN'] },
];

export default function App() {
  const [user, setUser] = useState(null);
  // If a token survived a reload, ask the API who it belongs to before showing anything.
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem('token')));
  const [page, setPage] = useState('leave');

  useEffect(() => {
    if (!checking) return;
    api('/me')
      .then((me) => setUser(me))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setChecking(false));
  }, [checking]);

  // Any 401 from the API (expired/bad token) clears the token in api.js and lands here.
  useEffect(() => {
    const onUnauthorized = () => { setUser(null); setPage('leave'); };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setPage('leave');
  }

  if (checking) return <main className="container"><p>Loading…</p></main>;
  if (!user) return <Login onLogin={(u) => { setUser(u); setPage('leave'); }} />;

  // Hiding links is comfort, not security: the API's 403 is the real lock.
  const pages = PAGES.filter((p) => p.roles.includes(user.role));
  const current = pages.some((p) => p.key === page) ? page : 'leave';

  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <strong className="brand">LeaveFlow</strong>
          <span className="who">{user.name} <small>{user.role.replace('_', ' ')}</small></span>
          <button type="button" className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
        <nav aria-label="Main">
          {pages.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`tab${current === p.key ? ' tab-active' : ''}`}
              aria-current={current === p.key ? 'page' : undefined}
              onClick={() => setPage(p.key)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="container">
        {current === 'approvals' && <Approvals />}
        {current === 'all' && <AllRequests />}
        {current === 'holidays' && <Holidays />}
        {current === 'leave' && <MyLeave />}
      </main>
    </>
  );
}
