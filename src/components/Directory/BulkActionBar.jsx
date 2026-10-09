import React, { useState } from 'react';
import {
  Copy, FolderInput, Users, UserMinus, Download, CheckCircle2,
  Trash2, Archive, X, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function BulkActionBar({
  selectedIds = [],
  totalFilteredCount = 0,
  allFilteredSelected = false,
  onSelectAllFiltered,
  units = [],
  groups = [],
  onClearSelection,
  onOpenCopyModal,
  onMoveToUnit,
  onAddToGroup,
  onRemoveFromGroup,
  onExportSelected,
  onArchiveSelected,
  isArchivedTab = false,
  onRestoreSelected,
  onDeleteSelected
}) {
  const { isAdmin } = useAuth();
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [showAddGroupMenu, setShowAddGroupMenu] = useState(false);
  const [showRemoveGroupMenu, setShowRemoveGroupMenu] = useState(false);
  const count = selectedIds.length;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-700/80 max-w-[96vw] overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-5 duration-200">
      {/* Selection counter & Select All Matching Records */}
      <div className="flex items-center gap-2 pr-2.5 border-r border-slate-700/80 flex-shrink-0">
        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {count}
        </span>
        <span className="text-xs font-medium text-slate-200 whitespace-nowrap">Selected</span>

        {totalFilteredCount > count && !allFilteredSelected && onSelectAllFiltered && (
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1 cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            Select all {totalFilteredCount} results
          </button>
        )}
        {allFilteredSelected && (
          <span className="text-[11px] text-emerald-400 font-medium ml-1 whitespace-nowrap flex-shrink-0">
            All {totalFilteredCount} selected
          </span>
        )}
      </div>

      {/* Action Buttons: Unified single row, balanced sizing, no wrapping */}
      <div className="flex items-center gap-1.5 flex-nowrap flex-shrink-0">
        {/* Copy button */}
        <button
          type="button"
          onClick={onOpenCopyModal}
          className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 border border-slate-700/60"
          title="Copy selected records"
        >
          <Copy className="w-3.5 h-3.5 text-indigo-400" />
          <span>Copy</span>
        </button>

        {/* Export selected */}
        <button
          type="button"
          onClick={onExportSelected}
          className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 border border-slate-700/60"
          title="Export selected records to Excel"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Export Selected</span>
        </button>

        {/* Move to Unit (Admin only) */}
        {isAdmin && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowUnitMenu(!showUnitMenu);
                setShowAddGroupMenu(false);
                setShowRemoveGroupMenu(false);
              }}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap border border-slate-700/60"
            >
              <FolderInput className="w-3.5 h-3.5 text-blue-400" />
              <span>Move to Unit</span>
            </button>

            {showUnitMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-slate-800 dark:text-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Target Division / Unit
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {units.map(u => {
                    const unitName = typeof u === 'string' ? u : u.name;
                    const unitCode = typeof u === 'string' ? '' : u.short_code;
                    return (
                      <button
                        key={unitName}
                        type="button"
                        onClick={() => {
                          onMoveToUnit(unitName);
                          setShowUnitMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 truncate transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{unitName}</span>
                        {unitCode && <span className="text-[10px] text-slate-400 font-mono ml-1 font-bold">[{unitCode}]</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add to Group (Admin only) */}
        {isAdmin && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAddGroupMenu(!showAddGroupMenu);
                setShowUnitMenu(false);
                setShowRemoveGroupMenu(false);
              }}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap border border-slate-700/60"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add to Group</span>
            </button>

            {showAddGroupMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-slate-800 dark:text-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Assign to Group
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onAddToGroup(g.id);
                        setShowAddGroupMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 truncate transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">{g.name}</span>
                      <span className="text-[10px] text-slate-400">({g.type})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remove from Group (Admin only) */}
        {isAdmin && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowRemoveGroupMenu(!showRemoveGroupMenu);
                setShowUnitMenu(false);
                setShowAddGroupMenu(false);
              }}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap border border-slate-700/60"
            >
              <UserMinus className="w-3.5 h-3.5 text-amber-400" />
              <span>Remove from Group</span>
            </button>

            {showRemoveGroupMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-slate-800 dark:text-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Remove from Group
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onRemoveFromGroup(g.id);
                        setShowRemoveGroupMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-rose-50 dark:hover:bg-slate-700 hover:text-rose-600 truncate transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">{g.name}</span>
                      <span className="text-[10px] text-slate-400">({g.type})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Archive / Restore Selected (Admin only) */}
        {isAdmin && !isArchivedTab && (
          <button
            type="button"
            onClick={onArchiveSelected}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-950/80 hover:bg-amber-900 text-amber-300 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 border border-amber-800/60"
            title="Archive selected records"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>Archive</span>
          </button>
        )}

        {isAdmin && isArchivedTab && (
          <>
            <button
              type="button"
              onClick={onRestoreSelected}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 border border-emerald-800/60"
              title="Restore selected records to active directory"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 border border-rose-800/60"
              title="Permanently delete selected records"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Permanently</span>
            </button>
          </>
        )}
      </div>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClearSelection}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-1 cursor-pointer flex-shrink-0 transition-colors"
        title="Clear selection"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
