import React, { useState } from 'react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, MapPin, Building, Mail, Phone,
  Edit2, History, Check, X, MoreVertical, Archive, RotateCcw,
  Trash2, AlertTriangle, Plus, ChevronLeft, ChevronRight
} from 'lucide-react';
import { StatusBadge } from '../Common/Badge';
import { useAuth } from '../../context/AuthContext';
import { ALL_COLUMNS } from './ColumnManager';

export function EmployeeTable({
  employees = [],
  totalCount = 0,
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
  onArchive,
  onRestore,
  onDelete,
  onClearFilters,
  isArchivedView = false,
  density = 'comfortable',
  onToggleDensity,
  loading = false
}) {
  const { isAdmin } = useAuth();
  const [editingCell, setEditingCell] = useState(null); // { id, field, value }
  const [openOverflowId, setOpenOverflowId] = useState(null);

  // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(employees.length / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);

  const paginatedEmployees = pageSize === 'all'
    ? employees
    : employees.slice((validPage - 1) * pageSize, validPage * pageSize);

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

  const allPageSelected = paginatedEmployees.length > 0 && paginatedEmployees.every(e => selectedIds.includes(e.id));
  const somePageSelected = paginatedEmployees.some(e => selectedIds.includes(e.id)) && !allPageSelected;

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
  const isCompact = density === 'compact';
  const cellPadding = isCompact ? 'py-1.5 px-3' : 'py-3 px-4';

  if (employees.length === 0 && !loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center transition-colors">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Building className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No matching staff records</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          No records match your active search terms or filter criteria.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        )}
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
          <td key={colId} className={`${cellPadding} min-w-[240px]`}>
            <div className="flex flex-col">
              <span className={`font-semibold text-slate-900 dark:text-slate-100 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                {emp.full_name}
              </span>

              {/* Structured Quick-find Location & Groups underneath (Spec 6) */}
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                {emp.location ? (
                  <span
                    title="Physical Office Location"
                    className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300"
                  >
                    <MapPin className="w-3 h-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                    {emp.location}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic text-[10px]">No desk assigned</span>
                )}

                {/* Group Chips: show first + "+N" when multiple (Spec 6) */}
                {emp.groups && emp.groups.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span
                      title={emp.groups.map(g => g.name).join(', ')}
                      className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {emp.groups[0].name}
                    </span>
                    {emp.groups.length > 1 && (
                      <span
                        title={emp.groups.slice(1).map(g => g.name).join(', ')}
                        className="px-1 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-help"
                      >
                        +{emp.groups.length - 1}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </td>
        );

      case 'position':
        return (
          <td key={colId} className={`${cellPadding} min-w-[190px]`}>
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
                  type="button"
                  onClick={handleSaveInline}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  title="Save position"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
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
                    title="Missing Position — Click to set position inline"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
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
                    type="button"
                    onClick={() => handleStartInline(emp, 'position')}
                    className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity ml-1 cursor-pointer"
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
          <td key={colId} className={`${cellPadding} min-w-[140px]`}>
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
                  type="button"
                  onClick={handleSaveInline}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  title="Save unit"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
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
                    title="Missing Unit / Division — Click to set unit inline"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Set Unit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* Show short code in table with full name on hover (Spec 3) */}
                    <span
                      title={emp.unit}
                      onDoubleClick={() => handleStartInline(emp, 'unit')}
                      className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-help"
                    >
                      {emp.unit_code || emp.unit}
                    </span>

                    {/* Soft Location Mismatch Warning Icon (Spec 3) */}
                    {emp.location_mismatch && (
                      <span
                        title={`Notice: Usual location for ${emp.unit_code || emp.unit} is ${emp.expected_floor}. (Employee floor: ${emp.floor || emp.location})`}
                        className="text-amber-500 dark:text-amber-400 cursor-help inline-flex items-center"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                )}

                {isAdmin && !missingUnit && (
                  <button
                    type="button"
                    onClick={() => handleStartInline(emp, 'unit')}
                    className="opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity ml-1 cursor-pointer"
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
          <td key={colId} className={`${cellPadding} w-28`}>
            <StatusBadge status={emp.status} />
          </td>
        );

      case 'contact':
        return (
          <td key={colId} className={`${cellPadding} min-w-[170px]`}>
            <div className="flex flex-col gap-0.5">
              {emp.email ? (
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">{emp.email}</span>
                </div>
              ) : (
                <span className="text-slate-400 dark:text-slate-600 text-[11px]">—</span>
              )}
              {emp.phone && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                  <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  <span>{emp.phone}</span>
                </div>
              )}
            </div>
          </td>
        );

      case 'last_verified_at':
        return (
          <td key={colId} className={`${cellPadding} w-36`}>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {emp.last_verified_at ? emp.last_verified_at.slice(0, 10) : 'Never'}
            </span>
          </td>
        );

      case 'notes':
        return (
          <td key={colId} className={`${cellPadding} min-w-[160px] text-slate-600 dark:text-slate-400`}>
            {emp.notes || '—'}
          </td>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors flex flex-col">
      {/* Table container with sticky header support (Spec 6) */}
      <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider shadow-2xs">
            <tr>
              {/* Checkbox */}
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={el => { if (el) el.indeterminate = somePageSelected; }}
                  onChange={() => onToggleSelectAll(paginatedEmployees.map(e => e.id))}
                  className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800"
                  aria-label="Select all on this page"
                />
              </th>

              {/* Dynamic Columns */}
              {visibleCols.map(col => (
                <th
                  key={col.id}
                  onClick={() => ['full_name', 'position', 'unit', 'status', 'last_verified_at'].includes(col.id) && onSort(col.id)}
                  className={`py-3 px-4 transition-colors select-none ${
                    ['full_name', 'position', 'unit', 'status', 'last_verified_at'].includes(col.id)
                      ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 group'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {['full_name', 'position', 'unit', 'status', 'last_verified_at'].includes(col.id) && renderSortIcon(col.id)}
                  </div>
                </th>
              ))}

              {/* Actions Header */}
              <th className="py-3 px-4 text-right w-28">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {paginatedEmployees.map((emp) => {
              const isSelected = selectedIds.includes(emp.id);
              const isOverflowOpen = openOverflowId === emp.id;

              return (
                <tr
                  key={emp.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/40' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-2.5 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(emp.id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800"
                      aria-label={`Select ${emp.full_name}`}
                    />
                  </td>

                  {/* Render Visible Columns */}
                  {visibleCols.map(col => renderCell(emp, col.id))}

                  {/* Row Actions: Edit & History direct, Delete in "..." menu (Spec 8) */}
                  <td className="py-2 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 relative">
                      <button
                        type="button"
                        onClick={() => onViewAudit(emp)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View audit trail"
                        aria-label={`Audit history for ${emp.full_name}`}
                      >
                        <History className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onEditEmployee(emp)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit employee record"
                          aria-label={`Edit ${emp.full_name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Safer Row Overflow Menu "..." (Spec 8) */}
                      {isAdmin && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenOverflowId(isOverflowOpen ? null : emp.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="More row actions"
                            aria-label="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isOverflowOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 text-left animate-in fade-in zoom-in-95 duration-100">
                              {!isArchivedView ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenOverflowId(null);
                                    onArchive(emp);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
                                >
                                  <Archive className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Archive Record</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenOverflowId(null);
                                      onRestore(emp);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Restore to Active</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenOverflowId(null);
                                      onDelete(emp);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-700"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete Permanently</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Density Toggle & Pagination (Spec 6) */}
      <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 select-none">
        {/* Left: Density Toggle & Record Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onToggleDensity && onToggleDensity('comfortable')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                !isCompact
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Comfortable
            </button>
            <button
              type="button"
              onClick={() => onToggleDensity && onToggleDensity('compact')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                isCompact
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Compact
            </button>
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Showing {paginatedEmployees.length} of {employees.length} records
          </span>
        </div>

        {/* Right: Page Size & Pagination Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="all">All</option>
            </select>
          </div>

          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 px-1">
                {validPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
