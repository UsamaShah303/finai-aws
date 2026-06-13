import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('finai_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('finai_darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  const [marketPreference, setMarketPreference] = useState(() => {
    const saved = localStorage.getItem('finai_market');
    return saved || 'both';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('finai_darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('finai_market', marketPreference);
  }, [marketPreference]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token, user: userData } = res.data;
      
      const enrichedUser = {
        ...userData,
        role: email === 'admin@finai.com' ? 'admin' : 'user',
        onboardingComplete: true
      };
      
      setUser(enrichedUser);
      localStorage.setItem('finai_user', JSON.stringify(enrichedUser));
      localStorage.setItem('token', token);
      return enrichedUser;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Invalid credentials. Please try again.";
      throw new Error(errMsg);
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post('/api/auth/register', { name, email, password });
      const { token, user: userData } = res.data;
      
      const enrichedUser = {
        ...userData,
        role: 'user',
        onboardingComplete: true
      };
      
      setUser(enrichedUser);
      localStorage.setItem('finai_user', JSON.stringify(enrichedUser));
      localStorage.setItem('token', token);
      return enrichedUser;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Registration failed. Please try again.";
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('finai_user');
    localStorage.removeItem('token');
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('finai_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user,
      darkMode,
      setDarkMode,
      marketPreference,
      setMarketPreference,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
