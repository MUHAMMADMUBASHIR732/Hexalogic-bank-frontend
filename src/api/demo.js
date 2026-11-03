// Demo API: an in-browser stand-in for the Express backend.
// It follows the contract in the build guide (same routes, same JSON, same error
// messages) so the real API can replace it by setting VITE_DEMO=false.
// Money is kept as integer paisa here and returned to the UI as strings like "1500.50".
import { AxiosError } from 'axios';

const KEY = 'demo_db_v4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- money helpers (integer paisa, no floating point) ---------- */
const toC = (s) => {
  const [a, b = ''] = String(s).split('.');
  return Number(a) * 100 + Number(b.padEnd(2, '0').slice(0, 2));
};
const fromC = (c) => `${Math.trunc(c / 100)}.${String(Math.abs(c % 100)).padStart(2, '0')}`;
const validMoney = (s) => typeof s === 'string' && /^\d{1,13}(\.\d{1,2})?$/.test(s) && toC(s) > 0;

/* ---------- seed data ---------- */
function buildSeed() {
  const db = {
    seq: { txn: 0, acc: 0, loan: 0, pay: 0, card: 0, cust: 0, user: 0, nominee: 0, audit: 0 },
    branches: [
      { branch_id: 1, branch_name: 'Main Branch', city: 'Karachi' },
      { branch_id: 2, branch_name: 'Gulberg Branch', city: 'Lahore' },
      { branch_id: 3, branch_name: 'F-7 Branch', city: 'Islamabad' },
    ],
    accountTypes: [
      { account_type_id: 1, type_name: 'Savings', min_balance_c: 100000 },
      { account_type_id: 2, type_name: 'Current', min_balance_c: 500000 },
      { account_type_id: 3, type_name: 'Fixed Deposit', min_balance_c: 5000000 },
    ],
    employees: [
      { employee_id: 1, name: 'Areeba Khan', designation: 'Teller', branch_id: 1 },
      { employee_id: 2, name: 'Usman Farooq', designation: 'Head Teller', branch_id: 1 },
      { employee_id: 3, name: 'Hina Javed', designation: 'Customer Service Officer', branch_id: 1 },
      { employee_id: 4, name: 'Sadia Noor', designation: 'Relationship Manager', branch_id: 1 },
      { employee_id: 5, name: 'Omar Siddiqui', designation: 'Loan Officer', branch_id: 1 },
      { employee_id: 6, name: 'Nadia Pervez', designation: 'Operations Manager', branch_id: 1 },
      { employee_id: 7, name: 'Imran Qureshi', designation: 'Manager', branch_id: 1 },
    ],
    users: [],
    customers: [],
    accounts: [],
    links: [],
    txns: [],
    loans: [],
    payments: [],
    cards: [],
    nominees: [],
    audit: [],
  };
  const addUser = (username, password, role, customer_id, employee_id) =>
    db.users.push({ user_id: ++db.seq.user, username, password, role, customer_id, employee_id });
  const addCustomer = (cnic, name, phone, email, rm = null) => {
    const c = { customer_id: ++db.seq.cust, cnic, name, phone, email, rm_employee_id: rm };
    db.customers.push(c);
    return c;
  };

  addUser('teller1', 'teller123', 'teller', null, 1);
  addUser('head1', 'head123', 'head_teller', null, 2);
  addUser('cso1', 'cso123', 'cso', null, 3);
  addUser('rm1', 'rm123', 'relationship_manager', null, 4);
  addUser('loan1', 'loan123', 'loan_officer', null, 5);
  addUser('ops1', 'ops123', 'operations_manager', null, 6);
  addUser('manager1', 'manager123', 'manager', null, 7);

  const ayesha = addCustomer('4210112345671', 'Ayesha Khan', '03001234567', 'ayesha@example.com', 4);
  const bilal = addCustomer('3520298765432', 'Bilal Ahmed', '03217654321', 'bilal@example.com', 4);
  const sana = addCustomer('6110155512349', 'Sana Malik', '03335550123', 'sana@example.com');
  addUser('ayesha', 'password123', 'customer', ayesha.customer_id, null);
  addUser('bilal', 'password123', 'customer', bilal.customer_id, null);
  addUser('sana', 'password123', 'customer', sana.customer_id, null);

  const num = (n) => String(4100000000000000 + n * 7919);
  const openAcc = (cust, branch, type, amount, date, emp = 1) => {
    const a = {
      account_id: ++db.seq.acc, account_number: num(db.seq.acc * 131), branch_id: branch,
      account_type_id: type, balance_c: 0, open_date: date.slice(0, 10), status: 'active',
    };
    db.accounts.push(a);
    db.links.push({ customer_id: cust.customer_id, account_id: a.account_id, role: 'Owner' });
    move(a, 'Deposit', amount, date, emp);
    return a;
  };
  const move = (acc, type, amount_c, date, emp, related = null) => {
    const before = acc.balance_c;
    const credit = type === 'Deposit' || type === 'Transfer_In';
    acc.balance_c += credit ? amount_c : -amount_c;
    db.txns.push({
      transaction_id: ++db.seq.txn, account_id: acc.account_id, related_account_id: related,
      employee_id: emp, txn_type: type, amount_c, txn_date: date, status: 'completed',
    });
    db.audit.push({
      log_id: ++db.seq.audit, account_id: acc.account_id, action: 'UPDATE',
      old_value: fromC(before), new_value: fromC(acc.balance_c), changed_at: date,
    });
  };
  const transfer = (from, to, amount_c, date, emp = null) => {
    move(from, 'Transfer_Out', amount_c, date, emp, to.account_id);
    move(to, 'Transfer_In', amount_c, date, emp, from.account_id);
  };

  const a1 = openAcc(ayesha, 1, 1, 15000000, '2026-07-06T10:12:00');
  const a2 = openAcc(ayesha, 1, 2, 8000000, '2026-07-20T11:40:00');
  const a3 = openAcc(bilal, 2, 1, 4500000, '2026-07-22T09:30:00');
  const a4 = openAcc(sana, 3, 1, 2500000, '2026-08-03T14:05:00');
  const a5 = openAcc(sana, 3, 3, 10000000, '2026-08-10T12:00:00', 3);
  db.links.push({ customer_id: bilal.customer_id, account_id: a1.account_id, role: 'Joint' });

  move(a1, 'Deposit', 2500000, '2026-08-14T10:20:00', 1);
  move(a1, 'Withdrawal', 750000, '2026-08-21T16:45:00', 1);
  transfer(a1, a3, 1200000, '2026-08-28T13:10:00');
  move(a3, 'Deposit', 800000, '2026-09-05T09:15:00', 1);
  transfer(a2, a1, 1000000, '2026-09-12T15:30:00');
  move(a4, 'Withdrawal', 300000, '2026-09-18T11:00:00', 1);
  transfer(a3, a4, 500000, '2026-09-25T17:20:00');
  move(a1, 'Deposit', 1800000, '2026-10-02T10:05:00', 1);
  move(a2, 'Withdrawal', 1500000, '2026-10-09T12:35:00', 2);
  transfer(a4, a1, 400000, '2026-10-15T14:50:00');
  move(a5, 'Deposit', 2000000, '2026-10-20T10:00:00', 2);
  move(a1, 'Deposit', 500000, new Date().toISOString().slice(0, 19), 1);

  db.cards.push({ card_id: ++db.seq.card, account_id: a1.account_id, card_number: '5300112233445566', card_type: 'debit', expiry_date: '2030-07-06' });
  db.nominees.push({ nominee_id: ++db.seq.nominee, customer_id: ayesha.customer_id, name: 'Raza Khan', relationship: 'Father', cnic: '4210111111111' });

  const loan = (cust, branch, principal_c, rate, term, status, start, approver, reviewer) =>
    db.loans.push({
      loan_id: ++db.seq.loan, customer_id: cust.customer_id, branch_id: branch, principal_c,
      interest_rate: rate, term_months: term, status, start_date: start, approved_by: approver, reviewed_by: reviewer,
    });
  loan(ayesha, 1, 50000000, '12.00', 24, 'approved', '2026-08-01', 7, null);
  loan(bilal, 1, 25000000, '12.00', 36, 'pending', null, null, null);
  loan(sana, 1, 12000000, '12.00', 12, 'recommended', null, null, 5);

  const pay = (loan_id, amount_c, remaining_c, date) =>
    db.payments.push({ payment_id: ++db.seq.pay, loan_id, payment_date: date, amount_c, remaining_c });
  pay(1, 2400000, 47600000, '2026-09-01');
  pay(1, 2400000, 45200000, '2026-10-01');
  return db;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable: fall through to a fresh database */ }
  return buildSeed();
}
let db = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } };
export function resetDemoData() { db = buildSeed(); save(); }

