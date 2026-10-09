import React, { useState, useEffect } from 'react';
import {
  Columns3, ChevronLeft, ChevronRight, Check, X, RotateCcw
} from 'lucide-react';

export const ALL_COLUMNS = [
  { id: 'full_name', label: 'Employee', fixed: true, visible: true },
  { id: 'position', label: 'Position', fixed: false, visible: true },
  { id: 'unit', label: 'Unit / Division', fixed: false, visible: true },
  { id: 'status', label: 'Status', fixed: false, visible: true },
  { id: 'contact', label: 'Contact (Email/Ext)', fixed: false, visible: true },
  { id: 'last_verified_at', label: 'Last Verified', fixed: false, visible: true },
  { id: 'notes', label: 'Internal Notes', fixed: false, visible: false }
];

export function ColumnManager({ columns, onColumnsChange }) {
  const [showModal, setShowModal] = useState(false);

  const toggleColumn = (id) => {
    onColumnsChange(
      columns.map(c => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const moveColumn = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const copy = [...columns];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onColumnsChange(copy);
  };

  const resetDefaultColumns = () => {
    onColumnsChange(ALL_COLUMNS);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        title="Choose what columns to show and move table column order"
      >
        <Columns3 className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
        <span className="hidden sm:inline">Columns</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 rounded-xl max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Customize Table Columns
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-1.5 max-h-80 overflow-y-auto">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Check columns to show or hide, and use arrows to move their position left or right:
              </p>

              {columns.map((col, idx) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      disabled={col.fixed}
                      onChange={() => toggleColumn(col.id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`font-medium ${col.visible ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'}`}>
                      {col.label}
                    </span>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveColumn(idx, -1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                      title="Move column left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === columns.length - 1}
                      onClick={() => moveColumn(idx, 1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                      title="Move column right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={resetDefaultColumns}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Columns
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-8 px-4 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
