import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Mail, Lock, ShieldCheck, Eye, EyeOff, UserPlus } from 'lucide-react';

const LoginPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState('admin@crm.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl border p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground mx-auto mb-4 shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Nexus CRM</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your customer relations</p>
        </div>

        {location.state?.message && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
            {location.state.message}
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="email"
                required
                id="login-email"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type={showPass ? 'text' : 'password'}
                required
                id="login-password"
                className="w-full pl-10 pr-10 py-2.5 bg-muted/50 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="login-submit"
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><LogIn size={20} /> Sign In</>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Demo Credentials:</p>
          <p>Admin: <span className="font-mono">admin@crm.com</span> / <span className="font-mono">Admin@123</span></p>
          <p>Employee: <span className="font-mono">employee@crm.com</span> / <span className="font-mono">Emp@123</span></p>
        </div>

        <div className="mt-8 pt-6 border-t text-center space-y-4">
          <p className="text-sm text-muted-foreground">New to Nexus CRM?</p>
          <Link to="/register" 
            className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all active:scale-[0.98] border shadow-sm">
            <UserPlus size={20} /> Register as Admin
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
