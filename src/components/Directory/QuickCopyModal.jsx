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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Copy Employee Records</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedEmployees.length} employee{selectedEmployees.length === 1 ? '' : 's'} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => { setActiveFormat('tsv'); setCopied(false); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeFormat === 'tsv'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            Tab-Separated Table (for Word & Excel)
          </button>
          <button
            onClick={() => { setActiveFormat('names_pos'); setCopied(false); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeFormat === 'names_pos'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Names + Positions
          </button>
          <button
            onClick={() => { setActiveFormat('plain'); setCopied(false); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeFormat === 'plain'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Plain List (Names only)
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {activeFormat === 'tsv' && 'Tab-Delimited Table Preview (pastes directly into table cells)'}
              {activeFormat === 'names_pos' && 'Standard Listing with Units'}
              {activeFormat === 'plain' && 'Plain Alphabetical Name List'}
            </span>
            <span className="text-xs text-slate-400">
              {selectedEmployees.length} lines
            </span>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-72 whitespace-pre leading-relaxed border border-slate-800 selection:bg-indigo-500 selection:text-white">
              {getActiveText()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Paste with <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded shadow-2xs font-mono">Ctrl+V</kbd> into Excel spreadsheets or Word documents.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-lg shadow-xs transition-all cursor-pointer ${
                copied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
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
