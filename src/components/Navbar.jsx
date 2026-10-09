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
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-950 dark:text-white tracking-tight">
                Staff Directory
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium -mt-0.5">
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
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-zinc-950' : 'text-zinc-400 dark:text-zinc-500'}`} />
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
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isDark ? 'Switch to light mode' : 'Switch to minimalist black & white dark mode'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-zinc-200" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-800" />
              )}
            </button>

            {/* Role Badge & Optional Demo Mode Switcher */}
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase ${
                isAdmin
                  ? 'bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700'
                  : 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
              }`}>
                {isAdmin ? <Shield className="w-3 h-3 text-zinc-900 dark:text-zinc-100" /> : <Eye className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />}
                {user?.role}
              </span>

              {/* Demo Mode Controls - only shown if Demo Mode is turned ON */}
              {demoMode && (
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md p-0.5 text-[10px]">
                  <span className="text-zinc-700 dark:text-zinc-300 font-bold px-1.5 uppercase">Demo:</span>
                  <button
                    onClick={() => quickSwitch(isAdmin ? 'viewer' : 'admin')}
                    className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-medium hover:bg-zinc-100 transition-colors cursor-pointer"
                    title={`Switch to ${isAdmin ? 'Viewer' : 'Admin'} mode`}
                  >
                    Switch to {isAdmin ? 'Viewer' : 'Admin'}
                  </button>
                </div>
              )}
            </div>

            {/* User pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">{user?.role} access</p>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-zinc-100 dark:border-zinc-800">
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
                    ? 'text-white bg-zinc-900 dark:text-zinc-900 dark:bg-white' 
                    : 'text-zinc-500 dark:text-zinc-400'
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
