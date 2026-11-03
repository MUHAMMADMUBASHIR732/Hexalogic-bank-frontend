import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import CustomerSearch from '../../components/CustomerSearch';
import { Alert, ConfirmDialog, Empty, Field, PageHeader, StatusBadge } from '../../components/ui';
import { cap, fmtAccountNumber } from '../../utils/format';

export default function BranchControl() {
  const [customer, setCustomer] = useState(null);
  const [rmId, setRmId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const rms = useFetch('/employees/relationship-managers');
  const accountsQ = useFetch(customer ? '/accounts' : null);
  const accounts = (accountsQ.data || []).filter((a) => a.customer_id === customer?.customer_id && String(a.status).toLowerCase() !== 'closed');

  useEffect(() => { setAccountId(''); setMsg(null); }, [customer]);

  async function assign(e) {
    e.preventDefault();
    if (!customer || !rmId) return setMsg({ type: 'err', text: 'Choose a customer and a relationship manager' });
    setBusy(true);
    try {
      const { data } = await api.patch(`/customers/${customer.customer_id}/rm`, { employeeId: Number(rmId) });
      setMsg({ type: 'ok', text: data.message });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  async function closeAccount() {
    setBusy(true);
    try {
      const { data } = await api.patch(`/accounts/${accountId}/status`, { status: 'closed' });
      setMsg({ type: 'ok', text: data.message });
      accountsQ.reload();
      setAccountId('');
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false); setConfirm(false);
    }
  }

  const chosen = accounts.find((a) => String(a.account_id) === String(accountId));

  return (
    <>
      <PageHeader title="Branch control" subtitle="Assign a relationship manager, or close an account once its balance is zero." />
      <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
      <div className="grid cards">
        <form className="card form" onSubmit={assign} noValidate>
          <h3 className="section-title">Assign relationship manager</h3>
          <CustomerSearch selected={customer} onSelect={setCustomer} />
          <Field label="Relationship manager" htmlFor="rm-pick">
            <select id="rm-pick" value={rmId} onChange={(e) => setRmId(e.target.value)}>
              <option value="">Select</option>
              {(rms.data || []).map((r) => <option key={r.employee_id} value={r.employee_id}>{r.name}</option>)}
            </select>
          </Field>
          {rms.error && <Alert>{rms.error}</Alert>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Assign'}</button>
        </form>

        <div className="card form">
          <h3 className="section-title">Close an account</h3>
          {!customer ? <Empty title="Choose a customer" text="The same search is used for both actions." /> : accounts.length === 0 ? (
            <Empty title="Nothing to close" text="Open accounts at this branch will appear here. A closed account stays closed." />
          ) : (
            <>
              <Field label="Account" htmlFor="close-acc" hint="The balance must already be zero.">
                <select id="close-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">Select an account</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.account_type} · {fmtAccountNumber(a.account_number)} · {cap(a.status)}
                    </option>
                  ))}
                </select>
              </Field>
              {chosen && <p><StatusBadge status={chosen.status} /></p>}
              <button className="btn btn-primary" disabled={!accountId || busy} onClick={() => setConfirm(true)}>Close account</button>
            </>
          )}
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Close this account?"
          text="Closing is permanent. The balance must be zero."
          confirmLabel="Close account"
          danger busy={busy} onConfirm={closeAccount} onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}
