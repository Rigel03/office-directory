import React from 'react';
import {
  Users, Layers, Award, History, LogOut, Shield, Eye, Building2, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function Navbar({ activeTab, onSelectTab }) {
  const { user, isAdmin, logout, quickSwitch, demoMode } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Staff Directory
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                Internal Records & Training
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'directory', label: 'Directory', icon: Users },
              { id: 'groups', label: 'Divisions & Groups', icon: Layers },
              { id: 'training', label: 'Training & Reports', icon: Award },
              { id: 'audit', label: 'Audit Trail', icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile, Theme & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Role Badge & Optional Demo Mode Switcher */}
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase ${
                isAdmin
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
              }`}>
                {isAdmin ? <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                {user?.role}
              </span>

              {/* Demo Mode Controls - only shown if Demo Mode is turned ON */}
              {demoMode && (
                <div className="flex items-center bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-md p-0.5 text-[10px]">
                  <span className="text-purple-600 dark:text-purple-300 font-bold px-1.5 uppercase">Demo:</span>
                  <button
                    onClick={() => quickSwitch(isAdmin ? 'viewer' : 'admin')}
                    className="px-1.5 py-0.5 rounded bg-white dark:bg-purple-900 text-purple-700 dark:text-purple-200 shadow-2xs font-medium hover:bg-purple-100 transition-colors cursor-pointer"
                    title={`Switch to ${isAdmin ? 'Viewer' : 'Admin'} mode`}
                  >
                    Switch to {isAdmin ? 'Viewer' : 'Admin'}
                  </button>
                </div>
              )}
            </div>

            {/* User pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{user?.role} access</p>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'directory', label: 'Directory', icon: Users },
            { id: 'groups', label: 'Divisions & Groups', icon: Layers },
            { id: 'training', label: 'Training', icon: Award },
            { id: 'audit', label: 'Audit', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg ${
                  isActive 
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
