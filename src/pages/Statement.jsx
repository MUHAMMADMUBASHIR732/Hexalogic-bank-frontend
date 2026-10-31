import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { api, errMsg } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { Alert, Empty, Field, PageHeader, StatusBadge, TableSkeleton } from '../components/ui';
import { fmtAccountNumber, fmtDate, fmtTime, pkr, today, txnInfo } from '../utils/format';

// Shared by all roles. Columns come from v_account_statement.
export default function Statement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [range, setRange] = useState({ from: '2024-01-01', to: today() });
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const accounts = useFetch('/accounts');
  const account = accounts.data?.find((a) => String(a.account_id) === String(id));

  async function load(r = range) {
    setLoading(true);
    try {
      const { data } = await api.get(`/accounts/${id}/statement`, { params: r });
      setRows(data); setError('');
    } catch (e) {
      setError(errMsg(e)); setRows(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const invalid = range.from > range.to;
  const shown = rows ? [...rows].reverse() : []; // newest first

  return (
    <>
      <button type="button" className="back" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
      <PageHeader
        title="Account statement"
        subtitle={account ? `${account.account_type || 'Account'} · ${fmtAccountNumber(account.account_number)}` : undefined}
      >
        {account && (
          <div className="pill-stat">
            <span className="muted">Balance</span>
            <strong>{pkr(account.balance)}</strong>
            <StatusBadge status={account.status} />
          </div>
        )}
      </PageHeader>

      {rows && rows.length > 0 && (
        <div className="stat-row">
          <div className="stat"><span>Transactions</span><strong>{rows.length}</strong></div>
          <div className="stat"><span>Credits</span><strong className="in">{rows.filter((r) => txnInfo(r.txn_type).dir === 'in').length}</strong></div>
          <div className="stat"><span>Debits</span><strong>{rows.filter((r) => txnInfo(r.txn_type).dir === 'out').length}</strong></div>
        </div>
      )}

      <form className="card filters" onSubmit={(e) => { e.preventDefault(); if (!invalid) load(); }}>
        <Field label="From" htmlFor="from">
          <input id="from" type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </Field>
        <Field label="To" htmlFor="to">
          <input id="to" type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
        <button className="btn btn-primary" disabled={loading || invalid}>{loading ? 'Loading…' : 'Show'}</button>
      </form>

      {invalid && <Alert>The start date must be before the end date.</Alert>}
      {error && <Alert>{error}</Alert>}

      {loading && !rows ? (
        <TableSkeleton />
      ) : rows && rows.length === 0 ? (
        <Empty title="No transactions" text="There are no transactions in this date range." />
      ) : rows ? (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table stack">
              <thead>
                <tr><th>Date</th><th>Type</th><th className="num">Amount</th><th className="num">Balance</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const t = txnInfo(r.txn_type);
                  return (
                    <tr key={r.transaction_id}>
                      <td data-label="Date"><span>{fmtDate(r.txn_date)} <span className="muted small">{fmtTime(r.txn_date)}</span></span></td>
                      <td data-label="Type">
                        <span className={`txn txn-${t.dir || 'none'}`}>
                          {t.dir === 'in' && <ArrowDownLeft size={15} />}
                          {t.dir === 'out' && <ArrowUpRight size={15} />}
                          {t.label}
                        </span>
                      </td>
                      <td data-label="Amount" className={`num amount-${t.dir || 'none'}`}>
                        {t.dir === 'in' ? '+' : t.dir === 'out' ? '−' : ''}{pkr(r.amount)}
                      </td>
                      <td data-label="Balance" className="num strong">{pkr(r.running_balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-foot muted small">{rows.length} transaction{rows.length === 1 ? '' : 's'}</div>
        </div>
      ) : null}
    </>
  );
}
