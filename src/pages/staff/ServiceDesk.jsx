import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, FileText, UserPlus, Users } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import CustomerSearch from '../../components/CustomerSearch';
import { Alert, Empty, Field, PageHeader, StatusBadge, TableSkeleton } from '../../components/ui';
import { fmtAccountNumber, pkr } from '../../utils/format';

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
  const cards = useFetch(`/accounts/${account.account_id}/cards`);
  const [type, setType] = useState('debit');
  const [busy, setBusy] = useState(false);
  async function issue(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/accounts/${account.account_id}/cards`, { cardType: type });
      cards.reload();
      onResult({ type: 'ok', text: data.message });
    } catch (err) {
      onResult({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }
  const issued = cards.data || [];
  return (
    <form className="form" onSubmit={issue}>
      {cards.error && <Alert>{cards.error}</Alert>}
      {issued.length === 0 ? <p className="muted small">No card issued on this account yet.</p> : (
        <ul className="acc-list">
          {issued.map((c) => (
            <li key={c.card_id}>
              <div className="acc-item">
                <span className="acc-item-main"><strong>{c.card_type === 'credit' ? 'Credit' : 'Debit'}</strong><small className="mono muted">{c.card_number}</small></span>
                <span className="muted small">Exp {c.expiry_date}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
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

function NomineeForm({ customer, onResult }) {
  const nominees = useFetch(`/customers/${customer.customer_id}/nominees`);
  const [form, setForm] = useState({ name: '', relationship: '', cnic: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/customers/${customer.customer_id}/nominees`, form);
      setForm({ name: '', relationship: '', cnic: '' });
      nominees.reload();
      onResult({ type: 'ok', text: data.message });
    } catch (err) {
      onResult({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }
  const listed = nominees.data || [];
  return (
    <form className="form" onSubmit={submit} noValidate>
      {nominees.error && <Alert>{nominees.error}</Alert>}
      {listed.length === 0 ? <p className="muted small">No nominee recorded for this customer yet.</p> : (
        <ul className="acc-list">
          {listed.map((n) => (
            <li key={n.nominee_id}>
              <div className="acc-item">
                <span className="acc-item-main"><strong>{n.name}</strong><small className="muted">{n.relationship}</small></span>
                <span className="mono muted small">{n.cnic}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Field label="Nominee name" htmlFor="nom-name">
        <input id="nom-name" value={form.name} onChange={set('name')} autoComplete="off" />
      </Field>
      <Field label="Relationship" htmlFor="nom-rel">
        <input id="nom-rel" value={form.relationship} onChange={set('relationship')} placeholder="Spouse, parent, child" autoComplete="off" />
      </Field>
      <Field label="Nominee CNIC" htmlFor="nom-cnic" hint="13 digits, no dashes">
        <input id="nom-cnic" inputMode="numeric" maxLength={13} value={form.cnic} onChange={set('cnic')} autoComplete="off" />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add nominee'}</button>
    </form>
  );
}

const TABS = [
  { id: 'joint', label: 'Joint holder', icon: Users },
  { id: 'card', label: 'Issue card', icon: CreditCard },
  { id: 'nominee', label: 'Nominee', icon: UserPlus },
];

export default function ServiceDesk() {
  const location = useLocation();
  const [customer, setCustomer] = useState(location.state?.customer || null);
  const [selId, setSelId] = useState(null);
  const [tab, setTab] = useState('joint');
  const [msg, setMsg] = useState(null);
  const { data, loading, error, reload } = useFetch(customer ? '/accounts' : null);

  const accounts = (data || []).filter((a) => a.customer_id === customer?.customer_id);
  const sel = accounts.find((a) => a.account_id === selId) || null;

  useEffect(() => { setSelId(null); setMsg(null); }, [customer]);
  useEffect(() => { if (!selId && accounts.length === 1) setSelId(accounts[0].account_id); /* eslint-disable-next-line */ }, [data]);

  const onResult = (m, refresh) => { setMsg(m); if (refresh) reload(); };

  return (
    <>
      <PageHeader title="Service desk" subtitle="Open accounts, add a joint holder, issue a card, or record a nominee.">
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
                <Empty title="No accounts" text="This customer has no accounts you can service yet.">
                  <Link to="/open-account" state={{ customer }} className="btn btn-primary btn-sm">Open an account</Link>
                </Empty>
              ) : (
                <ul className="acc-list">
                  {accounts.map((a) => (
                    <li key={a.account_id}>
                      <button type="button" className={`acc-item ${a.account_id === selId ? 'selected' : ''}`} onClick={() => { setSelId(a.account_id); setMsg(null); }}>
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
          {!customer ? (
            <Empty title="No customer selected" text="Search by CNIC, name or phone to begin." />
          ) : (
            <>
              <div className="panel-head">
                <div>
                  <span className="eyebrow">{customer.name}</span>
                  <div className="balance" style={{ fontSize: '1.2rem' }}>{sel ? pkr(sel.balance) : 'Service'}</div>
                  {sel && <small className="mono muted">{fmtAccountNumber(sel.account_number)}</small>}
                </div>
                {sel && <Link to={`/accounts/${sel.account_id}/statement`} className="btn btn-ghost btn-sm"><FileText size={15} /> Statement</Link>}
              </div>

              <div className="tabs" role="tablist">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setMsg(null); }}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
              <div className="tab-body" key={`${customer.customer_id}-${sel?.account_id || 'none'}-${tab}`}>
                {tab === 'nominee' && <NomineeForm customer={customer} onResult={onResult} />}
                {tab !== 'nominee' && !sel && <Empty title="Select an account" text="Joint holders and cards belong to one account." />}
                {tab === 'joint' && sel && <JointForm account={sel} onResult={onResult} />}
                {tab === 'card' && sel && <CardForm account={sel} onResult={onResult} />}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