/* ---------- small helpers ---------- */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (m) => new HttpError(400, m);
const forbid = (m) => new HttpError(403, m);

const nowIso = () => new Date().toISOString().slice(0, 19);
const todayStr = () => new Date().toISOString().slice(0, 10);

const accountById = (id) => db.accounts.find((a) => a.account_id === Number(id));
const typeOf = (a) => db.accountTypes.find((t) => t.account_type_id === a.account_type_id);
const branchOf = (id) => db.branches.find((b) => b.branch_id === id);
const customerOf = (id) => db.customers.find((c) => c.customer_id === id);
const ownerOf = (a) => customerOf(db.links.find((l) => l.account_id === a.account_id && l.role === 'Owner')?.customer_id);

function me(config) {
  const h = config.headers;
  const auth = h?.Authorization ?? h?.get?.('Authorization');
  const id = Number(String(auth || '').replace('Bearer demo-', ''));
  const u = db.users.find((x) => x.user_id === id);
  if (!u) throw new HttpError(401, 'Session expired. Please log in again.');
  return u;
}
const CASH = ['teller', 'head_teller'];
const SERVICE = ['cso', 'relationship_manager'];
const BRANCH_STAFF = ['teller', 'head_teller', 'cso', 'operations_manager', 'manager'];
const TELLER_CAP = 50000000; // paisa, PKR 500,000

