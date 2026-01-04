'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, User, Lock } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess?: (user: any, token: string) => void;
  onLoginError?: (error: string) => void;
}

export function LoginForm({ onLoginSuccess, onLoginError }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token in localStorage
        localStorage.setItem('auth_token', data.token);

        // Call success callback
        onLoginSuccess?.(data.user, data.token);

        // Redirect or update UI as needed
        window.location.reload();
      } else {
        const errorMessage = data.error || 'Login failed';
        setError(errorMessage);
        onLoginError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Network error. Please check your connection and try again.';
      setError(errorMessage);
      onLoginError?.(errorMessage);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Agent Team
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Secure access to your autonomous development platform
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <AlertDescription className="text-red-700 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">Default Credentials:</p>
              <p><strong>Username:</strong> admin</p>
              <p><strong>Password:</strong> secure-admin-2024</p>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              disabled={isLoading || !formData.username || !formData.password}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </CardFooter>
        </form>

        <div className="text-center pb-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Secured by enterprise-grade authentication
          </p>
        </div>
      </Card>
    </div>
  );
}

export default LoginForm;
