import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Route guard. Hiding things by role is only for usability: the API and the database enforce the real rules.
export default function Protected({ roles, children }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />; // not logged in
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />; // wrong role
  return children;
}
