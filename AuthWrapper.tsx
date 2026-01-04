'use client';

import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import { Loader2, Shield, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';

interface UserData {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);

  // Define protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/demo'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (isProtectedRoute) {
      checkAuthStatus();
    } else {
      setIsLoading(false);
    }
  }, [pathname, isProtectedRoute]);

  const checkAuthStatus = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        await attemptTokenRefresh();
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
          return;
        }
      }

      await attemptTokenRefresh();

    } catch (error) {
      console.error('Auth check error:', error);
      handleAuthFailure();
    } finally {
      setIsLoading(false);
    }
  };

  const attemptTokenRefresh = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user && data.token) {
          localStorage.setItem('auth_token', data.token);
          setUser(data.user);
          setIsAuthenticated(true);
          return;
        }
      }

      handleAuthFailure();
    } catch (error) {
      console.error('Token refresh error:', error);
      handleAuthFailure();
    }
  };

  const handleAuthFailure = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = (userData: UserData, token: string) => {
    localStorage.setItem('auth_token', token);
    setUser(userData);
    setIsAuthenticated(true);
    router.push('/dashboard');
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleAuthFailure();
      router.push('/');
    }
  };

  // For public routes, don't show loading or require auth
  if (!isProtectedRoute) {
    return (
      <div className="public-site">
        {/* Show login button for authenticated users on public pages */}
        {isAuthenticated && (
          <div className="fixed top-4 right-4 z-50">
            <div className="flex items-center space-x-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{user?.username}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Dashboard
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }

  // For protected routes, show loading and require auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-slate-600 dark:text-slate-400">Verifying authentication...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="authenticated-app">
      {/* Add logout button in top right */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center space-x-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">{user?.username}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="pb-4">
        {children}
      </div>
    </div>
  );
}

export default AuthWrapper;
