import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Stethoscope, Eye, EyeOff, Loader2 } from 'lucide-react';
import api, { adminApi } from '@/lib/axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isAdminLogin) {
        response = await adminApi.post('/login', { email, password });
      } else {
        response = await api.post('/auth/staff/login', { email, password });
      }

      const token = response.data.token;
      login(token);
      toast.success('Login successful');

      // Decode role to redirect
      const { jwtDecode } = await import('jwt-decode');
      const decoded = jwtDecode<{ role: string }>(token);
      if (decoded.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/staff/dashboard');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid credentials. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Stethoscope size={24} className="text-accent-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">DiagnosticMS</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          {/* Toggle */}
          <div className="flex mb-6 bg-muted rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setIsAdminLogin(false)}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${!isAdminLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => setIsAdminLogin(true)}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${isAdminLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              Admin Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
              Sign in
            </Button>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
