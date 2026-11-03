import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, BarChart3, Calculator, ClipboardCheck, ConciergeBell, HandCoins, LogOut, Menu, ShieldAlert, UserPlus, Users, Wallet, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Brand } from './ui';
import { roleLabel } from '../utils/format';

const LINKS = [
  { to: '/accounts', label: 'My accounts', icon: Wallet, roles: ['customer'] },
  { to: '/transfer', label: 'Transfer', icon: ArrowLeftRight, roles: ['customer', 'teller', 'head_teller'] },
  { to: '/loans', label: 'My loans', icon: HandCoins, roles: ['customer'], end: true },
  { to: '/loans/emi', label: 'EMI calculator', icon: Calculator, roles: ['customer'] },
  { to: '/counter', label: 'Counter', icon: ConciergeBell, roles: ['teller', 'head_teller'] },
  { to: '/service', label: 'Service desk', icon: ConciergeBell, roles: ['cso', 'relationship_manager'] },
  { to: '/open-account', label: 'Open account', icon: UserPlus, roles: ['cso', 'relationship_manager'] },
  { to: '/portfolio', label: 'My customers', icon: Users, roles: ['relationship_manager'] },
  { to: '/loans/review', label: 'Loan review', icon: ClipboardCheck, roles: ['loan_officer'] },
  { to: '/loans/pending', label: 'Sanction loans', icon: ClipboardCheck, roles: ['manager'] },
  { to: '/operations', label: 'Operations', icon: ShieldAlert, roles: ['operations_manager'] },
  { to: '/control', label: 'Branch control', icon: ShieldAlert, roles: ['manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['manager'] },
];

export default function Layout() {
  const { role, username, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const links = LINKS.filter((l) => l.roles.includes(role));
  const doLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
        <Brand />
        <span className="topbar-spacer" />
      </header>

      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-head">
          <Brand light />
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="nav-label">Menu</div>
        <nav className="nav">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">{(username || '?')[0].toUpperCase()}</span>
            <span className="user-meta">
              <strong>{username}</strong>
              <small>{roleLabel(role)}</small>
            </span>
          </div>
          <button className="icon-btn logout" onClick={doLogout} aria-label="Log out" title="Log out"><LogOut size={19} /></button>
        </div>
      </aside>

      <main className="main" id="main">
        <div className="page" key={pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
