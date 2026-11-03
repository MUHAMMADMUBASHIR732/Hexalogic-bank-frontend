import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Protected from './components/Protected';
import Layout from './components/Layout';
import { Empty } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Statement from './pages/Statement';
import Accounts from './pages/customer/Accounts';
import Transfer from './pages/customer/Transfer';
import Loans from './pages/customer/Loans';
import ApplyLoan from './pages/customer/ApplyLoan';
import EmiCalculator from './pages/customer/EmiCalculator';
import Counter from './pages/staff/Counter';
import ServiceDesk from './pages/staff/ServiceDesk';
import OpenAccount from './pages/staff/OpenAccount';
import Portfolio from './pages/staff/Portfolio';
import LoanReview from './pages/staff/LoanReview';
import Operations from './pages/staff/Operations';
import PendingLoans from './pages/manager/PendingLoans';
import BranchControl from './pages/manager/BranchControl';
import Reports from './pages/manager/Reports';

const CUSTOMER = ['customer'];
const CASH = ['teller', 'head_teller'];
const SERVICE = ['cso', 'relationship_manager'];
const HOME = {
  customer: '/accounts',
  teller: '/counter',
  head_teller: '/counter',
  cso: '/service',
  relationship_manager: '/service',
  loan_officer: '/loans/review',
  operations_manager: '/operations',
  manager: '/reports',
};

function Home() {
  const { role } = useAuth();
  return <Navigate to={HOME[role] || '/accounts'} replace />;
}

function NotFound() {
  return (
    <Empty title="Page not found" text="The page you are looking for does not exist.">
      <Link to="/" className="btn btn-primary btn-sm">Go to start page</Link>
    </Empty>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<Home />} />
            <Route path="/accounts" element={<Protected roles={CUSTOMER}><Accounts /></Protected>} />
            <Route path="/accounts/:id/statement" element={<Statement />} />
            <Route path="/transfer" element={<Protected roles={[...CUSTOMER, ...CASH]}><Transfer /></Protected>} />
            <Route path="/loans" element={<Protected roles={CUSTOMER}><Loans /></Protected>} />
            <Route path="/loans/apply" element={<Protected roles={CUSTOMER}><ApplyLoan /></Protected>} />
            <Route path="/loans/emi" element={<Protected roles={CUSTOMER}><EmiCalculator /></Protected>} />
            <Route path="/counter" element={<Protected roles={CASH}><Counter /></Protected>} />
            <Route path="/service" element={<Protected roles={SERVICE}><ServiceDesk /></Protected>} />
            <Route path="/open-account" element={<Protected roles={SERVICE}><OpenAccount /></Protected>} />
            <Route path="/portfolio" element={<Protected roles={['relationship_manager']}><Portfolio /></Protected>} />
            <Route path="/loans/review" element={<Protected roles={['loan_officer']}><LoanReview /></Protected>} />
            <Route path="/loans/pending" element={<Protected roles={['manager']}><PendingLoans /></Protected>} />
            <Route path="/operations" element={<Protected roles={['operations_manager']}><Operations /></Protected>} />
            <Route path="/control" element={<Protected roles={['manager']}><BranchControl /></Protected>} />
            <Route path="/reports" element={<Protected roles={['manager']}><Reports /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
