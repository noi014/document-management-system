// src/context/AuthContext.tsx
'use client'; // This directive is necessary for client-side components in Next.js App Router

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useMemo,
  useCallback, // Added useCallback for memoizing functions
} from 'react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

// --- Interfaces ---
interface User {
  id: number;
  username: string;
  role: 'admin' | 'super_user' | 'user';
  department_id: number | null;
  department_name: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthContextProvider Component ---
export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUserFromLocalStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromLocalStorage();
  }, []);

  // Wrap login with useCallback
  const login = useCallback((userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    Swal.fire({
      icon: 'success',
      title: 'เข้าสู่ระบบสำเร็จ!',
      text: `ยินดีต้อนรับ, ${userData.username}!`,
      timer: 1500,
      showConfirmButton: false,
      position: 'top-end',
      toast: true,
    });
  }, []); // login depends only on setUser and setIsAuthenticated, which are stable functions provided by React.

  // Wrap logout with useCallback
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    Swal.fire({
      icon: 'info',
      title: 'ออกจากระบบแล้ว!',
      text: 'คุณได้ออกจากระบบเรียบร้อยแล้ว',
      timer: 1500,
      showConfirmButton: false,
      position: 'top-end',
      toast: true,
    }).then(() => {
      router.push('/auth/login');
    });
  }, [router]); // `router` is a dependency here because it's used inside `logout`

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }), [user, isAuthenticated, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
}