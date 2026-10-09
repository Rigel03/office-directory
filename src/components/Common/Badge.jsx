import React, { useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export function StatusBadge({ status }) {
  const s = (status || 'active').toLowerCase();
  if (s === 'active') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600 whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white mr-1.5"></span>
        Active
      </span>
    );
  }
  if (s === 'on leave') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-dashed border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-600 whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
        On Leave
      </span>
    );
  }
  if (s === 'detached') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-200 text-zinc-700 border border-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-500 whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mr-1.5"></span>
        Detached
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0">
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
      className="relative inline-flex items-center shrink-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        aria-label={problemText}
        className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 shadow-2xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-help"
      >
        <AlertTriangle className="w-3 h-3" />
      </button>

      {/* Floating Tooltip on Hover */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 whitespace-nowrap bg-zinc-950 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg border border-zinc-800 pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
          <AlertCircle className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
          <span>{problemText}</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
        </div>
      )}
    </div>
  );
}
