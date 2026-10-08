import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ isOpen, title, message, confirmText = 'Confirm', confirmVariant = 'danger', onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${confirmVariant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-3.5 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer shadow-xs ${
              confirmVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
