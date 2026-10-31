// Display helpers only. Never do arithmetic on money in JavaScript; send amounts as strings.
const money = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' });

export const pkr = (v) => (v === null || v === undefined || v === '' ? '—' : money.format(Number(v)));

export const isMoney = (v) => /^\d{1,13}(\.\d{1,2})?$/.test(v) && Number(v) > 0;

export const today = () => new Date().toISOString().slice(0, 10);

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export const fmtDate = (v) => (v ? dateFmt.format(new Date(v)) : '—');
export const fmtTime = (v) => (v ? timeFmt.format(new Date(v)) : '');

// 4100000000001234 -> 4100 0000 0000 1234
export const fmtAccountNumber = (n) => String(n ?? '').replace(/(.{4})/g, '$1 ').trim();

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TXN = {
  Deposit: { label: 'Deposit', dir: 'in' },
  Withdrawal: { label: 'Withdrawal', dir: 'out' },
  Transfer_In: { label: 'Transfer in', dir: 'in' },
  Transfer_Out: { label: 'Transfer out', dir: 'out' },
  Transfer: { label: 'Transfer', dir: null },
};
export const txnInfo = (t) => TXN[t] || { label: String(t).replace(/_/g, ' '), dir: null };
