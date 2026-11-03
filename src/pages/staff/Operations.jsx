import { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import CustomerSearch from '../../components/CustomerSearch';
import { Alert, ConfirmDialog, Empty, Field, PageHeader, StatusBadge, TableSkeleton } from '../../components/ui';
import { fmtAccountNumber, fmtDate, pkr, txnInfo } from '../../utils/format';
import { api, errMsg } from '../../api/client';

function HoldForm({ account, onResult }) {
  const [status, setStatus] = useState(String(account.status).toLowerCase() === 'closed' ? 'frozen' : String(account.status).toLowerCase());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = String(account.status).toLowerCase();

  async function apply() {
    setBusy(true);
    try {
      const { data } = await api.patch(`/accounts/${account.account_id}/status`, { status });
      onResult({ type: 'ok', text: data.message }, true);
    } catch (err) {
      onResult({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false); setConfirm(false);
    }
  }

  if (current === 'closed') return <Empty title="Account is closed" text="A closed account cannot be reopened from operations." />;

  return (
    <div className="form">
      <Field label="Hold" htmlFor="hold-status" hint="Freeze stops money movement. Unfreeze sets the account back to active. Closing is the branch manager's job.">
        <select id="hold-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
        </select>
      </Field>
      <button className="btn btn-primary" disabled={status === current} onClick={() => setConfirm(true)}>Update hold</button>
      {confirm && (
        <ConfirmDialog
          title={`${status === 'active' ? 'Reactivate' : 'Freeze'} this account?`}
          text={`Account ${fmtAccountNumber(account.account_number)} will be set to ${status}.`}
          confirmLabel={status === 'active' ? 'Reactivate' : 'Freeze'}
          danger={status !== 'active'} busy={busy} onConfirm={apply} onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

export default function Operations() {
  const [customer, setCustomer] = useState(null);
  const [selId, setSelId] = useState(null);
  const [msg, setMsg] = useState(null);
  const accountsQ = useFetch(customer ? '/accounts' : null);
  const daily = useFetch('/reports/daily');

  const accounts = (accountsQ.data || []).filter((a) => a.customer_id === customer?.customer_id);
  const sel = accounts.find((a) => a.account_id === selId) || null;
  const rows = (daily.data || []).slice(0, 8);

  useEffect(() => { setSelId(null); setMsg(null); }, [customer]);

  return (
    <>
      <PageHeader title="Operations" subtitle="Freeze or unfreeze an account at this branch, and read today's movement." />
      <div className="counter">
        <section className="card">
          <CustomerSearch selected={customer} onSelect={setCustomer} />
          {customer && (
            <>
              <h3 className="section-title">Accounts</h3>
              {accountsQ.error && <Alert>{accountsQ.error}</Alert>}
              {accountsQ.loading && !accountsQ.data ? <TableSkeleton rows={2} /> : accounts.length === 0 ? (
                <Empty title="No accounts here" text="This customer has no accounts at your branch." />
              ) : (
                <ul className="acc-list">
                  {accounts.map((a) => (
                    <li key={a.account_id}>
                      <button type="button" className={`acc-item ${a.account_id === selId ? 'selected' : ''}`} onClick={() => { setSelId(a.account_id); setMsg(null); }}>
                        <span className="acc-item-main">
                          <strong>{a.account_type || 'Account'}</strong>
                          <small className="mono muted">{fmtAccountNumber(a.account_number)}</small>
                        </span>
                        <span className="acc-item-side"><StatusBadge status={a.status} /></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
        <section className="card panel">
          {!sel ? (
            <Empty title={customer ? 'Select an account' : 'No customer selected'} text="Choose an account to freeze or unfreeze it." />
          ) : (
            <>
              <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
              <HoldForm key={sel.account_id} account={sel} onResult={(m, refresh) => { setMsg(m); if (refresh) accountsQ.reload(); }} />
            </>
          )}
        </section>
      </div>

      <h3 className="section-title" style={{ marginTop: 24 }}>Daily transactions</h3>
      {daily.error && <Alert>{daily.error}</Alert>}
      {daily.loading && !daily.data ? <TableSkeleton rows={4} /> : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table stack">
              <thead><tr><th>Date</th><th>Type</th><th className="num">Transactions</th><th className="num">Total amount</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.txn_date}-${r.txn_type}`}>
                    <td data-label="Date">{fmtDate(r.txn_date)}</td>
                    <td data-label="Type">{txnInfo(r.txn_type).label}</td>
                    <td data-label="Transactions" className="num">{r.total_transactions}</td>
                    <td data-label="Total amount" className="num strong">{pkr(r.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
