import { useEffect, useRef } from 'react';
import { CircleAlert, CircleCheck, Inbox, X } from 'lucide-react';
import { cap } from '../utils/format';

export function Brand({ light = false, size = 34 }) {
  const bg = light ? '#EFF3F1' : '#22333B';
  const fg = light ? '#22333B' : '#EFF3F1';
  return (
    <span className={`brand ${light ? 'brand-light' : ''}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <polygon points="16,2 28.4,9 28.4,23 16,30 3.6,23 3.6,9" fill={bg} stroke={bg} strokeWidth="2" strokeLinejoin="round" />
        <path d="M11.8 10.8v10.4M20.2 10.8v10.4" stroke={fg} strokeWidth="2.3" strokeLinecap="round" />
        <path d="M11.8 16h8.4" stroke="#C7A17A" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
      <span className="brand-name">Hexalogic<span className="brand-sub"> Bank</span></span>
    </span>
  );
}

export function Alert({ type = 'err', children, onClose }) {
  if (!children) return null;
  const Icon = type === 'ok' ? CircleCheck : CircleAlert;
  return (
    <div className={`alert alert-${type}`} role={type === 'ok' ? 'status' : 'alert'}>
      <Icon size={18} aria-hidden="true" />
      <span className="alert-text">{children}</span>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Inbox size={22} /></span>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', style }) {
  return <span className="skeleton" style={{ height: h, width: w, ...style }} aria-hidden="true" />;
}

export function CardSkeletons({ n = 3 }) {
  return (
    <div className="grid cards" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div className="card" key={i}>
          <Skeleton h={14} w="40%" />
          <Skeleton h={28} w="70%" style={{ margin: '14px 0' }} />
          <Skeleton h={12} w="55%" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} h={18} style={{ margin: '14px 0' }} />
      ))}
    </div>
  );
}

const STATUS = {
  active: 'ok', approved: 'ok', closed: 'muted', frozen: 'warn', pending: 'warn', recommended: 'info', rejected: 'bad',
};
export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  return <span className={`badge badge-${STATUS[s] || 'muted'}`}>{cap(s)}</span>;
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input, select, button:not(.modal-x)')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, text, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      <p>{text}</p>
    </Modal>
  );
}
