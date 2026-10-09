import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ isOpen, title, message, confirmText = 'Confirm', confirmVariant = 'danger', onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-950 rounded-xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${confirmVariant === 'danger' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{title}</h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/60 px-6 py-3.5 flex justify-end gap-2.5 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-transparent hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
              confirmVariant === 'danger'
                ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 border border-zinc-900 dark:border-white'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 border border-zinc-900 dark:border-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