const employeeOf = (u) => db.employees.find((e) => e.employee_id === u.employee_id);
const requireRole = (u, roles, message) => { if (!roles.includes(u.role)) throw forbid(message); };
const sameBranch = (u, account) => {
  const e = employeeOf(u);
  if (!e || account.branch_id !== e.branch_id) throw forbid('This account is at another branch');
};
const cashOnly = (u) => requireRole(u, CASH, 'Only a teller can handle cash');
const serviceOnly = (u) => requireRole(u, SERVICE, 'Only customer service or a relationship manager can do this');

function assertPortfolio(u, customer) {
  if (u.role === 'relationship_manager' && customer.rm_employee_id !== u.employee_id) {
    throw forbid('This customer is not in your portfolio');
  }
}
const ownsAccount = (u, a) => {
  if (u.role === 'customer') {
    return db.links.some((l) => l.account_id === a.account_id && l.customer_id === u.customer_id);
  }
  if (u.role === 'relationship_manager') {
    const owner = ownerOf(a);
    return Boolean(owner && owner.rm_employee_id === u.employee_id);
  }
  if (BRANCH_STAFF.includes(u.role)) {
    const e = employeeOf(u);
    return Boolean(e && a.branch_id === e.branch_id);
  }
  return false;
};
const visibleLink = (u, link) => {
  const a = accountById(link.account_id);
  if (!a) return false;
  if (u.role === 'customer') return link.customer_id === u.customer_id;
  if (u.role === 'relationship_manager') {
    const owner = ownerOf(a);
    return Boolean(owner && owner.rm_employee_id === u.employee_id);
  }
  if (BRANCH_STAFF.includes(u.role)) {
    const e = employeeOf(u);
    return Boolean(e && a.branch_id === e.branch_id);
  }
  return false;
};

function needAccount(id) {
  const a = accountById(id);
  if (!a) throw new HttpError(404, 'Account does not exist');
  return a;
}
function logAudit(accountId, action, oldValue, newValue) {
  db.audit.push({
    log_id: ++db.seq.audit, account_id: accountId, action,
    old_value: String(oldValue), new_value: String(newValue), changed_at: nowIso(),
  });
}
function addTxn(a, type, amount_c, emp, related = null) {
  const before = a.balance_c;
  const credit = type === 'Deposit' || type === 'Transfer_In';
  a.balance_c += credit ? amount_c : -amount_c;
  db.txns.push({
    transaction_id: ++db.seq.txn, account_id: a.account_id, related_account_id: related,
    employee_id: emp, txn_type: type, amount_c, txn_date: nowIso(), status: 'completed',
  });
  logAudit(a.account_id, 'UPDATE', fromC(before), fromC(a.balance_c));
}
const maskCard = (n) => `•••• ${String(n).slice(-4)}`;
const cardRow = (c, mask) => ({
  card_id: c.card_id, account_id: c.account_id, card_type: c.card_type, expiry_date: c.expiry_date,
  card_number: mask ? maskCard(c.card_number) : c.card_number,
});
// One row per customer-account link, like the v_customer_accounts view (plus account_id).
function accountRow(a, link) {
  const t = typeOf(a);
  const c = customerOf(link.customer_id);
  return {
    account_id: a.account_id, account_number: a.account_number, account_type: t.type_name,
    branch_name: branchOf(a.branch_id).branch_name, primary_holder: ownerOf(a)?.name,
    customer_id: c.customer_id, customer_name: c.name, cnic: c.cnic, phone: c.phone, email: c.email,
    balance: fromC(a.balance_c), status: a.status, role: link.role,
    min_balance: fromC(t.min_balance_c), open_date: a.open_date,
  };
}
function emi(principal, rate, months) {
  const r = Number(rate) / 12 / 100;
  const p = Number(principal);
  if (!r) return (p / months).toFixed(2);
  const f = Math.pow(1 + r, months);
  return ((p * r * f) / (f - 1)).toFixed(2);
}
function loanRow(l) {
  const pays = db.payments.filter((p) => p.loan_id === l.loan_id);
  const last = pays[pays.length - 1];
  const paid = pays.reduce((s, p) => s + p.amount_c, 0);
  return {
    loan_id: l.loan_id, customer_name: customerOf(l.customer_id).name,
    principal_amount: fromC(l.principal_c), interest_rate: l.interest_rate, term_months: l.term_months,
    start_date: l.start_date, status: l.status, total_payments: pays.length,
    total_amount_paid: fromC(paid),
    remaining_balance: l.status === 'approved' || l.status === 'closed' ? fromC(last ? last.remaining_c : l.principal_c) : null,
  };
}

