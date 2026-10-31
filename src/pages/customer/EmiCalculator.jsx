import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../../api/client';
import { Alert, Field, PageHeader } from '../../components/ui';
import { isMoney, pkr } from '../../utils/format';

export default function EmiCalculator() {
  const [form, setForm] = useState({ principal: '', rate: '12', months: '24' });
  const [emi, setEmi] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setEmi(null); };

  async function submit(e) {
    e.preventDefault();
    if (!isMoney(form.principal)) return setError('Enter a valid loan amount');
    if (!/^\d+(\.\d{1,2})?$/.test(form.rate)) return setError('Enter a valid yearly interest rate');
    if (!/^\d+$/.test(form.months) || Number(form.months) < 1) return setError('Enter the number of months');
    setBusy(true); setError('');
    try {
      const { data } = await api.get('/loans/emi', { params: { principal: form.principal, rate: form.rate, months: form.months } });
      setEmi(data.emi);
    } catch (err) {
      setError(errMsg(err)); setEmi(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="EMI calculator" subtitle="Estimate your monthly installment before you apply." />
      <div className="split">
        <form className="card form" onSubmit={submit} noValidate>
          <Field label="Loan amount" htmlFor="emi-p">
            <div className="input-prefix"><span>PKR</span>
              <input id="emi-p" inputMode="decimal" placeholder="0.00" value={form.principal} onChange={set('principal')} autoComplete="off" />
            </div>
          </Field>
          <div className="form-grid">
            <Field label="Interest rate (% a year)" htmlFor="emi-r">
              <input id="emi-r" inputMode="decimal" value={form.rate} onChange={set('rate')} autoComplete="off" />
            </Field>
            <Field label="Term (months)" htmlFor="emi-m">
              <input id="emi-m" inputMode="numeric" value={form.months} onChange={set('months')} autoComplete="off" />
            </Field>
          </div>
          <Alert>{error}</Alert>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Calculating…' : 'Calculate'}</button>
        </form>

        <div className={`card result ${emi ? 'has-value' : ''}`} aria-live="polite">
          {emi ? (
            <>
              <span className="eyebrow">Monthly installment</span>
              <div className="balance big">{pkr(emi)}</div>
              <p className="muted">for {form.months} months at {form.rate}% a year.</p>
              <Link to="/loans/apply" className="btn btn-primary">Apply for this loan</Link>
            </>
          ) : (
            <>
              <span className="eyebrow">Monthly installment</span>
              <p className="muted">Enter the loan details and select Calculate to see your estimate.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
