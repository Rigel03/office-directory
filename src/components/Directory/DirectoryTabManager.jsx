import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal, ChevronLeft, ChevronRight, Eye, EyeOff,
  Plus, Check, X, RotateCcw, ArrowUp, ArrowDown, Move
} from 'lucide-react';

const DEFAULT_TABS = [
  { id: 'all', label: 'All Staff', visible: true, filter: {} },
  { id: 'needs_review', label: 'Needs Review', visible: true, filter: { needsReview: true } },
  { id: 'active', label: 'Active Staff', visible: true, filter: { status: 'active' } },
  { id: 'on_leave', label: 'On Leave', visible: true, filter: { status: 'on leave' } },
  { id: 'detached', label: 'Detached', visible: false, filter: { status: 'detached' } },
  { id: 'unit_hr', label: 'Human Resources', visible: true, filter: { unit: 'Human Resources' } },
  { id: 'unit_ops', label: 'Operations', visible: true, filter: { unit: 'Operations Division' } },
  { id: 'unit_it', label: 'IT Services', visible: true, filter: { unit: 'IT Services' } },
  { id: 'unit_finance', label: 'Finance & Budget', visible: false, filter: { unit: 'Finance & Budget' } }
];

export function DirectoryTabManager({
  activeTabId,
  onSelectTab,
  units = [],
  groups = [],
  tabCounts = {}
}) {
  const [tabs, setTabs] = useState(() => {
    try {
      const saved = localStorage.getItem('directory_custom_tabs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TABS;
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newTabUnit, setNewTabUnit] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('directory_custom_tabs', JSON.stringify(tabs));
    } catch (e) {}
  }, [tabs]);

  const visibleTabs = tabs.filter(t => t.visible);

  const moveTab = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(index, 1);
    newTabs.splice(targetIndex, 0, moved);
    setTabs(newTabs);
  };

  const toggleTabVisibility = (id) => {
    setTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, visible: !t.visible } : t))
    );
  };

  const resetDefaultTabs = () => {
    setTabs(DEFAULT_TABS);
    onSelectTab(DEFAULT_TABS[0]);
  };

  const addUnitTab = (unitName) => {
    if (!unitName) return;
    const existing = tabs.find(t => t.filter?.unit === unitName);
    if (existing) {
      setTabs(prev =>
        prev.map(t => (t.id === existing.id ? { ...t, visible: true } : t))
      );
      onSelectTab(existing);
      setNewTabUnit('');
      return;
    }
    const newTab = {
      id: `unit_${Date.now()}`,
      label: unitName,
      visible: true,
      filter: { unit: unitName }
    };
    setTabs(prev => [...prev, newTab]);
    onSelectTab(newTab);
    setNewTabUnit('');
  };

  const removeCustomTab = (id) => {
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id && visibleTabs.length > 0) {
      onSelectTab(visibleTabs[0]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Tab Navigation Strip */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {visibleTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-indigo-700 text-indigo-100'
                      : tab.id === 'needs_review' && count > 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Customize Tabs Trigger */}
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex-shrink-0"
          title="Choose which tabs to show and rearrange tab order"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Customize Tabs</span>
        </button>
      </div>

      {/* MODAL: Customize & Reorder Directory Tabs */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Customize Directory Tabs
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which tabs appear on the directory bar and move them into your preferred order.
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Add Division Tab */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pin a Division / Unit as a Tab:
                </label>
                <div className="flex gap-2">
                  <select
                    value={newTabUnit}
                    onChange={(e) => setNewTabUnit(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Choose Division...</option>
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!newTabUnit}
                    onClick={() => addUnitTab(newTabUnit)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Tab
                  </button>
                </div>
              </div>

              {/* Tabs Re-ordering and Visibility List */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Active & Hidden Tabs (Drag or Move):
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {tabs.map((tab, idx) => (
                    <div
                      key={tab.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Checkbox visibility */}
                      <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={tab.visible}
                          onChange={() => toggleTabVisibility(tab.id)}
                          className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={`text-xs font-semibold ${
                          tab.visible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'
                        }`}>
                          {tab.label}
                        </span>
                        {tab.filter?.needsReview && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded">
                            Alerts
                          </span>
                        )}
                        {tab.filter?.unit && (
                          <span className="text-[10px] font-medium text-slate-400">
                            (Division)
                          </span>
                        )}
                      </label>

                      {/* Move controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveTab(idx, -1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move tab left / earlier"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === tabs.length - 1}
                          onClick={() => moveTab(idx, 1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move tab right / later"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Delete custom tab */}
                        {tab.id.startsWith('unit_') && (
                          <button
                            type="button"
                            onClick={() => removeCustomTab(tab.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded ml-1"
                            title="Remove tab"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={resetDefaultTabs}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
