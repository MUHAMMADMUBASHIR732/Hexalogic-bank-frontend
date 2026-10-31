import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { Alert, Field, PageHeader, Skeleton } from '../../components/ui';
import { fmtAccountNumber, isMoney, pkr } from '../../utils/format';

export default function Transfer() {
  const [params] = useSearchParams();
  const { data, loading, error: loadError, reload } = useFetch('/accounts');
  // staff get one row per customer-account link, so the same account can appear twice
  const accounts = (data || []).filter(
    (a, i, all) => String(a.status).toLowerCase() === 'active' && all.findIndex((x) => x.account_id === a.account_id) === i,
  );
  const [form, setForm] = useState({ fromAccount: params.get('from') || '', toAccount: '', amount: '' });
  const [msg, setMsg] = useState(null); // { type: 'ok' | 'err', text }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.fromAccount && accounts.length === 1) setForm((f) => ({ ...f, fromAccount: String(accounts[0].account_id) }));
    // eslint-disable-next-line
  }, [data]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const from = accounts.find((a) => String(a.account_id) === String(form.fromAccount));

  async function submit(e) {
    e.preventDefault();
    if (!form.fromAccount) return setMsg({ type: 'err', text: 'Choose the account to send from' });
    if (!/^\d+$/.test(form.toAccount)) return setMsg({ type: 'err', text: 'Enter the destination account ID (numbers only)' });
    if (!isMoney(form.amount)) return setMsg({ type: 'err', text: 'Enter a valid amount' });
    setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.post('/transfers', {
        fromAccount: Number(form.fromAccount),
        toAccount: Number(form.toAccount),
        amount: form.amount, // string, e.g. "1500.50"
      });
      setMsg({ type: 'ok', text: res.message });
      setForm({ ...form, amount: '' });
      reload(); // always reload instead of editing balances by hand
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) }); // e.g. 'Insufficient balance'
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Transfer money" subtitle="Move funds between accounts instantly." />
      <div className="narrow">
        {loadError && <Alert>{loadError}</Alert>}
        <form className="card form" onSubmit={submit} noValidate>
          <Field label="From account" htmlFor="from-acc">
            {loading && !data ? <Skeleton h={42} /> : (
              <select id="from-acc" value={form.fromAccount} onChange={set('fromAccount')} required>
                <option value="">Select an account</option>
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {(a.account_type || 'Account')} · {fmtAccountNumber(a.account_number)}
                  </option>
                ))}
              </select>
            )}
            {from && <small className="muted">Available balance: <strong>{pkr(from.balance)}</strong></small>}
          </Field>

          <Field label="To account ID" htmlFor="to-acc" hint="Ask the receiver for their account ID. You can also pick one of your own accounts.">
            <input
              id="to-acc" inputMode="numeric" list="own-accounts" placeholder="e.g. 3"
              value={form.toAccount} onChange={set('toAccount')} autoComplete="off" required
            />
            <datalist id="own-accounts">
              {accounts.filter((a) => String(a.account_id) !== String(form.fromAccount)).map((a) => (
                <option key={a.account_id} value={a.account_id}>{fmtAccountNumber(a.account_number)}</option>
              ))}
            </datalist>
          </Field>

          <Field label="Amount" htmlFor="amount">
            <div className="input-prefix">
              <span>PKR</span>
              <input id="amount" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={set('amount')} autoComplete="off" required />
            </div>
          </Field>

          <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Transfer'}</button>
        </form>
      </div>
    </>
  );
}
