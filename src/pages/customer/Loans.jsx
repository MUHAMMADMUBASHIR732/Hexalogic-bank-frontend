import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, HandCoins, Plus } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { Alert, CardSkeletons, Empty, Field, Modal, PageHeader, StatusBadge } from '../../components/ui';
import { fmtAccountNumber, fmtDate, isMoney, pkr } from '../../utils/format';

function PayModal({ loan, onClose, onDone }) {
  const { data } = useFetch('/accounts');
  const accounts = (data || []).filter((a) => String(a.status).toLowerCase() === 'active');
  const [form, setForm] = useState({ fromAccountId: '', amount: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const chosen = accounts.find((a) => String(a.account_id) === form.fromAccountId);

  async function submit(e) {
    e.preventDefault();
    if (!form.fromAccountId) return setError('Choose the account to pay from');
    if (!isMoney(form.amount)) return setError('Enter a valid amount');
    setBusy(true); setError('');
    try {
      const { data: res } = await api.post(`/loans/${loan.loan_id}/payments`, {
        amount: form.amount, fromAccountId: Number(form.fromAccountId),
      });
      onDone(res.message);
    } catch (err) {
      setError(errMsg(err)); setBusy(false);
    }
  }

  return (
    <Modal
      title={`Pay installment · Loan #${loan.loan_id}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="pay-form" className="btn btn-primary" disabled={busy}>{busy ? 'Paying…' : 'Pay now'}</button>
        </>
      }
    >
      <form id="pay-form" className="form" onSubmit={submit} noValidate>
        <p className="muted">Remaining balance: <strong>{pkr(loan.remaining_balance ?? loan.principal_amount)}</strong></p>
        <Field label="Pay from" htmlFor="pay-acc">
          <select id="pay-acc" value={form.fromAccountId} onChange={set('fromAccountId')}>
            <option value="">Select an account</option>
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>{(a.account_type || 'Account')} · {fmtAccountNumber(a.account_number)}</option>
            ))}
          </select>
          {chosen && <small className="muted">Available balance: <strong>{pkr(chosen.balance)}</strong></small>}
        </Field>
        <Field label="Amount" htmlFor="pay-amt">
          <div className="input-prefix"><span>PKR</span>
            <input id="pay-amt" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={set('amount')} autoComplete="off" />
          </div>
        </Field>
        <Alert>{error}</Alert>
      </form>
    </Modal>
  );
}

export default function Loans() {
  const { data, loading, error, reload } = useFetch('/loans');
  const [paying, setPaying] = useState(null);
  const [notice, setNotice] = useState('');
  const loans = data || [];

  return (
    <>
      <PageHeader title="My loans" subtitle="Track your applications and repayments.">
        <Link to="/loans/apply" className="btn btn-primary"><Plus size={17} /> Apply for a loan</Link>
        <Link to="/loans/emi" className="btn btn-ghost"><Calculator size={17} /> EMI calculator</Link>
      </PageHeader>

      <Alert type="ok" onClose={() => setNotice('')}>{notice}</Alert>
      {error && <Alert>{error} <button className="link-btn" onClick={reload}>Try again</button></Alert>}

      {loading && !data ? (
        <CardSkeletons n={2} />
      ) : loans.length === 0 && !error ? (
        <Empty title="No loans yet" text="Apply for a loan. A loan officer reviews it, then the branch manager sanctions it.">
          <Link to="/loans/apply" className="btn btn-primary"><HandCoins size={17} /> Apply for a loan</Link>
        </Empty>
      ) : (
        <div className="grid cards stagger">
          {loans.map((l, i) => (
            <article className={`card hoverable loan-card tone-${String(l.status).toLowerCase()}`} key={l.loan_id} style={{ '--i': i }}>
              <div className="account-top">
                <span className="eyebrow">Loan #{l.loan_id}</span>
                <StatusBadge status={l.status} />
              </div>
              <div className="balance">{pkr(l.principal_amount)}</div>
              <div className="muted small">Principal amount</div>
              <dl className="meta">
                <div><dt>Interest rate</dt><dd>{l.interest_rate}% a year</dd></div>
                {l.term_months && <div><dt>Term</dt><dd>{l.term_months} months</dd></div>}
                <div><dt>Start date</dt><dd>{fmtDate(l.start_date)}</dd></div>
                <div><dt>Payments made</dt><dd>{l.total_payments ?? 0}</dd></div>
                <div><dt>Total paid</dt><dd>{pkr(l.total_amount_paid ?? 0)}</dd></div>
                {l.remaining_balance != null && <div><dt>Remaining</dt><dd>{pkr(l.remaining_balance)}</dd></div>}
              </dl>
              {String(l.status).toLowerCase() === 'approved' && (
                <div className="card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setPaying(l)}>Pay installment</button>
                </div>
              )}
              {String(l.status).toLowerCase() === 'pending' && <p className="muted small note">Waiting for a loan officer to review this application.</p>}
              {String(l.status).toLowerCase() === 'recommended' && <p className="muted small note">Recommended. Waiting for the branch manager to sanction it.</p>}
            </article>
          ))}
        </div>
      )}

      {paying && (
        <PayModal
          loan={paying}
          onClose={() => setPaying(null)}
          onDone={(m) => { setPaying(null); setNotice(m); reload(); }}
        />
      )}
    </>
  );
}
