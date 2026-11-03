import { useState } from 'react';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { Alert, Field, PageHeader } from '../../components/ui';

const DESIGNATIONS = ['Teller', 'Manager', 'Administrator'];

// Administration page: create staff logins, enable/disable, reset passwords.
// Admin only - every endpoint re-checks the role AND the 'Administrator'
// designation inside the procedures, so this page is convenience, not security.
export default function StaffAdmin() {
  const { data, loading, reload } = useFetch('/admin/staff');
  const [msg, setMsg] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    cnic: '', name: '', designation: 'Teller', email: '', branchId: 1,
    username: '', password: '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function createStaff(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.post('/admin/staff', {
        ...form,
        name: form.name.trim(), username: form.username.trim(),
        branchId: Number(form.branchId),
      });
      setMsg({ type: 'ok', text: `${res.message}: ${form.username} (${form.designation})` });
      setForm({ ...form, cnic: '', name: '', email: '', username: '', password: '' });
      reload();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user) {
    setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.patch(`/admin/users/${user.user_id}`, {
        isActive: !user.is_active,
      });
      setMsg({ type: 'ok', text: `${user.username}: ${res.message}` });
      reload();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user) {
    const pw = (window.prompt(`New password for ${user.username} (min 8 chars):`) || '').trim();
    if (!pw) return;
    if (pw.length < 8) return setMsg({ type: 'err', text: 'Password must be at least 8 characters' });
    setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.post(`/admin/users/${user.user_id}/password`, { password: pw });
      setMsg({ type: 'ok', text: `${user.username}: ${res.message}` });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Administration" subtitle="Create and manage staff logins. Admin only." />
      <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>

      <div className="split">
        <form className="card form" onSubmit={createStaff} noValidate>
          <h3 className="section-title">Create a staff login</h3>
          <div className="form-grid">
            <Field label="CNIC (13 digits)"><input value={form.cnic} onChange={set('cnic')} inputMode="numeric" placeholder="3511111111103" maxLength={13} required /></Field>
            <Field label="Full name"><input value={form.name} onChange={set('name')} placeholder="Sara Teller" required /></Field>
            <Field label="Designation">
              <select value={form.designation} onChange={set('designation')}>
                {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Email"><input type="email" value={form.email} onChange={set('email')} placeholder="sara@bank.com" required /></Field>
            <Field label="Branch ID"><input value={form.branchId} onChange={set('branchId')} inputMode="numeric" required /></Field>
            <Field label="Username"><input value={form.username} onChange={set('username')} placeholder="sara" autoComplete="off" required /></Field>
          </div>
          <Field label="Password (min 8 chars)" htmlFor="st-pw">
            <input id="st-pw" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Working…' : 'Create staff login'}</button>
        </form>

        <div className="card">
          <h3 className="section-title">Existing logins</h3>
          {loading ? <p className="muted">Loading…</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Designation</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {(data || []).map((r) => (
                    <tr key={r.employee_id}>
                      <td><strong>{r.name}</strong><small className="muted block">CNIC {r.cnic}</small></td>
                      <td>{r.designation}</td>
                      <td className="mono">{r.username ?? <span className="muted">no login</span>}</td>
                      <td>{r.role ? <span className="badge">{r.role}</span> : '—'}</td>
                      <td>{r.user_id ? (r.is_active ? 'active' : <strong>disabled</strong>) : '—'}</td>
                      <td className="num">
                        {r.user_id && (
                          <>
                            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => resetPassword(r)}>Reset password</button>
                            <button className={`btn btn-sm ${r.is_active ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={() => toggle(r)}>
                              {r.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small">Passwords are bcrypt-hashed on the server; the API never sees or stores plain text.</p>
        </div>
      </div>
    </>
  );
}
