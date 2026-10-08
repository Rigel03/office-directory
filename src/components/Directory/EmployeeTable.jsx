import React, { useState } from 'react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, MapPin, Building, Mail, Phone,
  Edit2, History, Check, X, CheckCircle, Trash2, AlertCircle
} from 'lucide-react';
import { StatusBadge, ReviewBadge } from '../Common/Badge';
import { useAuth } from '../../context/AuthContext';
import { ALL_COLUMNS } from './ColumnManager';

export function EmployeeTable({
  employees = [],
  selectedIds = [],
  columns = ALL_COLUMNS,
  onToggleSelect,
  onToggleSelectAll,
  sortBy,
  sortOrder,
  onSort,
  onEditEmployee,
  onViewAudit,
  onInlineUpdate,
  onVerify,
  onDelete
}) {
  const { isAdmin } = useAuth();
  const [editingCell, setEditingCell] = useState(null); // { id, field, value }

  const handleStartInline = (emp, field) => {
    if (!isAdmin) return;
    setEditingCell({
      id: emp.id,
      field,
      value: emp[field] || ''
    });
  };

  const handleSaveInline = async () => {
    if (!editingCell) return;
    try {
      await onInlineUpdate(editingCell.id, editingCell.field, editingCell.value);
      setEditingCell(null);
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  const handleKeyDownInline = (e) => {
    if (e.key === 'Enter') {
      handleSaveInline();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const allSelected = employees.length > 0 && employees.every(e => selectedIds.includes(e.id));
  const someSelected = employees.some(e => selectedIds.includes(e.id)) && !allSelected;

  const renderSortIcon = (colKey) => {
    if (sortBy !== colKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 inline ml-1 opacity-40 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 inline ml-1" />
    );
  };

  const visibleCols = columns.filter(c => c.visible);

  if (employees.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center transition-colors">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Building className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No employees found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
          No records match your active filters or search terms. Try clearing filters or selecting another tab.
        </p>
      </div>
    );
  }

  // Render individual cell based on column ID
  const renderCell = (emp, colId) => {
    const missingPosition = !emp.position || emp.position.trim() === '';
    const missingUnit = !emp.unit || emp.unit.trim() === '';
    const isEditingPos = editingCell?.id === emp.id && editingCell?.field === 'position';
    const isEditingUnit = editingCell?.id === emp.id && editingCell?.field === 'unit';

    switch (colId) {
      case 'full_name':
        return (
          <td key={colId} className="py-3 px-4 min-w-[240px]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {emp.full_name}
                </span>
                {emp.needs_review && (
                  <ReviewBadge missingPos={missingPosition} missingUnit={missingUnit} />
                )}
              </div>

              {/* Quick-find physical badge: Floor / Desk / Room */}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                {emp.location ? (
                  <span
                    title="Physical desk/office location"
                    className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700"
                  >
                    <MapPin className="w-3 h-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                    {emp.location}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic text-[10px]">No desk assigned</span>
                )}

                {emp.groups && emp.groups.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {emp.groups.map(g => (
                      <span
                        key={g.id}
                        className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        );

      case 'position':
        return (
          <td key={colId} className="py-3 px-4 min-w-[200px]">
            {isEditingPos ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={editingCell.value}
                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                  onKeyDown={handleKeyDownInline}
                  className="px-2 py-1 text-xs border border-indigo-500 dark:border-indigo-400 rounded bg-white dark:bg-slate-800 dark:text-white shadow-xs w-full focus:outline-hidden"
                  placeholder="Enter position..."
                />
                <button
                  onClick={handleSaveInline}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  title="Save position"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingCell(null)}
                  className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="group/cell flex items-center justify-between">
                {missingPosition ? (
                  <button
                    type="button"
                    onClick={() => handleStartInline(emp, 'position')}
                    title={isAdmin ? "Missing Position — Click to set position inline" : "Missing Position"}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900 hover:scale-105 transition-all cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Set Position</span>
                  </button>
                ) : (
                  <span
                    onDoubleClick={() => handleStartInline(emp, 'position')}
                    className="text-slate-800 dark:text-slate-200 font-medium"
                  >
                    {emp.position}
                  </span>
                )}

                {isAdmin && !missingPosition && (
                  <button
                    onClick={() => handleStartInline(emp, 'position')}
                    className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity ml-1"
                    title="Inline edit position"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </td>
        );

      case 'unit':
        return (
          <td key={colId} className="py-3 px-4 min-w-[180px]">
            {isEditingUnit ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={editingCell.value}
                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                  onKeyDown={handleKeyDownInline}
                  className="px-2 py-1 text-xs border border-indigo-500 dark:border-indigo-400 rounded bg-white dark:bg-slate-800 dark:text-white shadow-xs w-full focus:outline-hidden"
                  placeholder="Enter unit..."
                />
                <button
                  onClick={handleSaveInline}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  title="Save unit"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingCell(null)}
                  className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="group/cell flex items-center justify-between">
                {missingUnit ? (
                  <button
                    type="button"
                    onClick={() => handleStartInline(emp, 'unit')}
                    title={isAdmin ? "Missing Unit / Division — Click to set unit inline" : "Missing Unit / Division"}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900 hover:scale-105 transition-all cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Set Unit</span>
                  </button>
                ) : (
                  <span
                    onDoubleClick={() => handleStartInline(emp, 'unit')}
                    className="text-slate-700 dark:text-slate-300 font-medium"
                  >
                    {emp.unit}
                  </span>
                )}

                {isAdmin && !missingUnit && (
                  <button
                    onClick={() => handleStartInline(emp, 'unit')}
                    className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity ml-1"
                    title="Inline edit unit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </td>
        );

      case 'status':
        return (
          <td key={colId} className="py-3 px-4 w-28">
            <StatusBadge status={emp.status} />
          </td>
        );

      case 'contact':
        return (
          <td key={colId} className="py-3 px-4 min-w-[170px]">
            <div className="flex flex-col gap-0.5">
              {emp.email ? (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">{emp.email}</span>
                </div>
              ) : (
                <span className="text-slate-400 dark:text-slate-600 text-[11px]">—</span>
              )}
              {emp.phone && (
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                  <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{emp.phone}</span>
                </div>
              )}
            </div>
          </td>
        );

      case 'last_verified_at':
        return (
          <td key={colId} className="py-3 px-4 w-36">
            <div className="flex flex-col">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {emp.last_verified_at ? emp.last_verified_at.slice(0, 10) : 'Never'}
              </span>
              {isAdmin && (
                <button
                  onClick={() => onVerify(emp.id)}
                  className="text-[10px] text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center gap-0.5 mt-0.5 cursor-pointer"
                >
                  <CheckCircle className="w-3 h-3" />
                  Verify now
                </button>
              )}
            </div>
          </td>
        );

      case 'notes':
        return (
          <td key={colId} className="py-3 px-4 min-w-[160px] text-slate-600 dark:text-slate-400">
            {emp.notes || '—'}
          </td>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {/* Checkbox */}
              <th className="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800"
                />
              </th>

              {/* Dynamic Columns */}
              {visibleCols.map(col => (
                <th
                  key={col.id}
                  onClick={() => ['full_name', 'position', 'unit', 'status', 'last_verified_at'].includes(col.id) && onSort(col.id)}
                  className={`py-3.5 px-4 transition-colors select-none ${
                    ['full_name', 'position', 'unit', 'status', 'last_verified_at'].includes(col.id)
                      ? 'cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/80 group'
                      : ''
                  }`}
                >
                  <span>{col.label}</span>
                  {['full_name', 'position', 'unit', 'status', 'last_verified_at'].includes(col.id) && renderSortIcon(col.id)}
                </th>
              ))}

              {/* Actions */}
              <th className="py-3.5 px-4 text-right w-24">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {employees.map((emp) => {
              const isSelected = selectedIds.includes(emp.id);

              return (
                <tr
                  key={emp.id}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/30' : ''
                  } ${emp.needs_review ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''}`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(emp.id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800"
                    />
                  </td>

                  {/* Render Visible Dynamic Columns */}
                  {visibleCols.map(col => renderCell(emp, col.id))}

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewAudit(emp)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View audit trail"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => onEditEmployee(emp)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit full record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(emp)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Delete employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