/* ---------- route handlers ---------- */
const routes = [];
const route = (method, pattern, fn) =>
  routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn });

route('get', '/health', () => ({ status: 'ok' }));

route('post', '/auth/login', ({ body }) => {
  const u = db.users.find((x) => x.username === String(body.username || '').trim() && x.password === body.password);
  if (!u) throw new HttpError(401, 'Invalid username or password');
  return { token: `demo-${u.user_id}`, role: u.role };
});

route('post', '/auth/register', ({ body }) => {
  const { cnic, name, phone, email, username, password } = body;
  if (!/^\d{13}$/.test(cnic || '')) throw bad('CNIC must be 13 digits, without dashes');
  if (!name || !phone || !email || !username) throw bad('All fields are required');
  if (!password || password.length < 8) throw bad('Password must be at least 8 characters');
  const dup = db.customers.some((c) => c.cnic === cnic || c.phone === phone || c.email === email)
    || db.users.some((x) => x.username === username);
  if (dup) throw bad('Already exists (CNIC, phone, email or username)');
  const c = { customer_id: ++db.seq.cust, cnic, name, phone, email, rm_employee_id: null };
  db.customers.push(c);
  db.users.push({ user_id: ++db.seq.user, username, password, role: 'customer', customer_id: c.customer_id, employee_id: null });
  return { message: 'Registration successful. You can log in now.' };
});

route('get', '/branches', () => db.branches.map(({ branch_id, branch_name, city }) => ({ branch_id, branch_name, city })));
route('get', '/account-types', () =>
  db.accountTypes.map((t) => ({ account_type_id: t.account_type_id, type_name: t.type_name, min_balance: fromC(t.min_balance_c) })));
const custBrief = ({ customer_id, cnic, name, phone }) => ({ customer_id, cnic, name, phone });
const canSearch = ['teller', 'head_teller', 'cso', 'relationship_manager', 'operations_manager', 'manager'];

route('get', '/customers/portfolio', ({ u }) => {
  requireRole(u, ['relationship_manager'], 'Only a relationship manager can view a portfolio');
  return db.customers.filter((c) => c.rm_employee_id === u.employee_id).map(custBrief);
});

route('get', '/customers', ({ u, query }) => {
  requireRole(u, canSearch, 'Only branch staff can search customers');
  const q = String(query.q || '').trim().toLowerCase();
  if (!q) return [];
  return db.customers
    .filter((c) => {
      if (u.role === 'relationship_manager' && c.rm_employee_id !== u.employee_id && c.rm_employee_id != null) return false;
      return c.cnic === q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    })
    .slice(0, 20).map(custBrief);
});

route('get', '/employees/relationship-managers', ({ u }) => {
  requireRole(u, ['manager'], 'Only a branch manager can assign a relationship manager');
  const e = employeeOf(u);
  return db.employees
    .filter((x) => x.designation === 'Relationship Manager' && x.branch_id === e.branch_id)
    .map(({ employee_id, name }) => ({ employee_id, name }));
});

route('patch', '/customers/:id/rm', ({ u, params, body }) => {
  requireRole(u, ['manager'], 'Only a branch manager can assign a relationship manager');
  const c = customerOf(Number(params.id));
  const rm = db.employees.find((e) => e.employee_id === Number(body.employeeId));
  const mgr = employeeOf(u);
  if (!c) throw bad('Customer not found');
  if (!rm || rm.designation !== 'Relationship Manager') throw bad('Choose a relationship manager');
  if (rm.branch_id !== mgr.branch_id) throw forbid('Relationship manager must belong to your branch');
  c.rm_employee_id = rm.employee_id;
  return { message: `${rm.name} is now the relationship manager for ${c.name}` };
});

route('get', '/customers/:id/nominees', ({ u, params }) => {
  serviceOnly(u);
  const c = customerOf(Number(params.id));
  if (!c) throw bad('Customer not found');
  assertPortfolio(u, c);
  return db.nominees.filter((n) => n.customer_id === c.customer_id);
});

route('post', '/customers/:id/nominees', ({ u, params, body }) => {
  serviceOnly(u);
  const c = customerOf(Number(params.id));
  if (!c) throw bad('Customer not found');
  assertPortfolio(u, c);
  if (!/^\d{13}$/.test(body.cnic || '')) throw bad('CNIC must be 13 digits');
  if (!String(body.name || '').trim() || !String(body.relationship || '').trim()) throw bad('Enter the nominee name and relationship');
  db.nominees.push({
    nominee_id: ++db.seq.nominee, customer_id: c.customer_id,
    name: String(body.name).trim(), relationship: String(body.relationship).trim(), cnic: body.cnic,
  });
  return { message: 'Nominee added' };
});

route('get', '/accounts', ({ u }) =>
  db.links.filter((l) => visibleLink(u, l)).map((l) => accountRow(accountById(l.account_id), l)));

