import React, { useState } from 'react';
import { Copy, Check, FileText, Table, Users, X } from 'lucide-react';

export function QuickCopyModal({ isOpen, onClose, selectedEmployees = [] }) {
  const [activeFormat, setActiveFormat] = useState('tsv');
  const [copied, setCopied] = useState(false);

  if (!isOpen || selectedEmployees.length === 0) return null;

  // Format 1: Plain list
  const getPlainList = () => {
    return selectedEmployees.map(e => e.full_name).join('\n');
  };

  // Format 2: Names + Positions
  const getNamesAndPositions = () => {
    return selectedEmployees
      .map(e => `${e.full_name} — ${e.position || '(No Position)'} (${e.unit || 'No Unit'})`)
      .join('\n');
  };

  // Format 3: Tab-Separated Table (perfect for Excel / Word table paste)
  const getTsvTable = () => {
    const headers = ['Full Name', 'Position', 'Unit / Division', 'Office Location', 'Email', 'Phone', 'Status'];
    const rows = selectedEmployees.map(e => [
      e.full_name,
      e.position || '',
      e.unit || '',
      e.location || '',
      e.email || '',
      e.phone || '',
      e.status || 'active'
    ].join('\t'));
    return [headers.join('\t'), ...rows].join('\n');
  };

  const getActiveText = () => {
    if (activeFormat === 'plain') return getPlainList();
    if (activeFormat === 'names_pos') return getNamesAndPositions();
    return getTsvTable();
  };

  const handleCopy = async () => {
    try {
      const text = getActiveText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-950 rounded-xl max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Copy Employee Records</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedEmployees.length} employee{selectedEmployees.length === 1 ? '' : 's'} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 flex gap-2 overflow-x-auto">
          <button
            onClick={() => { setActiveFormat('tsv'); setCopied(false); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeFormat === 'tsv'
                ? 'border-zinc-900 text-zinc-900 bg-zinc-100 dark:border-white dark:text-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <Table className="w-4 h-4 shrink-0" />
            Tab-Separated Table (for Word & Excel)
          </button>
          <button
            onClick={() => { setActiveFormat('names_pos'); setCopied(false); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeFormat === 'names_pos'
                ? 'border-zinc-900 text-zinc-900 bg-zinc-100 dark:border-white dark:text-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            Names + Positions
          </button>
          <button
            onClick={() => { setActiveFormat('plain'); setCopied(false); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeFormat === 'plain'
                ? 'border-zinc-900 text-zinc-900 bg-zinc-100 dark:border-white dark:text-white dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Plain List (Names only)
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {activeFormat === 'tsv' && 'Tab-Delimited Table Preview (pastes directly into table cells)'}
              {activeFormat === 'names_pos' && 'Standard Listing with Units'}
              {activeFormat === 'plain' && 'Plain Alphabetical Name List'}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              {selectedEmployees.length} lines
            </span>
          </div>

          <div className="relative">
            <pre className="p-4 bg-zinc-900 text-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-mono overflow-auto max-h-72 whitespace-pre leading-relaxed border border-zinc-800 selection:bg-white selection:text-black">
              {getActiveText()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Paste with <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded shadow-2xs font-mono text-zinc-800 dark:text-zinc-200">Ctrl+V</kbd> into Excel spreadsheets or Word documents.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className={`h-9 inline-flex items-center gap-2 px-4 text-xs font-semibold text-white rounded-lg shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                copied
                  ? 'bg-zinc-900 dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 border border-zinc-900 dark:border-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
