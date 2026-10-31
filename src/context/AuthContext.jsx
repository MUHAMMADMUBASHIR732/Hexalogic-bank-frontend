import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../api/client';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [username, setUsername] = useState(localStorage.getItem('username'));

  const value = useMemo(
    () => ({
      role,
      username,
      async login(user, password) {
        const { data } = await api.post('/auth/login', { username: user, password }); // { token, role }
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', user);
        setRole(data.role);
        setUsername(user);
        return data.role;
      },
      logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        setRole(null);
        setUsername(null);
      },
    }),
    [role, username],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