route('post', '/accounts', ({ u, body }) => {
  serviceOnly(u);
  const c = customerOf(Number(body.customerId));
  const t = db.accountTypes.find((x) => x.account_type_id === Number(body.accountTypeId));
  const b = branchOf(Number(body.branchId));
  const e = employeeOf(u);
  if (!c || !t || !b) throw bad('Invalid customer, branch, or account type');
  if (!e || b.branch_id !== e.branch_id) throw forbid('Account must be opened at your branch');
  if (u.role === 'relationship_manager') {
    if (c.rm_employee_id != null && c.rm_employee_id !== u.employee_id) throw forbid('This customer is not in your portfolio');
    if (c.rm_employee_id == null) c.rm_employee_id = u.employee_id;
  }
  if (!validMoney(String(body.initialDeposit))) throw bad('Enter a valid amount');
  if (toC(body.initialDeposit) < t.min_balance_c) throw bad('Minimum balance violated');
  const a = {
    account_id: ++db.seq.acc, account_number: String(4100000000000000 + db.seq.acc * 7919 * 131 + db.txns.length * 13),
    branch_id: b.branch_id, account_type_id: t.account_type_id, balance_c: 0, open_date: todayStr(), status: 'active',
  };
  db.accounts.push(a);
  db.links.push({ customer_id: c.customer_id, account_id: a.account_id, role: 'Owner' });
  addTxn(a, 'Deposit', toC(body.initialDeposit), u.employee_id);
  return { message: 'Account opened successfully', account_id: a.account_id, account_number: a.account_number };
});

route('get', '/accounts/:id/statement', ({ u, params, query }) => {
  const a = needAccount(params.id);
  if (!ownsAccount(u, a)) throw forbid('This account does not belong to you');
  const from = query.from || '0000-01-01';
  const to = query.to || '9999-12-31';
  let running = 0;
  const rows = [];
  db.txns.filter((t) => t.account_id === a.account_id)
    .sort((x, y) => x.txn_date.localeCompare(y.txn_date) || x.transaction_id - y.transaction_id)
    .forEach((t) => {
      const reversed = (t.status || 'completed') === 'reversed';
      if (!reversed) running += t.txn_type === 'Deposit' || t.txn_type === 'Transfer_In' ? t.amount_c : -t.amount_c;
      const d = t.txn_date.slice(0, 10);
      if (d >= from && d <= to) {
        rows.push({
          account_number: a.account_number, transaction_id: t.transaction_id, txn_date: t.txn_date,
          txn_type: t.txn_type, amount: fromC(t.amount_c), running_balance: fromC(running),
          status: t.status || 'completed',
        });
      }
    });
  return rows;
});

route('post', '/transfers', ({ u, body }) => {
  const from = needAccount(body.fromAccount);
  const to = accountById(body.toAccount);
  if (!ownsAccount(u, from)) throw forbid('This account does not belong to you');
  if (!to) throw bad('Destination account does not exist');
  if (from.account_id === to.account_id) throw bad('Cannot transfer to the same account');
  if (from.status !== 'active' || to.status !== 'active') throw bad('Account is not active');
  if (!validMoney(body.amount)) throw bad('Enter a valid amount');
  const amt = toC(body.amount);
  if (u.role !== 'customer') {
    cashOnly(u);
    sameBranch(u, from);
    if (u.role === 'teller' && amt > TELLER_CAP) throw bad('Teller cash limit is 500000');
  }
  if (amt > from.balance_c || from.balance_c - amt < typeOf(from).min_balance_c) throw bad('Insufficient balance');
  const emp = u.role === 'customer' ? null : u.employee_id;
  addTxn(from, 'Transfer_Out', amt, emp, to.account_id);
  addTxn(to, 'Transfer_In', amt, emp, from.account_id);
  return { message: 'Funds transferred successfully' };
});

const cashRoute = (kind) => ({ u, params, body }) => {
  cashOnly(u);
  const a = needAccount(params.id);
  sameBranch(u, a);
  if (a.status !== 'active') throw bad('Account is not active');
  if (!validMoney(body.amount)) throw bad('Enter a valid amount');
  const amt = toC(body.amount);
  if (u.role === 'teller' && amt > TELLER_CAP) throw bad('Teller cash limit is 500000');
  if (kind === 'withdraw') {
    if (amt > a.balance_c) throw bad('Insufficient balance');
    if (a.balance_c - amt < typeOf(a).min_balance_c) throw bad('Minimum balance violated');
    addTxn(a, 'Withdrawal', amt, u.employee_id);
    return { message: 'Withdrawal successful', updated_balance: fromC(a.balance_c) };
  }
  addTxn(a, 'Deposit', amt, u.employee_id);
  return { message: 'Deposit successful', updated_balance: fromC(a.balance_c) };
};
route('post', '/accounts/:id/deposit', cashRoute('deposit'));
route('post', '/accounts/:id/withdraw', cashRoute('withdraw'));

