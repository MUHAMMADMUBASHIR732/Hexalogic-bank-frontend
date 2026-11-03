import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Banknote, FileText, Undo2 } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import CustomerSearch from '../../components/CustomerSearch';
import { Alert, ConfirmDialog, Empty, Field, PageHeader, StatusBadge, TableSkeleton } from '../../components/ui';
import { fmtAccountNumber, fmtTime, isMoney, pkr } from '../../utils/format';

function MoneyForm({ account, kind, onResult }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const label = kind === 'deposit' ? 'Deposit' : 'Withdraw';

  async function submit(e) {
    e.preventDefault();
    if (!isMoney(amount)) return onResult({ type: 'err', text: 'Enter a valid amount' });
    setBusy(true);
    try {
      const { data } = await api.post(`/accounts/${account.account_id}/${kind}`, { amount });
      setAmount('');
      onResult({ type: 'ok', text: data.message }, true);
    } catch (err) {
      onResult({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label={`${label} amount`} htmlFor="cash-amt">
        <div className="input-prefix"><span>PKR</span>
          <input id="cash-amt" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoComplete="off" />
        </div>
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Processing…' : label}</button>
    </form>
  );
}

function ReverseList({ account, onResult }) {
  const list = useFetch(`/accounts/${account.account_id}/reversible`);
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = list.data || [];

  async function reverse() {
    setBusy(true);
    try {
      const { data } = await api.post(`/transactions/${ask.transaction_id}/reverse`);
      setAsk(null);
      list.reload();
      onResult({ type: 'ok', text: data.message }, true);
    } catch (err) {
      onResult({ type: 'err', text: errMsg(err) });
      setAsk(null);
    } finally {
      setBusy(false);
    }
  }

  if (list.loading && !list.data) return <TableSkeleton rows={2} />;
  if (list.error) return <Alert>{list.error}</Alert>;
  if (rows.length === 0) return <Empty title="Nothing to reverse" text="Only today's deposits and withdrawals can be undone." />;
  return (
    <div className="form">
      <ul className="acc-list">
        {rows.map((t) => (
          <li key={t.transaction_id}>
            <div className="acc-item">
              <span className="acc-item-main">
                <strong>{t.txn_type === 'Withdrawal' ? 'Withdrawal' : 'Deposit'}</strong>
                <small className="muted">{fmtTime(t.txn_date)} · {pkr(t.amount)}</small>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsk(t)}>Reverse</button>
            </div>
          </li>
        ))}
      </ul>
      {ask && (
        <ConfirmDialog
          title="Reverse this cash entry?"
          text={`${ask.txn_type === 'Withdrawal' ? 'Withdrawal' : 'Deposit'} of ${pkr(ask.amount)} will be undone and the balance put back.`}
          confirmLabel="Reverse entry"
          danger busy={busy} onConfirm={reverse} onCancel={() => setAsk(null)}
        />
      )}
    </div>
  );
}

export default function Counter() {
  const { role } = useAuth();
  const location = useLocation();
  const [customer, setCustomer] = useState(location.state?.customer || null);
  const [selId, setSelId] = useState(null);
  const [tab, setTab] = useState('deposit');
  const [msg, setMsg] = useState(null);
  const { data, loading, error, reload } = useFetch(customer ? '/accounts' : null);
  const till = useFetch(role === 'head_teller' ? '/reports/till' : null);

  const accounts = (data || []).filter((a) => a.customer_id === customer?.customer_id);
  const sel = accounts.find((a) => a.account_id === selId) || null;

  useEffect(() => { setSelId(null); setMsg(null); }, [customer]);
  useEffect(() => { if (!selId && accounts.length === 1) setSelId(accounts[0].account_id); /* eslint-disable-next-line */ }, [data]);

  const onResult = (m, refresh) => {
    setMsg(m);
    if (refresh) { reload(); till.reload(); }
  };

  return (
    <>
      <PageHeader
        title="Cash counter"
        subtitle={role === 'head_teller' ? 'Cash in and out, with no cap. A same-day cash entry can be reversed.' : 'Cash in and out. A teller can move up to PKR 500,000 in one transaction.'}
      />

      {role === 'head_teller' && (
        <div className="grid cards" style={{ marginBottom: 16 }}>
          <article className="card">
            <span className="eyebrow">Today&apos;s till</span>
            {till.error && <Alert>{till.error}</Alert>}
            {till.data && (
              <dl className="meta">
                <div><dt>Deposits</dt><dd>{pkr(till.data.deposits)}</dd></div>
                <div><dt>Withdrawals</dt><dd>{pkr(till.data.withdrawals)}</dd></div>
                <div className="span-2"><dt>Cash transactions</dt><dd>{till.data.total_transactions}</dd></div>
              </dl>
            )}
          </article>
        </div>
      )}

      <div className="counter">
        <section className="card">
          <CustomerSearch selected={customer} onSelect={setCustomer} />
          {customer && (
            <>
              <h3 className="section-title">Accounts at this branch</h3>
              {error && <Alert>{error}</Alert>}
              {loading && !data ? <TableSkeleton rows={2} /> : accounts.length === 0 ? (
                <Empty title="No accounts here" text="This customer has no accounts at your branch." />
              ) : (
                <ul className="acc-list">
                  {accounts.map((a) => (
                    <li key={a.account_id}>
                      <button className={`acc-item ${a.account_id === selId ? 'selected' : ''}`} onClick={() => { setSelId(a.account_id); setMsg(null); }}>
                        <span className="acc-item-main">
                          <strong>{a.account_type || 'Account'}</strong>
                          <small className="mono muted">{fmtAccountNumber(a.account_number)}</small>
                        </span>
                        <span className="acc-item-side">
                          <strong>{pkr(a.balance)}</strong>
                          <span><StatusBadge status={a.status} />{a.role === 'Joint' && <span className="badge badge-info">Joint</span>}</span>
                        </span>
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
            <Empty title={customer ? 'Select an account' : 'No customer selected'} text={customer ? 'Choose an account to deposit or withdraw.' : 'Search by CNIC, name or phone to begin.'} />
          ) : (
            <>
              <div className="panel-head">
                <div>
                  <span className="eyebrow">{sel.account_type} · ID {sel.account_id}</span>
                  <div className="balance">{pkr(sel.balance)}</div>
                  <small className="mono muted">{fmtAccountNumber(sel.account_number)}</small>
                </div>
                <Link to={`/accounts/${sel.account_id}/statement`} className="btn btn-ghost btn-sm"><FileText size={15} /> Statement</Link>
              </div>

              <div className="tabs" role="tablist">
                {['deposit', 'withdraw', ...(role === 'head_teller' ? ['reverse'] : [])].map((id) => (
                  <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setMsg(null); }}>
                    {id === 'reverse' ? <Undo2 size={15} /> : <Banknote size={15} />} {id === 'deposit' ? 'Deposit' : id === 'withdraw' ? 'Withdraw' : 'Reverse'}
                  </button>
                ))}
              </div>

              <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
              <div className="tab-body" key={`${sel.account_id}-${tab}`}>
                {(tab === 'deposit' || tab === 'withdraw') && <MoneyForm key={tab} account={sel} kind={tab} onResult={onResult} />}
                {tab === 'reverse' && <ReverseList account={sel} onResult={onResult} />}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
