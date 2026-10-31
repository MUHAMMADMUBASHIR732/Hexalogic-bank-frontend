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
import OpenAccount from './pages/staff/OpenAccount';
import PendingLoans from './pages/manager/PendingLoans';
import Reports from './pages/manager/Reports';

const CUSTOMER = ['customer'];
const STAFF = ['teller', 'manager'];
const MGR = ['manager'];

function Home() { // send each role to its start page
  const { role } = useAuth();
  return <Navigate to={role === 'customer' ? '/accounts' : '/counter'} replace />;
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
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/loans" element={<Protected roles={CUSTOMER}><Loans /></Protected>} />
            <Route path="/loans/apply" element={<Protected roles={CUSTOMER}><ApplyLoan /></Protected>} />
            <Route path="/loans/emi" element={<Protected roles={CUSTOMER}><EmiCalculator /></Protected>} />
            <Route path="/counter" element={<Protected roles={STAFF}><Counter /></Protected>} />
            <Route path="/open-account" element={<Protected roles={STAFF}><OpenAccount /></Protected>} />
            <Route path="/loans/pending" element={<Protected roles={MGR}><PendingLoans /></Protected>} />
            <Route path="/reports" element={<Protected roles={MGR}><Reports /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
