import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { DirectoryView } from './components/Directory/DirectoryView';
import { GroupsView } from './components/Groups/GroupsView';
import { TrainingView } from './components/Training/TrainingView';
import { AuditView } from './components/Audit/AuditView';
import { LoginModal } from './components/LoginModal';
import { ShieldCheck, Info } from 'lucide-react';

function MainApp() {
  const { user, loading, isAdmin, demoMode, toggleDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState('directory');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Loading Office Directory...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Internal Security Notice Banner for Viewers */}
      {!isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            You are signed in as <strong>Viewer (Jordan Lee)</strong> with read-only access. You can search, filter, copy, and export records.
          </span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'directory' && <DirectoryView onNavigateToUnits={() => setActiveTab('groups')} />}
        {activeTab === 'groups' && <GroupsView />}
        {activeTab === 'training' && <TrainingView />}
        {activeTab === 'audit' && <AuditView />}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Office Internal Employee Directory & Training Record System</span>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={toggleDemoMode}
                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Demo mode (role switcher)</span>
            </label>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Authenticated Internal Intranet
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
