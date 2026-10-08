import React, { useState } from 'react';
import { Copy, FolderInput, Users, CheckCircle2, Trash2, Award, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function BulkActionBar({
  selectedIds,
  selectedEmployees,
  units = [],
  groups = [],
  onClearSelection,
  onOpenCopyModal,
  onMoveToUnit,
  onAddToGroup,
  onVerifySelected,
  onDeleteSelected,
  onAddTraining
}) {
  const { isAdmin } = useAuth();
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const count = selectedIds.length;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 max-w-4xl w-[92vw] md:w-auto animate-in slide-in-from-bottom-5 duration-200">
      {/* Selected counter */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
          {count}
        </span>
        <span className="text-xs font-medium text-slate-300 hidden sm:inline">Selected</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Copy button */}
        <button
          onClick={onOpenCopyModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          title="Copy selected names/records for Word and Excel"
        >
          <Copy className="w-3.5 h-3.5 text-indigo-400" />
          <span>Copy</span>
        </button>

        {/* Move to Unit (Admin only) */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => { setShowUnitMenu(!showUnitMenu); setShowGroupMenu(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              <FolderInput className="w-3.5 h-3.5 text-blue-400" />
              <span>Move to Unit</span>
            </button>

            {showUnitMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-slate-800 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Target Unit
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {units.map(u => (
                    <button
                      key={u}
                      onClick={() => {
                        onMoveToUnit(u);
                        setShowUnitMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-600 truncate transition-colors"
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add to Group (Admin only) */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => { setShowGroupMenu(!showGroupMenu); setShowUnitMenu(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add to Group</span>
            </button>

            {showGroupMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-slate-800 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Assign to Group
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        onAddToGroup(g.id);
                        setShowGroupMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-600 truncate transition-colors flex justify-between items-center"
                    >
                      <span>{g.name}</span>
                      <span className="text-[10px] text-slate-400">({g.type})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Record (Admin only) */}
        {isAdmin && (
          <button
            onClick={onAddTraining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Add Training</span>
          </button>
        )}

        {/* Mark Verified (Admin only) */}
        {isAdmin && (
          <button
            onClick={onVerifySelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Mark records as verified with current timestamp"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Verify</span>
          </button>
        )}

        {/* Delete (Admin only) */}
        {isAdmin && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/80 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer ml-1"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        )}
      </div>

      {/* Dismiss / Clear Selection */}
      <button
        onClick={onClearSelection}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-2"
        title="Deselect all"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