route('get', '/accounts/:id/reversible', ({ u, params }) => {
  requireRole(u, ['head_teller'], 'Only a head teller can reverse cash');
  const a = needAccount(params.id);
  sameBranch(u, a);
  const today = todayStr();
  return db.txns
    .filter((t) => t.account_id === a.account_id && (t.status || 'completed') === 'completed'
      && t.txn_date.slice(0, 10) === today && (t.txn_type === 'Deposit' || t.txn_type === 'Withdrawal'))
    .map((t) => ({
      transaction_id: t.transaction_id, txn_type: t.txn_type, amount: fromC(t.amount_c), txn_date: t.txn_date,
    }));
});

route('post', '/transactions/:id/reverse', ({ u, params }) => {
  requireRole(u, ['head_teller'], 'Only a head teller can reverse cash');
  const t = db.txns.find((x) => x.transaction_id === Number(params.id));
  if (!t) throw new HttpError(404, 'Transaction not found');
  const a = needAccount(t.account_id);
  sameBranch(u, a);
  if ((t.status || 'completed') !== 'completed') throw bad('Transaction is already reversed');
  if (t.txn_type !== 'Deposit' && t.txn_type !== 'Withdrawal') throw bad('Only a cash deposit or withdrawal can be reversed');
  if (t.txn_date.slice(0, 10) !== todayStr()) throw bad('Only a same-day cash entry can be reversed');
  if (a.status !== 'active') throw bad('Account is not active');
  if (t.txn_type === 'Deposit') {
    const next = a.balance_c - t.amount_c;
    if (next < 0) throw bad('Insufficient balance');
    if (next < typeOf(a).min_balance_c) throw bad('Minimum balance violated');
  }
  const before = a.balance_c;
  a.balance_c += t.txn_type === 'Deposit' ? -t.amount_c : t.amount_c;
  t.status = 'reversed';
  logAudit(a.account_id, 'UPDATE', fromC(before), fromC(a.balance_c));
  return { message: 'Cash entry reversed', updated_balance: fromC(a.balance_c) };
});

route('get', '/cards', ({ u }) => {
  if (u.role !== 'customer') throw forbid('Only a customer can view their cards here');
  const ids = db.links.filter((l) => l.customer_id === u.customer_id).map((l) => l.account_id);
  return db.cards.filter((c) => ids.includes(c.account_id)).map((c) => cardRow(c, true));
});

route('get', '/nominees', ({ u }) => {
  if (u.role !== 'customer') throw forbid('Only a customer can view their nominees here');
  return db.nominees.filter((n) => n.customer_id === u.customer_id);
});

route('get', '/audit', ({ u }) => {
  requireRole(u, ['manager'], 'Only a branch manager can see the audit log');
  const e = employeeOf(u);
  return db.audit
    .map((row) => {
      const a = accountById(row.account_id);
      return a && a.branch_id === e.branch_id ? { ...row, account_number: a.account_number } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.changed_at.localeCompare(a.changed_at) || b.log_id - a.log_id)
    .slice(0, 100);
});

function guardServiceAccount(u, account) {
  serviceOnly(u);
  sameBranch(u, account);
  const owner = ownerOf(account);
  if (!owner) throw bad('Account not found');
  assertPortfolio(u, owner);
}

route('post', '/accounts/:id/joint-holders', ({ u, params, body }) => {
  const a = needAccount(params.id);
  guardServiceAccount(u, a);
  const c = customerOf(Number(body.customerId));
  if (!c) throw bad('Customer does not exist');
  if (db.links.some((l) => l.account_id === a.account_id && l.customer_id === c.customer_id))
    throw bad('Customer is already linked to this account');
  db.links.push({ customer_id: c.customer_id, account_id: a.account_id, role: 'Joint' });
  return { message: `${c.name} was added as a joint holder` };
});

route('get', '/accounts/:id/cards', ({ u, params }) => {
  const a = needAccount(params.id);
  guardServiceAccount(u, a);
  return db.cards.filter((c) => c.account_id === a.account_id).map((c) => cardRow(c, false));
});

route('post', '/accounts/:id/cards', ({ u, params, body }) => {
  const a = needAccount(params.id);
  guardServiceAccount(u, a);
  if (a.status !== 'active') throw bad('Account is not active');
  if (!['debit', 'credit'].includes(body.cardType)) throw bad('Choose a card type');
  const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 4);
  db.cards.push({
    card_id: ++db.seq.card, account_id: a.account_id, card_type: body.cardType,
    card_number: String(5300000000000000 + db.seq.card * 104729 + a.account_id * 31), expiry_date: expiry.toISOString().slice(0, 10),
  });
  return { message: `${body.cardType === 'credit' ? 'Credit' : 'Debit'} card issued successfully` };
});

