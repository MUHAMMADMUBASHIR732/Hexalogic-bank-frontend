import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { Alert, Empty, PageHeader, TableSkeleton } from '../../components/ui';
import { cap, fmtDate, fmtTime, MONTHS, pkr, txnInfo } from '../../utils/format';

const TABS = [
  { id: 'branch-summary', label: 'Branch summary' },
  { id: 'daily', label: 'Daily transactions' },
  { id: 'employee-activity', label: 'Employee activity' },
  { id: 'audit', label: 'Account history' },
];

function Table({ head, rows, render }) {
  return (
    <div className="card table-card">
      <div className="table-wrap">
        <table className="table stack">
          <thead><tr>{head.map(([h, num]) => <th key={h} className={num ? 'num' : ''}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(render)}</tbody>
        </table>
      </div>
    </div>
  );
}

// Plain CSS bars (display only). Bar length is scaled to the largest amount shown.
function DailyBars({ rows }) {
  const recent = rows.slice(0, 10);
  const max = Math.max(...recent.map((r) => Number(r.total_amount)), 1);
  return (
    <div className="card bars">
      <h3 className="section-title">Most recent days</h3>
      {recent.map((r, i) => {
        const t = txnInfo(r.txn_type);
        return (
          <div className="bar-row" key={`${r.txn_date}-${r.txn_type}`}>
            <span className="bar-label">{fmtDate(r.txn_date)} · {t.label}</span>
            <span className="bar-track">
              <span className={`bar-fill bar-${t.dir || 'none'}`} style={{ width: `${(Number(r.total_amount) / max) * 100}%`, '--i': i }} />
            </span>
            <span className="bar-value">{pkr(r.total_amount)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('branch-summary');
  const { data, loading, error } = useFetch(tab === 'audit' ? '/audit' : `/reports/${tab}`);
  const rows = data || [];

  return (
    <>
      <PageHeader title="Reports" subtitle="Figures come straight from the database views." />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}

      <div className="tab-body" key={tab}>
        {loading ? <TableSkeleton /> : rows.length === 0 && !error ? (
          <Empty title="No data yet" text="This report has no rows to show." />
        ) : tab === 'branch-summary' ? (
          <div className="grid cards stagger">
            {rows.map((r, i) => (
              <article className="card hoverable branch-card" key={r.branch_id} style={{ '--i': i }}>
                <div className="account-top">
                  <span className="eyebrow">Branch #{r.branch_id}</span>
                  <span className="tile-icon sm"><Building2 size={16} aria-hidden="true" /></span>
                </div>
                <h3>{r.branch_name}</h3>
                <div className="balance">{pkr(r.total_deposits ?? 0)}</div>
                <div className="muted small">Total deposits</div>
                <dl className="meta">
                  <div><dt>Accounts</dt><dd>{r.total_accounts}</dd></div>
                  <div><dt>Active loans</dt><dd>{r.active_loans}</dd></div>
                  <div className="span-2"><dt>Loan principal</dt><dd>{pkr(r.total_loan_principal ?? 0)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : tab === 'daily' ? (
          <>
            <DailyBars rows={rows} />
            <Table
              head={[['Date'], ['Type'], ['Transactions', 1], ['Total amount', 1]]}
              rows={rows}
              render={(r) => (
                <tr key={`${r.txn_date}-${r.txn_type}`}>
                  <td data-label="Date">{fmtDate(r.txn_date)}</td>
                  <td data-label="Type">{txnInfo(r.txn_type).label}</td>
                  <td data-label="Transactions" className="num">{r.total_transactions}</td>
                  <td data-label="Total amount" className="num strong">{pkr(r.total_amount)}</td>
                </tr>
              )}
            />
          </>
        ) : tab === 'audit' ? (
          <Table
            head={[['When'], ['Account'], ['Change'], ['From'], ['To']]}
            rows={rows}
            render={(r) => (
              <tr key={r.log_id}>
                <td data-label="When">{fmtDate(r.changed_at)} <span className="muted small">{fmtTime(r.changed_at)}</span></td>
                <td data-label="Account" className="mono">{r.account_number}</td>
                <td data-label="Change">{r.action === 'STATUS_CHANGE' ? 'Status' : 'Balance'}</td>
                <td data-label="From">{r.action === 'STATUS_CHANGE' ? cap(r.old_value) : pkr(r.old_value)}</td>
                <td data-label="To">{r.action === 'STATUS_CHANGE' ? cap(r.new_value) : pkr(r.new_value)}</td>
              </tr>
            )}
          />
        ) : (
          <Table
            head={[['Employee'], ['Month'], ['Transactions', 1], ['Total amount', 1]]}
            rows={rows}
            render={(r) => (
              <tr key={`${r.employee_id}-${r.transaction_year}-${r.transaction_month}`}>
                <td data-label="Employee"><strong>{r.employee_name}</strong></td>
                <td data-label="Month">{MONTHS[r.transaction_month - 1]} {r.transaction_year}</td>
                <td data-label="Transactions" className="num">{r.total_transactions}</td>
                <td data-label="Total amount" className="num strong">{pkr(r.total_amount)}</td>
              </tr>
            )}
          />
        )}
      </div>
    </>
  );
}
