import { useEffect, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';
import { api, errMsg } from '../api/client';
import { Alert } from './ui';

// Staff search box: type a CNIC, name or phone. Calls GET /customers?q=
export default function CustomerSearch({ selected, onSelect, label = 'Find customer', placeholder = 'CNIC, name or phone' }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRows([]); setSearched(false); setError(''); return undefined; }
    let live = true;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const { data } = await api.get('/customers', { params: { q: term } });
        if (live) { setRows(data); setSearched(true); setError(''); }
      } catch (e) {
        if (live) setError(errMsg(e));
      } finally {
        if (live) setBusy(false);
      }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  if (selected) {
    return (
      <div className="field">
        <label>{label}</label>
        <div className="picked">
          <span className="avatar sm" aria-hidden="true"><UserRound size={16} /></span>
          <span className="picked-meta">
            <strong>{selected.name}</strong>
            <small className="muted">CNIC {selected.cnic} · {selected.phone}</small>
          </span>
          <button type="button" className="icon-btn" onClick={() => { onSelect(null); setQ(''); }} aria-label="Choose another customer">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor="cust-search">{label}</label>
      <div className="input-icon">
        <Search size={17} aria-hidden="true" />
        <input id="cust-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" />
      </div>
      <Alert>{error}</Alert>
      {busy && <small className="muted">Searching…</small>}
      {!busy && searched && rows.length === 0 && <small className="muted">No customer found.</small>}
      {rows.length > 0 && (
        <ul className="results">
          {rows.map((c) => (
            <li key={c.customer_id}>
              <button type="button" onClick={() => onSelect(c)}>
                <span className="avatar sm" aria-hidden="true"><UserRound size={16} /></span>
                <span className="picked-meta">
                  <strong>{c.name}</strong>
                  <small className="muted">CNIC {c.cnic} · {c.phone}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
