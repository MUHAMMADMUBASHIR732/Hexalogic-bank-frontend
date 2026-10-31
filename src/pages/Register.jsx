import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Brand, Field } from '../components/ui';

const EMPTY = { cnic: '', name: '', phone: '', email: '', username: '', password: '' };

function check(f) {
  const e = {};
  if (!/^\d{13}$/.test(f.cnic)) e.cnic = 'CNIC must be 13 digits, without dashes';
  if (f.name.trim().length < 2) e.name = 'Enter your full name';
  if (!/^\d{10,15}$/.test(f.phone)) e.phone = 'Enter 10 to 15 digits';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
  if (f.username.trim().length < 3) e.username = 'At least 3 characters';
  if (f.password.length < 8) e.password = 'At least 8 characters';
  return e;
}

export default function Register() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (role) return <Navigate to="/" replace />;
  const errors = check(form);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const blur = (k) => () => setTouched({ ...touched, [k]: true });
  const err = (k) => touched[k] && errors[k];

  async function submit(e) {
    e.preventDefault();
    setTouched({ cnic: true, name: true, phone: true, email: true, username: true, password: true });
    if (Object.keys(errors).length) return;
    setBusy(true); setError('');
    try {
      await api.post('/auth/register', { ...form, name: form.name.trim(), username: form.username.trim() });
      navigate('/login', { state: { registered: true } });
    } catch (ex) {
      setError(errMsg(ex));
      setBusy(false);
    }
  }

  const input = (k, label, { hint, ...props } = {}) => (
    <Field label={label} htmlFor={k} hint={err(k) ? null : hint}>
      <input
        id={k} value={form[k]} onChange={set(k)} onBlur={blur(k)} aria-invalid={Boolean(err(k))}
        className={err(k) ? 'invalid' : ''} {...props}
      />
      {err(k) && <small className="field-error">{errors[k]}</small>}
    </Field>
  );

  return (
    <div className="auth auth-single">
      <section className="auth-main">
        <div className="auth-card auth-card-wide">
          <div className="auth-brand-mobile show"><Brand /></div>
          <h1>Create your account</h1>
          <p className="muted">Register as a customer. A teller can open your first bank account.</p>
          <Alert>{error}</Alert>
          <form onSubmit={submit} className="form" noValidate>
            <div className="form-grid">
              {input('name', 'Full name', { autoComplete: 'name' })}
              {input('cnic', 'CNIC', { inputMode: 'numeric', maxLength: 13, hint: '13 digits, no dashes' })}
              {input('phone', 'Phone', { inputMode: 'tel', autoComplete: 'tel' })}
              {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
              {input('username', 'Username', { autoComplete: 'username' })}
              {input('password', 'Password', { type: 'password', autoComplete: 'new-password', hint: 'At least 8 characters' })}
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          </form>
          <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
        </div>
      </section>
    </div>
  );
}
