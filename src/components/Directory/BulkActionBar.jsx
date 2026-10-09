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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-3 border border-slate-700 max-w-5xl w-[94vw] md:w-auto animate-in slide-in-from-bottom-5 duration-200">
      {/* Selection counter & Select All Matching Records */}
      <div className="flex items-center gap-2.5 pr-3 border-b md:border-b-0 md:border-r border-slate-700 w-full md:w-auto justify-between md:justify-start pb-2 md:pb-0">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
            {count}
          </span>
          <span className="text-xs font-medium text-slate-200">Selected</span>
        </div>

        {totalFilteredCount > count && !allFilteredSelected && onSelectAllFiltered && (
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-2 cursor-pointer"
          >
            Select all {totalFilteredCount} results
          </button>
        )}
        {allFilteredSelected && (
          <span className="text-[11px] text-emerald-400 font-medium ml-2">
            All {totalFilteredCount} matching records selected
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-start">
        {/* Copy button */}
        <button
          type="button"
          onClick={onOpenCopyModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          title="Copy selected records as names only, names + positions, or table"
        >
          <Copy className="w-3.5 h-3.5 text-indigo-400" />
          <span>Copy</span>
        </button>

        {/* Export selected */}
        <button
          type="button"
          onClick={onExportSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          title="Export selected records"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Export Selected</span>
        </button>

        {/* Move to Unit (Admin only) */}
        {isAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUnitMenu(!showUnitMenu);
                setShowAddGroupMenu(false);
                setShowRemoveGroupMenu(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              <FolderInput className="w-3.5 h-3.5 text-blue-400" />
              <span>Move to Unit</span>
            </button>

            {showUnitMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-slate-800 dark:text-slate-100 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Target Unit
                </div>
                <div className="max-h-52 overflow-y-auto">
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
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 truncate transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{unitName}</span>
                        {unitCode && <span className="text-[10px] text-slate-400 font-mono ml-1">{unitCode}</span>}
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
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAddGroupMenu(!showAddGroupMenu);
                setShowUnitMenu(false);
                setShowRemoveGroupMenu(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add to Group</span>
            </button>

            {showAddGroupMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-slate-800 dark:text-slate-100 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Assign to Group
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onAddToGroup(g.id);
                        setShowAddGroupMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 truncate transition-colors flex justify-between items-center"
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

        {/* Remove from Group (Admin only - Spec 7) */}
        {isAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowRemoveGroupMenu(!showRemoveGroupMenu);
                setShowUnitMenu(false);
                setShowAddGroupMenu(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              <UserMinus className="w-3.5 h-3.5 text-amber-400" />
              <span>Remove from Group</span>
            </button>

            {showRemoveGroupMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-slate-800 dark:text-slate-100 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Remove from Group
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onRemoveFromGroup(g.id);
                        setShowRemoveGroupMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-rose-50 dark:hover:bg-slate-700 hover:text-rose-600 truncate transition-colors flex justify-between items-center"
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

        {/* Archive / Restore Selected (Admin only - Spec 8) */}
        {isAdmin && !isArchivedTab && (
          <button
            type="button"
            onClick={onArchiveSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/80 hover:bg-amber-900 text-amber-300 transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 transition-colors cursor-pointer"
              title="Restore selected records to active directory"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/80 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer"
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
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-auto md:ml-2 cursor-pointer"
        title="Clear selection"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
