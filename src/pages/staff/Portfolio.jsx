import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Alert, Empty, PageHeader, TableSkeleton } from '../../components/ui';

export default function Portfolio() {
  const navigate = useNavigate();
  const { data, loading, error } = useFetch('/customers/portfolio');
  const rows = data || [];

  return (
    <>
      <PageHeader title="My customers" subtitle="People assigned to you as relationship manager." />
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <TableSkeleton /> : rows.length === 0 && !error ? (
        <Empty title="No customers yet" text="A branch manager assigns customers to you. You can also open an account for someone who has no relationship manager." />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table stack">
              <thead>
                <tr><th>Name</th><th>CNIC</th><th>Phone</th><th className="actions-col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.customer_id}>
                    <td data-label="Name"><strong>{c.name}</strong></td>
                    <td data-label="CNIC" className="mono">{c.cnic}</td>
                    <td data-label="Phone">{c.phone}</td>
                    <td className="actions-col">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/service', { state: { customer: c } })}>Service</button>
                    </td>
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
