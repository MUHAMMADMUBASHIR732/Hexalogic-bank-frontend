# Hexalogic Bank: React frontend

React (Vite) + React Router + Axios, built from *Banking_Frontend_React_Guide.pdf*.
Palette: `#EFF3F1` background, `#22333B` ink and sidebar, `#5E8B7E` accent, `#C7A17A` highlight.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

By default it runs in **demo mode** (`VITE_DEMO=true` in `.env`). A built-in demo API answers every
request in the browser, using the same routes, JSON and error messages as the guide, so no backend is needed.
Data is kept in `localStorage`; clear site data to reset it.

### Demo logins

| Role     | Username   | Password      |
|----------|------------|---------------|
| Customer | `ayesha`   | `password123` |
| Customer | `bilal`    | `password123` |
| Teller   | `teller1`  | `teller123`   |
| Manager  | `manager1` | `manager123`  |

(On the login page, the Customer / Teller / Manager chips fill these in for you.)

## Connect the real Express API

1. In `.env` set `VITE_DEMO=false` and `VITE_API_URL=http://localhost:8000`.
2. Add `http://localhost:5173` to the API's CORS list.
3. Restart `npm run dev`. Nothing else changes: `src/api/client.js` swaps the demo adapter for real HTTP calls.

### What the API must return (column names from `views.sql`)

| Screen | Route | Fields the UI reads |
|---|---|---|
| Accounts / Counter | `GET /accounts` | `account_id`, `account_number`, `balance`, `status`, `role`, `customer_id`, `customer_name`, `cnic`, `phone`; optional `account_type`, `branch_name` |
| Statement | `GET /accounts/:id/statement?from&to` | `transaction_id`, `txn_date`, `txn_type`, `amount`, `running_balance` |
| Loans | `GET /loans` | `loan_id`, `principal_amount`, `interest_rate`, `start_date`, `status`, `total_payments`, `total_amount_paid`, `remaining_balance`; optional `term_months` |
| Pending loans | `GET /loans/pending` | `loan_id`, `customer_name`, `cnic`, `phone`, `email`, `principal_amount`, `interest_rate` |
| Reports | `GET /reports/branch-summary`, `/daily`, `/employee-activity` | the columns of `v_branch_summary`, `v_daily_transactions`, `v_employee_activity` |
| Dropdowns | `GET /branches`, `/account-types`, `/customers?q=` | `branch_id, branch_name, city`; `account_type_id, type_name, min_balance`; `customer_id, cnic, name, phone` |

`txn_type` values understood: `Deposit`, `Withdrawal`, `Transfer_In`, `Transfer_Out` (and plain `Transfer`).
`v_customer_accounts` needs an `account_id` column (the guide notes this too).
Other routes used: `POST /auth/login|register`, `POST /transfers`, `POST /accounts`,
`POST /accounts/:id/deposit|withdraw|joint-holders|cards`, `PATCH /accounts/:id/status`,
`POST /loans`, `POST /loans/:id/payments|decision`, `GET /loans/emi`.
Errors must come back as `{ "error": "message" }`; the UI shows that text as it is.

## Structure

```
src/
  api/client.js        axios instance, token header, 401 redirect, errMsg
  api/demo.js          in-browser demo API (only used when VITE_DEMO=true)
  context/AuthContext  login, logout, role
  components/          Layout (sidebar + mobile drawer), Protected, ui (Alert, Modal, ...), CustomerSearch
  pages/               Login, Register, Statement
    customer/          Accounts, Transfer, Loans, ApplyLoan, EmiCalculator
    staff/             Counter, OpenAccount
    manager/           PendingLoans, Reports
  utils/format.js      money and date display helpers (display only, no money arithmetic)
  styles.css           design tokens, layout, responsive rules, motion
```

## Notes

- Hiding links by role is only for usability; the API and database enforce the real rules.
- Money is always a string; it is only formatted for display, never added or subtracted in JavaScript.
- Motion is subtle and switches off for users who prefer reduced motion.
- `npm run build` creates static files in `dist/`; set `VITE_API_URL` to the deployed API first.
