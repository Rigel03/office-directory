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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-800/20 overflow-hidden">
        {/* Banner */}
        <div className="p-8 text-center bg-slate-900 text-white relative">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Office Staff Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Internal Records & Quarterly Training System
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700">
            <Lock className="w-3 h-3 text-indigo-400" />
            Restricted Internal Access
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In to Directory'}
            </button>
          </form>

          {/* Quick Demo Credentials Fill */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Testing & Evaluation Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  Admin / Editor
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">admin / admin123</p>
                <span className="text-[9px] text-indigo-600 font-medium group-hover:underline">
                  Click to fill & login &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('viewer')}
                className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  Viewer (Read-only)
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">viewer / viewer123</p>
                <span className="text-[9px] text-amber-600 font-medium group-hover:underline">
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
