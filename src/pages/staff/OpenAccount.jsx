import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import CustomerSearch from '../../components/CustomerSearch';
import { Alert, Field, PageHeader, Skeleton } from '../../components/ui';
import { fmtAccountNumber, isMoney, pkr } from '../../utils/format';

export default function OpenAccount() {
  const location = useLocation();
  const branches = useFetch('/branches');
  const types = useFetch('/account-types');
  const [customer, setCustomer] = useState(location.state?.customer || null);
  const [form, setForm] = useState({ branchId: '', accountTypeId: '', initialDeposit: '' });
  const [msg, setMsg] = useState(null);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const type = (types.data || []).find((t) => String(t.account_type_id) === form.accountTypeId);

  async function submit(e) {
    e.preventDefault();
    if (!customer) return setMsg({ type: 'err', text: 'Choose a customer first' });
    if (!form.branchId || !form.accountTypeId) return setMsg({ type: 'err', text: 'Choose a branch and an account type' });
    if (!isMoney(form.initialDeposit)) return setMsg({ type: 'err', text: 'Enter a valid amount' });
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.post('/accounts', {
        customerId: customer.customer_id, branchId: Number(form.branchId),
        accountTypeId: Number(form.accountTypeId), initialDeposit: form.initialDeposit,
      });
      setCreated(data);
      setForm({ ...form, initialDeposit: '' });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) }); // 'Minimum balance violated', ...
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Open an account" subtitle="Create a new account for an existing customer." />
      <div className="narrow">
        {created && (
          <div className="card success-card">
            <Alert type="ok">{created.message}</Alert>
            {created.account_number && <p>New account number: <strong className="mono">{fmtAccountNumber(created.account_number)}</strong></p>}
            <div className="card-actions">
              <Link to="/service" state={{ customer }} className="btn btn-primary btn-sm">Go to service desk</Link>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreated(null)}>Open another</button>
            </div>
          </div>
        )}
        {!created && (
          <form className="card form" onSubmit={submit} noValidate>
            <CustomerSearch selected={customer} onSelect={setCustomer} />
            <div className="form-grid">
              <Field label="Branch" htmlFor="oa-branch">
                {branches.loading ? <Skeleton h={42} /> : (
                  <select id="oa-branch" value={form.branchId} onChange={set('branchId')}>
                    <option value="">Select a branch</option>
                    {(branches.data || []).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name} · {b.city}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Account type" htmlFor="oa-type">
                {types.loading ? <Skeleton h={42} /> : (
                  <select id="oa-type" value={form.accountTypeId} onChange={set('accountTypeId')}>
                    <option value="">Select a type</option>
                    {(types.data || []).map((t) => <option key={t.account_type_id} value={t.account_type_id}>{t.type_name}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Initial deposit" htmlFor="oa-dep" hint={type ? `Minimum balance for ${type.type_name}: ${pkr(type.min_balance)}` : 'Choose an account type to see its minimum balance.'}>
              <div className="input-prefix"><span>PKR</span>
                <input id="oa-dep" inputMode="decimal" placeholder="0.00" value={form.initialDeposit} onChange={set('initialDeposit')} autoComplete="off" />
              </div>
            </Field>
            <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Opening…' : 'Open account'}</button>
          </form>
        )}
      </div>
    </>
  );
}
