import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../utils/api';
import { TOKEN_EXPIRED_EVENT } from '../utils/api';

export type UserRole = 'Super Admin' | 'Admin' | 'Staff';

interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('hydroguard_user');
    const token = localStorage.getItem('hydroguard_token');
    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch {
        localStorage.removeItem('hydroguard_user');
        localStorage.removeItem('hydroguard_token');
      }
    }
  }, []);

  useEffect(() => {
    const handleTokenExpired = () => {
      setUser(null);
      localStorage.removeItem('hydroguard_user');
      localStorage.removeItem('hydroguard_token');

      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    };

    window.addEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);
    return () => window.removeEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.login(username, password);
      
      const userSession: User = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        role: response.user.role as UserRole,
        fullName: response.user.fullName,
        status: 'active',
      };
      
      setUser(userSession);
      localStorage.setItem('hydroguard_user', JSON.stringify(userSession));
      localStorage.setItem('hydroguard_token', response.token);
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hydroguard_user');
    localStorage.removeItem('hydroguard_token');
    // Optionally call the API logout endpoint
    authAPI.logout().catch(() => {
      // Ignore errors on logout
    });
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}