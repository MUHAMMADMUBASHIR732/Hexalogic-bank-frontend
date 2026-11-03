import { useFetch } from '../../hooks/useFetch';
import { Alert, PageHeader } from '../../components/ui';

// Simple audit trail viewer: what triggers recorded, newest first.
export default function AuditLog() {
  const { data, loading, error } = useFetch('/admin/audit?limit=100');
  const rows = data || [];

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every balance and status change the triggers witnessed." />
      <div className="card">
        {error && <Alert>{error}</Alert>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No audit rows yet - make a deposit or transfer first.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>#</th><th>Table</th><th>Record</th><th>Action</th><th>Old → New</th><th>When</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.log_id}>
                    <td className="mono">{r.log_id}</td>
                    <td>{r.table_name}</td>
                    <td className="mono">{r.record_id}</td>
                    <td>{r.action}</td>
                    <td>
                      <span className="muted">{r.old_value ?? '—'}</span>
                      {' → '}
                      <strong>{r.new_value ?? '—'}</strong>
                    </td>
                    <td className="mono small">{String(r.changed_at).replace('T', ' ').slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">Written only by database triggers - the application itself has no write access to this table.</p>
      </div>
    </>
  );
}