route('patch', '/accounts/:id/status', ({ u, params, body }) => {
  requireRole(u, ['operations_manager', 'manager'], 'Only operations or a branch manager can change account status');
  const a = needAccount(params.id);
  sameBranch(u, a);
  if (body.status === 'closed' && u.role !== 'manager') throw forbid('Only a branch manager can close an account');
  if (!['active', 'frozen', 'closed'].includes(body.status)) throw bad('Invalid status');
  if (a.status === 'closed') throw bad('Account is not active');
  if (body.status === 'closed' && a.balance_c !== 0) throw bad('Account balance must be zero to close');
  const previous = a.status;
  a.status = body.status;
  logAudit(a.account_id, 'STATUS_CHANGE', previous, a.status);
  return { message: 'Account status updated successfully' };
});

route('get', '/loans/emi', ({ query }) => {
  const p = Number(query.principal), r = Number(query.rate), m = Number(query.months);
  if (!(p > 0) || !(r >= 0) || !(m > 0)) throw bad('Enter valid loan details');
  return { emi: emi(p, r, m) };
});

function loanQueue(u, status, role, message) {
  requireRole(u, [role], message);
  const e = employeeOf(u);
  return db.loans.filter((l) => l.status === status && l.branch_id === e.branch_id).map((l) => {
    const c = customerOf(l.customer_id);
    return {
      loan_id: l.loan_id, customer_id: c.customer_id, customer_name: c.name, cnic: c.cnic, phone: c.phone,
      email: c.email, principal_amount: fromC(l.principal_c), interest_rate: l.interest_rate,
      term_months: l.term_months, start_date: l.start_date, status: l.status,
    };
  });
}

route('get', '/loans/pending', ({ u }) => loanQueue(u, 'pending', 'loan_officer', 'Only a loan officer can review loans'));
route('get', '/loans/recommended', ({ u }) => loanQueue(u, 'recommended', 'manager', 'Only a branch manager can sanction loans'));

route('get', '/loans', ({ u }) => {
  if (u.role === 'customer') return db.loans.filter((l) => l.customer_id === u.customer_id).map(loanRow);
  const e = employeeOf(u);
  if (!e) return [];
  return db.loans.filter((l) => l.branch_id === e.branch_id).map(loanRow);
});

route('post', '/loans', ({ u, body }) => {
  if (u.role !== 'customer') throw forbid('Only customers can apply for loans');
  if (!branchOf(Number(body.branchId))) throw bad('Choose a branch');
  if (!validMoney(String(body.principal))) throw bad('Enter a valid amount');
  const term = Number(body.termMonths);
  if (!Number.isInteger(term) || term < 1 || term > 120) throw bad('Enter a valid term in months');
  db.loans.push({
    loan_id: ++db.seq.loan, customer_id: u.customer_id, branch_id: Number(body.branchId),
    principal_c: toC(body.principal), interest_rate: '12.00', term_months: term,
    status: 'pending', start_date: null, approved_by: null, reviewed_by: null,
  });
  return { message: 'Loan application submitted successfully' };
});

route('post', '/loans/:id/review', ({ u, params, body }) => {
  requireRole(u, ['loan_officer'], 'Only a loan officer can review loans');
  const l = db.loans.find((x) => x.loan_id === Number(params.id));
  const e = employeeOf(u);
  if (!l || l.status !== 'pending') throw bad('Loan is not pending');
  if (l.branch_id !== e.branch_id) throw forbid('This loan belongs to another branch');
  l.status = body.recommend ? 'recommended' : 'rejected';
  l.reviewed_by = u.employee_id;
  return { message: body.recommend ? 'Loan recommended for sanction' : 'Loan rejected' };
});

route('post', '/loans/:id/decision', ({ u, params, body }) => {
  requireRole(u, ['manager'], 'Only a branch manager can approve loans');
  const l = db.loans.find((x) => x.loan_id === Number(params.id));
  const e = employeeOf(u);
  if (!l || l.status !== 'recommended') throw bad('Loan is not recommended');
  if (l.branch_id !== e.branch_id) throw forbid('This loan belongs to another branch');
  l.status = body.approve ? 'approved' : 'rejected';
  l.approved_by = u.employee_id;
  l.start_date = body.approve ? todayStr() : null;
  return { message: body.approve ? 'Loan approved' : 'Loan rejected' };
});

route('post', '/loans/:id/payments', ({ u, params, body }) => {
  const l = db.loans.find((x) => x.loan_id === Number(params.id));
  if (!l || (u.role === 'customer' && l.customer_id !== u.customer_id)) throw forbid('This loan does not belong to you');
  const a = needAccount(body.fromAccountId);
  if (!ownsAccount(u, a)) throw forbid('This account does not belong to you');
  if (l.status !== 'approved') throw bad('Loan is not approved');
  if (a.status !== 'active') throw bad('Account is not active');
  if (!validMoney(body.amount)) throw bad('Enter a valid amount');
  const amt = toC(body.amount);
  if (amt > a.balance_c || a.balance_c - amt < typeOf(a).min_balance_c) throw bad('Insufficient balance');
  const pays = db.payments.filter((p) => p.loan_id === l.loan_id);
  const remainingBefore = pays.length ? pays[pays.length - 1].remaining_c : l.principal_c;
  if (amt > remainingBefore) throw bad('Payment exceeds the remaining loan balance');
  addTxn(a, 'Withdrawal', amt, null);
  db.payments.push({
    payment_id: ++db.seq.pay, loan_id: l.loan_id, payment_date: todayStr(), amount_c: amt, remaining_c: remainingBefore - amt,
  });
  if (remainingBefore - amt === 0) l.status = 'closed';
  return { message: remainingBefore - amt === 0 ? 'Final installment paid. Loan closed.' : 'Loan installment paid successfully' };
});

