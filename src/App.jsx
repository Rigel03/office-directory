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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Internal Security Notice Banner for Viewers */}
      {!isAdmin && (
        <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-800 px-4 py-2 text-center text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500 dark:text-zinc-400" />
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
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Office Internal Employee Directory & Training Record System</span>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={toggleDemoMode}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              />
              <span>Demo mode (role switcher)</span>
            </label>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
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
