import React, { useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export function StatusBadge({ status }) {
  const s = (status || 'active').toLowerCase();
  if (s === 'active') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
        Active
      </span>
    );
  }
  if (s === 'on leave') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
        On Leave
      </span>
    );
  }
  if (s === 'detached') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
        Detached
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {status}
    </span>
  );
}

export function ReviewBadge({ missingPos, missingUnit }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const parts = [];
  if (missingPos) parts.push('Position');
  if (missingUnit) parts.push('Unit / Division');
  
  const problemText = parts.length > 0 
    ? `Missing ${parts.join(' & ')}`
    : 'Missing required office information';

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        aria-label={problemText}
        className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 shadow-2xs hover:scale-110 transition-transform cursor-help animate-pulse"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
      </button>

      {/* Floating Tooltip on Hover */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 whitespace-nowrap bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <span>{problemText}</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
