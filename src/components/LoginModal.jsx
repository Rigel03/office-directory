import React, { useState } from 'react';
import { Shield, Eye, Lock, User, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginModal() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (role) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('viewer');
      setPassword('viewer123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Banner */}
        <div className="p-8 text-center bg-zinc-900 text-white relative border-b border-zinc-800">
          <div className="w-14 h-14 bg-white text-zinc-950 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Office Staff Directory</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Internal Records & Quarterly Training System
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-[11px] font-medium text-zinc-300 border border-zinc-700">
            <Lock className="w-3 h-3 text-zinc-400" />
            Restricted Internal Access
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-start gap-2 text-xs text-zinc-900 dark:text-zinc-100">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-semibold rounded-lg text-sm transition-colors shadow-xs cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              {submitting ? 'Authenticating...' : 'Sign In to Directory'}
            </button>
          </form>

          {/* Quick Demo Credentials Fill */}
          <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-center mb-2.5">
              Testing & Evaluation Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-left transition-colors cursor-pointer group shrink-0"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                  <Shield className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  Admin / Editor
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">admin / admin123</p>
                <span className="text-[9px] text-zinc-900 dark:text-zinc-100 font-semibold group-hover:underline">
                  Click to fill & login &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('viewer')}
                className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-left transition-colors cursor-pointer group shrink-0"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                  <Eye className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  Viewer (Read-only)
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">viewer / viewer123</p>
                <span className="text-[9px] text-zinc-900 dark:text-zinc-100 font-semibold group-hover:underline">
                  Click to fill & login &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