route('get', '/reports/till', ({ u }) => {
  requireRole(u, ['head_teller'], 'Only a head teller can see the till');
  const e = employeeOf(u);
  const today = todayStr();
  const cash = db.txns.filter((t) => {
    if ((t.status || 'completed') === 'reversed') return false;
    if (t.txn_date.slice(0, 10) !== today) return false;
    if (t.txn_type !== 'Deposit' && t.txn_type !== 'Withdrawal') return false;
    const actor = db.employees.find((x) => x.employee_id === t.employee_id);
    return actor && actor.branch_id === e.branch_id && (actor.designation === 'Teller' || actor.designation === 'Head Teller');
  });
  const sum = (type) => cash.filter((t) => t.txn_type === type).reduce((s, t) => s + t.amount_c, 0);
  return { txn_date: today, deposits: fromC(sum('Deposit')), withdrawals: fromC(sum('Withdrawal')), total_transactions: cash.length };
});

route('get', '/reports/branch-summary', ({ u }) => {
  requireRole(u, ['manager'], 'Only a branch manager can see this report');
  return db.branches.map((b) => {
    const accs = db.accounts.filter((a) => a.branch_id === b.branch_id);
    const loans = db.loans.filter((l) => l.branch_id === b.branch_id);
    return {
      branch_id: b.branch_id, branch_name: b.branch_name, total_accounts: accs.length,
      total_deposits: fromC(accs.reduce((s, a) => s + a.balance_c, 0)),
      active_loans: loans.filter((l) => l.status === 'approved').length,
      total_loan_principal: fromC(loans.reduce((s, l) => s + l.principal_c, 0)),
    };
  });
});

route('get', '/reports/daily', ({ u }) => {
  requireRole(u, ['manager', 'operations_manager'], 'Only operations or a branch manager can see the daily report');
  const g = {};
  db.txns.forEach((t) => {
    const k = `${t.txn_date.slice(0, 10)}|${t.txn_type}`;
    g[k] ??= { txn_date: t.txn_date.slice(0, 10), txn_type: t.txn_type, total_transactions: 0, total_c: 0 };
    g[k].total_transactions += 1; g[k].total_c += t.amount_c;
  });
  return Object.values(g)
    .sort((a, b) => b.txn_date.localeCompare(a.txn_date) || a.txn_type.localeCompare(b.txn_type))
    .map(({ total_c, ...r }) => ({ ...r, total_amount: fromC(total_c) }));
});

route('get', '/reports/employee-activity', ({ u }) => {
  requireRole(u, ['manager'], 'Only a branch manager can see this report');
  const g = {};
  db.txns.filter((t) => t.employee_id).forEach((t) => {
    const y = Number(t.txn_date.slice(0, 4)), m = Number(t.txn_date.slice(5, 7));
    const k = `${t.employee_id}|${y}|${m}`;
    const e = db.employees.find((x) => x.employee_id === t.employee_id);
    g[k] ??= { employee_id: e.employee_id, employee_name: e.name, transaction_year: y, transaction_month: m, total_transactions: 0, total_c: 0 };
    g[k].total_transactions += 1; g[k].total_c += t.amount_c;
  });
  return Object.values(g)
    .sort((a, b) => a.employee_id - b.employee_id || a.transaction_year - b.transaction_year || a.transaction_month - b.transaction_month)
    .map(({ total_c, ...r }) => ({ ...r, total_amount: fromC(total_c) }));
});

/* ---------- axios adapter ---------- */
const PUBLIC = ['/health', '/auth/login', '/auth/register'];

export async function demoAdapter(config) {
  await sleep(220 + Math.random() * 200);
  const method = (config.method || 'get').toLowerCase();
  const path = (config.url || '').split('?')[0].replace(/\/$/, '') || '/';
  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config, request: {} });
  const fail = (status, message) => {
    throw new AxiosError(message, status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, {}, respond(status, { error: message }));
  };
  try {
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = path.match(r.re);
      if (!m) continue;
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {};
      const u = PUBLIC.includes(path) ? null : me(config);
      const out = r.fn({ u, body, params: m.groups || {}, query: config.params || {} });
      save();
      return respond(200, out);
    }
    return fail(404, 'Route not found');
  } catch (e) {
    if (e instanceof AxiosError) throw e;
    if (e instanceof HttpError) return fail(e.status, e.message);
    console.error(e);
    return fail(500, 'Unexpected server error');
  }
}
