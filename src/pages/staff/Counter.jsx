import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Banknote, CreditCard, FileText, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import CustomerSearch from '../../components/CustomerSearch';
import { Alert, ConfirmDialog, Empty, Field, PageHeader, StatusBadge, TableSkeleton } from '../../components/ui';
import { cap, fmtAccountNumber, isMoney, pkr } from '../../utils/format';

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
      onResult({ type: 'err', text: errMsg(err) }); // 'Account is not active', ...
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

function JointForm({ account, onResult }) {
  const [cust, setCust] = useState(null);
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    try {
      const { data } = await api.post(`/accounts/${account.account_id}/joint-holders`, { customerId: cust.customer_id });
      setCust(null);
      onResult({ type: 'ok', text: data.message }, true);
    } catch (err) {
      onResult({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form">
      <CustomerSearch label="Joint holder" selected={cust} onSelect={setCust} />
      <button className="btn btn-primary" onClick={add} disabled={!cust || busy}>{busy ? 'Adding…' : 'Add joint holder'}</button>
    </div>
  );
}

function CardForm({ account, onResult }) {
  const [type, setType] = useState('debit');
  const [busy, setBusy] = useState(false);
  async function issue(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/accounts/${account.account_id}/cards`, { cardType: type });
      onResult({ type: 'ok', text: data.message });
    } catch (err) {
      onResult({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={issue}>
      <Field label="Card type" htmlFor="card-type">
        <select id="card-type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="debit">Debit card</option>
          <option value="credit">Credit card</option>
        </select>
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Issuing…' : 'Issue card'}</button>
    </form>
  );
}

function StatusForm({ account, onResult }) {
  const [status, setStatus] = useState(String(account.status).toLowerCase());
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
  return (
    <div className="form">
      <Field label="Account status" htmlFor="acc-status" hint="Closing needs a zero balance. Frozen accounts cannot send or receive money.">
        <select id="acc-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
          <option value="closed">Closed</option>
        </select>
      </Field>
      <button className="btn btn-primary" disabled={status === current} onClick={() => setConfirm(true)}>Update status</button>
      {confirm && (
        <ConfirmDialog
          title={`${status === 'active' ? 'Reactivate' : cap(status)} this account?`}
          text={`Account ${fmtAccountNumber(account.account_number)} will be set to ${status}.`}
          confirmLabel={`Yes, ${status === 'active' ? 'reactivate' : status === 'frozen' ? 'freeze' : 'close'}`}
          danger={status !== 'active'} busy={busy} onConfirm={apply} onCancel={() => setConfirm(false)}
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

  const accounts = (data || []).filter((a) => a.customer_id === customer?.customer_id);
  const sel = accounts.find((a) => a.account_id === selId) || null;

  useEffect(() => { setSelId(null); setMsg(null); }, [customer]);
  useEffect(() => { if (!selId && accounts.length === 1) setSelId(accounts[0].account_id); /* eslint-disable-next-line */ }, [data]);

  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: Banknote },
    { id: 'withdraw', label: 'Withdraw', icon: Banknote },
    { id: 'joint', label: 'Joint holder', icon: Users },
    { id: 'card', label: 'Issue card', icon: CreditCard },
    ...(role === 'manager' ? [{ id: 'status', label: 'Status', icon: ShieldAlert }] : []),
  ];

  const onResult = (m, refresh) => { setMsg(m); if (refresh) reload(); };

  return (
    <>
      <PageHeader title="Counter" subtitle="Find a customer, then work on one of their accounts.">
        <Link to="/open-account" state={{ customer }} className="btn btn-ghost"><UserPlus size={17} /> Open account</Link>
      </PageHeader>

      <div className="counter">
        <section className="card">
          <CustomerSearch selected={customer} onSelect={setCustomer} />
          {customer && (
            <>
              <h3 className="section-title">Accounts</h3>
              {error && <Alert>{error}</Alert>}
              {loading && !data ? <TableSkeleton rows={2} /> : accounts.length === 0 ? (
                <Empty title="No accounts" text="This customer has no accounts yet.">
                  <Link to="/open-account" state={{ customer }} className="btn btn-primary btn-sm">Open an account</Link>
                </Empty>
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
            <Empty title={customer ? 'Select an account' : 'No customer selected'} text={customer ? 'Choose one of the accounts to deposit, withdraw or manage it.' : 'Search by CNIC, name or phone to begin.'} />
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
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setMsg(null); }}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
              <div className="tab-body" key={`${sel.account_id}-${tab}`}>
                {(tab === 'deposit' || tab === 'withdraw') && <MoneyForm key={tab} account={sel} kind={tab} onResult={onResult} />}
                {tab === 'joint' && <JointForm account={sel} onResult={onResult} />}
                {tab === 'card' && <CardForm account={sel} onResult={onResult} />}
                {tab === 'status' && <StatusForm key={sel.account_id} account={sel} onResult={onResult} />}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
