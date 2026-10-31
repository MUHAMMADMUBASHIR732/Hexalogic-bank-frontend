import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { Alert, Field, PageHeader, Skeleton } from '../../components/ui';
import { isMoney } from '../../utils/format';

const TERMS = [6, 12, 18, 24, 36, 48, 60];

export default function ApplyLoan() {
  const { data: branches, loading } = useFetch('/branches');
  const [form, setForm] = useState({ branchId: '', principal: '', termMonths: '12' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.branchId) return setMsg({ type: 'err', text: 'Choose a branch' });
    if (!isMoney(form.principal)) return setMsg({ type: 'err', text: 'Enter a valid amount' });
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.post('/loans', {
        branchId: Number(form.branchId), principal: form.principal, termMonths: Number(form.termMonths),
      });
      setMsg({ type: 'ok', text: data.message });
      setForm({ ...form, principal: '' });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Apply for a loan" subtitle="Tell us how much you need and for how long." />
      <div className="narrow">
        <form className="card form" onSubmit={submit} noValidate>
          <Field label="Branch" htmlFor="branch">
            {loading ? <Skeleton h={42} /> : (
              <select id="branch" value={form.branchId} onChange={set('branchId')}>
                <option value="">Select a branch</option>
                {(branches || []).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name} · {b.city}</option>)}
              </select>
            )}
          </Field>
          <Field label="Loan amount" htmlFor="principal">
            <div className="input-prefix"><span>PKR</span>
              <input id="principal" inputMode="decimal" placeholder="0.00" value={form.principal} onChange={set('principal')} autoComplete="off" />
            </div>
          </Field>
          <Field label="Term" htmlFor="term" hint="The bank sets the interest rate when it reviews your application.">
            <select id="term" value={form.termMonths} onChange={set('termMonths')}>
              {TERMS.map((t) => <option key={t} value={t}>{t} months</option>)}
            </select>
          </Field>

          <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
          {msg?.type === 'ok' && <p className="small"><Link to="/loans">View my loans</Link></p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
          <p className="muted small center">Want to see the monthly cost first? <Link to="/loans/emi">Try the EMI calculator</Link></p>
        </form>
      </div>
    </>
  );
}
