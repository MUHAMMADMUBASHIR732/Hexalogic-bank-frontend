import { Link } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, Calculator, FileText, HandCoins, MapPin, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { Alert, CardSkeletons, Empty, StatusBadge } from '../../components/ui';
import { cap, fmtAccountNumber, pkr } from '../../utils/format';

const QUICK = [
  { to: '/transfer', icon: ArrowLeftRight, title: 'Transfer money', sub: 'Send funds instantly' },
  { to: '/loans', icon: HandCoins, title: 'My loans', sub: 'Track and repay' },
  { to: '/loans/apply', icon: Plus, title: 'Apply for a loan', sub: 'Submit a request' },
  { to: '/loans/emi', icon: Calculator, title: 'EMI calculator', sub: 'Plan your payments' },
];

const tone = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('current')) return 'tone-current';
  if (t.includes('fixed')) return 'tone-fixed';
  return 'tone-savings';
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Accounts() {
  const { username } = useAuth();
  const { data, loading, error, reload } = useFetch('/accounts');
  const accounts = data || [];
  const active = accounts.filter((a) => String(a.status).toLowerCase() === 'active').length;
  const joint = accounts.filter((a) => a.role === 'Joint').length;
  const stat = (n) => (loading && !data ? '—' : n);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{dateLabel.format(new Date())}</span>
          <h1>{greeting()}, {cap(username)}</h1>
          <p>Here is where your money stands today.</p>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Accounts</span><strong>{stat(accounts.length)}</strong></div>
          <div className="hero-stat"><span>Active</span><strong>{stat(active)}</strong></div>
          <div className="hero-stat"><span>Joint</span><strong>{stat(joint)}</strong></div>
        </div>
      </section>

      <div className="quick stagger">
        {QUICK.map(({ to, icon: Icon, title, sub }, i) => (
          <Link key={to} to={to} className="tile" style={{ '--i': i }}>
            <span className="tile-icon"><Icon size={19} aria-hidden="true" /></span>
            <span className="tile-text"><strong>{title}</strong><small>{sub}</small></span>
            <ArrowRight className="tile-arrow" size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="section-h">
        <h2>Your accounts</h2>
      </div>

      {error && (
        <Alert>
          {error} <button className="link-btn" onClick={reload}>Try again</button>
        </Alert>
      )}

      {loading && !data ? (
        <CardSkeletons n={2} />
      ) : accounts.length === 0 && !error ? (
        <Empty title="No accounts yet" text="Visit a branch and a teller will open your first account." />
      ) : (
        <div className="grid cards stagger">
          {accounts.map((a, i) => (
            <article className={`bank-card ${tone(a.account_type)}`} key={a.account_id} style={{ '--i': i }}>
              <div className="bank-face">
                <div className="bank-face-top">
                  <span className="bank-type">{a.account_type || 'Account'}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="bank-balance">{pkr(a.balance)}</div>
                <div className="bank-sub">Available balance</div>
                <div className="bank-number mono">{fmtAccountNumber(a.account_number)}</div>
              </div>
              <div className="bank-body">
                <dl className="meta">
                  <div><dt>Account ID</dt><dd>{a.account_id}</dd></div>
                  {a.role && <div><dt>Holder</dt><dd>{a.role === 'Joint' ? 'Joint holder' : 'Primary holder'}</dd></div>}
                  {a.branch_name && <div className="span-2"><dt>Branch</dt><dd><MapPin size={13} /> {a.branch_name}</dd></div>}
                </dl>
                <div className="card-actions">
                  <Link className="btn btn-ghost btn-sm" to={`/accounts/${a.account_id}/statement`}><FileText size={15} /> Statement</Link>
                  <Link className="btn btn-ghost btn-sm" to={`/transfer?from=${a.account_id}`}><ArrowLeftRight size={15} /> Transfer</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
