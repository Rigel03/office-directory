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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-zinc-800 max-w-[96vw] overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-5 duration-200">
      {/* Selection counter & Select All Matching Records */}
      <div className="flex items-center gap-2 pr-2.5 border-r border-zinc-800 shrink-0">
        <span className="w-6 h-6 rounded-full bg-white text-zinc-950 flex items-center justify-center text-xs font-bold shrink-0">
          {count}
        </span>
        <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">Selected</span>

        {totalFilteredCount > count && !allFilteredSelected && onSelectAllFiltered && (
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="text-[11px] font-semibold text-zinc-300 hover:text-white underline underline-offset-2 ml-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            Select all {totalFilteredCount} results
          </button>
        )}
        {allFilteredSelected && (
          <span className="text-[11px] text-zinc-300 font-medium ml-1 whitespace-nowrap shrink-0">
            All {totalFilteredCount} selected
          </span>
        )}
      </div>

      {/* Action Buttons: Unified single row, balanced sizing, no wrapping */}
      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        {/* Copy button */}
        <button
          type="button"
          onClick={onOpenCopyModal}
          className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-zinc-800"
          title="Copy selected records"
        >
          <Copy className="w-3.5 h-3.5 text-zinc-400" />
          <span>Copy</span>
        </button>

        {/* Export selected */}
        <button
          type="button"
          onClick={onExportSelected}
          className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-zinc-800"
          title="Export selected records"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export Selected</span>
        </button>

        {/* Move to Unit (Admin only) */}
        {isAdmin && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowUnitMenu(!showUnitMenu);
                setShowAddGroupMenu(false);
                setShowRemoveGroupMenu(false);
              }}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap border border-zinc-800"
            >
              <FolderInput className="w-3.5 h-3.5 text-zinc-400" />
              <span>Move to Unit</span>
            </button>

            {showUnitMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 py-1.5 text-zinc-100 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
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
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 hover:text-white truncate transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{unitName}</span>
                        {unitCode && <span className="text-[10px] text-zinc-400 font-mono ml-1 font-bold">[{unitCode}]</span>}
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
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAddGroupMenu(!showAddGroupMenu);
                setShowUnitMenu(false);
                setShowRemoveGroupMenu(false);
              }}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap border border-zinc-800"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Add to Group</span>
            </button>

            {showAddGroupMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 py-1.5 text-zinc-100 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
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
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 hover:text-white truncate transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">{g.name}</span>
                      <span className="text-[10px] text-zinc-400">({g.type})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remove from Group (Admin only) */}
        {isAdmin && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowRemoveGroupMenu(!showRemoveGroupMenu);
                setShowUnitMenu(false);
                setShowAddGroupMenu(false);
              }}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap border border-zinc-800"
            >
              <UserMinus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Remove from Group</span>
            </button>

            {showRemoveGroupMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 py-1.5 text-zinc-100 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
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
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 hover:text-white truncate transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">{g.name}</span>
                      <span className="text-[10px] text-zinc-400">({g.type})</span>
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
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-zinc-800"
            title="Archive selected records"
          >
            <Archive className="w-3.5 h-3.5 text-zinc-400" />
            <span>Archive</span>
          </button>
        )}

        {isAdmin && isArchivedTab && (
          <>
            <button
              type="button"
              onClick={onRestoreSelected}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-zinc-800"
              title="Restore selected records to active directory"
            >
              <Check className="w-3.5 h-3.5 text-zinc-300" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-rose-400 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-zinc-800"
              title="Permanently delete selected records"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Delete Permanently</span>
            </button>
          </>
        )}
      </div>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClearSelection}
        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 ml-1 cursor-pointer shrink-0 transition-colors"
        title="Clear selection"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
