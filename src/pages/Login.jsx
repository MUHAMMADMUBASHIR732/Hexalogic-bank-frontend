import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, ArrowLeftRight, ClipboardCheck } from 'lucide-react';
import { DEMO, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Brand, Field } from '../components/ui';

const DEMO_USERS = [
  { label: 'Customer', username: 'ayesha', password: 'password123' },
  { label: 'Teller', username: 'teller1', password: 'teller123' },
  { label: 'Manager', username: 'manager1', password: 'manager123' },
];

export default function Login() {
  const { role, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (role) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await login(form.username.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-side" aria-hidden="true">
        <Brand light />
        <div className="auth-copy">
          <span className="eyebrow">Hexalogic Bank</span>
          <h2>Banking that keeps its rules in the database.</h2>
          <p>Every balance, transfer and loan decision is checked by the database itself, so the numbers you see are the numbers that count.</p>
          <ul>
            <li><span className="feat-icon"><ShieldCheck size={18} /></span><span>Role-based access for customers, tellers and managers</span></li>
            <li><span className="feat-icon"><ArrowLeftRight size={18} /></span><span>Transfers and statements with running balances</span></li>
            <li><span className="feat-icon"><ClipboardCheck size={18} /></span><span>Loan applications reviewed by managers</span></li>
          </ul>
        </div>
        <small>Database Management System course project</small>
      </section>

      <section className="auth-main">
        <div className="auth-card">
          <div className="auth-brand-mobile"><Brand /></div>
          <h1>Welcome back</h1>
          <p className="muted">Log in to manage your accounts.</p>

          {location.state?.registered && <Alert type="ok">Registration successful. You can log in now.</Alert>}
          <Alert>{error}</Alert>

          <form onSubmit={submit} className="form" noValidate>
            <Field label="Username" htmlFor="username">
              <input id="username" value={form.username} onChange={set('username')} autoComplete="username" autoFocus required />
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="input-icon input-icon-right">
                <input id="password" type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="current-password" required />
                <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <button className="btn btn-primary btn-block" disabled={busy || !form.username || !form.password}>
              {busy ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch">New customer? <Link to="/register">Create an account</Link></p>

          {DEMO && (
            <div className="demo-box">
              <small className="muted">Demo mode: pick a role to fill in the login</small>
              <div className="chips">
                {DEMO_USERS.map((u) => (
                  <button key={u.label} type="button" className="chip" onClick={() => setForm({ username: u.username, password: u.password })}>
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
