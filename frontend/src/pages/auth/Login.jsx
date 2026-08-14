import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('demo.analyst@enterprise-console.io');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const { source, error: srcError } = await login(email, password);
      if (source === 'mock') setNotice(`Signed in with demo data — ${srcError}`);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2>Sign in</h2>
      <p className="sub">Access the unified backtesting, analytics and retail assistant console.</p>
      {error && <div className="auth-error">{error}</div>}
      {notice && <div className="badge badge-warning" style={{ marginBottom: 16 }}>{notice}</div>}
      <form onSubmit={handleSubmit} className="flex-col gap-4">
        <div className="field">
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            required
            placeholder="Any password works in demo mode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="auth-switch">
        No account? <Link to="/register">Create one</Link>
      </div>
      <div className="demo-hint">
        Demo mode: if <span className="num">/api/v1/auth/login</span> is unreachable, the console signs you in
        with representative data so every module stays explorable.
      </div>
    </AuthShell>
  );
}
