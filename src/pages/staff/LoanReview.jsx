import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { api, errMsg } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { Alert, ConfirmDialog, Empty, PageHeader, TableSkeleton } from '../../components/ui';
import { pkr } from '../../utils/format';

export default function LoanReview() {
  const { data, loading, error: loadError, reload } = useFetch('/loans/pending');
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const loans = data || [];

  async function decide() {
    setBusy(true);
    try {
      const { data: res } = await api.post(`/loans/${ask.loan.loan_id}/review`, { recommend: ask.recommend });
      setMsg({ type: 'ok', text: `Loan #${ask.loan.loan_id}: ${res.message}` });
      reload();
    } catch (e) {
      setMsg({ type: 'err', text: errMsg(e) });
    } finally {
      setBusy(false); setAsk(null);
    }
  }

  return (
    <>
      <PageHeader title="Loan review" subtitle="Recommend a pending application for the branch manager, or reject it." />
      <Alert type={msg?.type} onClose={() => setMsg(null)}>{msg?.text}</Alert>
      {loadError && <Alert>{loadError}</Alert>}

      {loading && !data ? <TableSkeleton /> : loans.length === 0 && !loadError ? (
        <Empty title="All caught up" text="There are no pending applications at your branch." />
      ) : (
        <div className={`card table-card ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
          <div className="table-wrap">
            <table className="table stack">
              <thead>
                <tr><th>Loan</th><th>Customer</th><th>Contact</th><th className="num">Amount</th><th className="num">Rate</th><th className="num">Term</th><th className="actions-col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.loan_id}>
                    <td data-label="Loan">#{l.loan_id}</td>
                    <td data-label="Customer"><div><strong>{l.customer_name}</strong><div className="muted small">CNIC {l.cnic}</div></div></td>
                    <td data-label="Contact"><div><div>{l.phone}</div><div className="muted small">{l.email}</div></div></td>
                    <td data-label="Amount" className="num strong">{pkr(l.principal_amount)}</td>
                    <td data-label="Rate" className="num">{l.interest_rate}%</td>
                    <td data-label="Term" className="num">{l.term_months ? `${l.term_months} mo` : '—'}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => setAsk({ loan: l, recommend: true })}><Check size={15} /> Recommend</button>
                        <button className="btn btn-ghost btn-sm danger-text" disabled={loading} onClick={() => setAsk({ loan: l, recommend: false })}><X size={15} /> Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ask && (
        <ConfirmDialog
          title={ask.recommend ? 'Recommend this loan?' : 'Reject this loan?'}
          text={`${ask.loan.customer_name} applied for ${pkr(ask.loan.principal_amount)}. ${ask.recommend ? 'The branch manager will sanction it.' : 'The applicant will see it as rejected.'}`}
          confirmLabel={ask.recommend ? 'Recommend loan' : 'Reject loan'}
          danger={!ask.recommend} busy={busy} onConfirm={decide} onCancel={() => setAsk(null)}
        />
      )}
    </>
  );
}
