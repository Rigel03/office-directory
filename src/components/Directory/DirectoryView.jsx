import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Upload, Download, AlertTriangle,
  RotateCcw, Building2, ChevronDown, Archive, Users, CheckCircle,
  FileSpreadsheet, FileText, Check
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { EmployeeTable } from './EmployeeTable';
import { EmployeeModal } from './EmployeeModal';
import { QuickCopyModal } from './QuickCopyModal';
import { BulkActionBar } from './BulkActionBar';
import { AuditModal } from './AuditModal';
import { ImportModal } from '../Import/ImportModal';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { ColumnManager, ALL_COLUMNS } from './ColumnManager';

export function DirectoryView({ onNavigateToUnits }) {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [units, setUnits] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick views tabs (Spec 4: All Staff, Needs Review, On Leave, Detached, Archived)
  const [activeTab, setActiveTab] = useState('all');

  // Single source of truth for counts (Spec 4)
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    active: 0,
    on_leave: 0,
    detached: 0,
    needs_review: 0,
    archived: 0
  });

  // Dynamic Columns State
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('directory_table_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ALL_COLUMNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('directory_table_columns', JSON.stringify(columns));
    } catch (e) {}
  }, [columns]);

  // Density Toggle: comfortable vs compact (Spec 6)
  const [density, setDensity] = useState(() => {
    return localStorage.getItem('directory_table_density') || 'comfortable';
  });

  const handleToggleDensity = (newDensity) => {
    setDensity(newDensity);
    localStorage.setItem('directory_table_density', newDensity);
  };

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);

  // Modals & Dialogs
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [auditEmployee, setAuditEmployee] = useState(null);

  // Archive & Delete Confirmation Dialogs (Spec 8)
  const [archiveTargetEmp, setArchiveTargetEmp] = useState(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState(null);
  const [bulkActionConfirm, setBulkActionConfirm] = useState(null); // { type: 'archive'|'delete'|'restore', count: N }

  const loadSummaryCounts = async () => {
    try {
      const res = await api.getEmployeesSummary();
      setSummaryCounts(res);
    } catch (err) {
      console.error('Failed to load summary counts:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        unit: selectedUnit,
        groupId: selectedGroupId,
        sortBy,
        sortOrder
      };

      // Quick-view tab filter
      if (activeTab === 'archived') {
        params.archived = 'true';
      } else if (activeTab === 'needs_review') {
        params.tab = 'needs_review';
      } else if (activeTab === 'on_leave') {
        params.tab = 'on_leave';
      } else if (activeTab === 'detached') {
        params.tab = 'detached';
      }

      if (selectedStatus && activeTab === 'all') {
        params.status = selectedStatus;
      }

      const [empList, unitList, roomList, groupList] = await Promise.all([
        api.getEmployees(params),
        api.getUnits(),
        api.getRooms(),
        api.getGroups(),
        loadSummaryCounts()
      ]);

      setEmployees(empList);
      setUnits(unitList);
      setRooms(roomList);
      setGroups(groupList);
    } catch (err) {
      console.error('Load directory data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedIds([]);
    setAllFilteredSelected(false);
  }, [activeTab, search, selectedUnit, selectedGroupId, selectedStatus, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setAllFilteredSelected(updated.length === employees.length && employees.length > 0);
      return updated;
    });
  };

  const handleToggleSelectAll = (pageIds) => {
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
      setAllFilteredSelected(false);
    } else {
      const merged = Array.from(new Set([...selectedIds, ...pageIds]));
      setSelectedIds(merged);
      setAllFilteredSelected(merged.length === employees.length);
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(employees.map(e => e.id));
    setAllFilteredSelected(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedUnit('');
    setSelectedGroupId('');
    setSelectedStatus('');
    setActiveTab('all');
  };

  const handleSaveEmployee = async (formData, id) => {
    if (id) {
      await api.updateEmployee(id, formData);
    } else {
      await api.createEmployee(formData);
    }
    await loadData();
    await loadSummaryCounts();
  };

  const handleInlineUpdate = async (id, field, value) => {
    await api.patchInline(id, field, value);
    await loadData();
    await loadSummaryCounts();
  };

  // Archive & Soft Delete Handlers (Spec 8)
  const handleArchiveSingle = async () => {
    if (!archiveTargetEmp) return;
    try {
      await api.archiveEmployee(archiveTargetEmp.id);
      setArchiveTargetEmp(null);
      await loadData();
      await loadSummaryCounts();
    } catch (err) {
      alert('Failed to archive employee: ' + err.message);
    }
  };

  const handleRestoreSingle = async (emp) => {
    try {
      await api.restoreEmployee(emp.id);
      await loadData();
      await loadSummaryCounts();
    } catch (err) {
      alert('Failed to restore employee: ' + err.message);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deleteConfirmEmp) return;
    try {
      await api.deleteEmployee(deleteConfirmEmp.id);
      setDeleteConfirmEmp(null);
      await loadData();
      await loadSummaryCounts();
    } catch (err) {
      alert('Failed to permanently delete employee: ' + err.message);
    }
  };

  // Bulk Handlers (Spec 7)
  const handleBulkMoveUnit = async (targetUnit) => {
    try {
      await api.bulkEmployees({
        action: 'move_unit',
        targetUnit,
        ids: selectedIds
      });
      setSelectedIds([]);
      await loadData();
      await loadSummaryCounts();
    } catch (err) {
      alert('Failed to move unit: ' + err.message);
    }
  };

  const handleBulkAddToGroup = async (targetGroupId) => {
    try {
      await api.bulkEmployees({
        action: 'add_group',
        targetGroupId,
        ids: selectedIds
      });
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      alert('Failed to add to group: ' + err.message);
    }
  };

  const handleBulkRemoveFromGroup = async (targetGroupId) => {
    try {
      await api.bulkEmployees({
        action: 'remove_group',
        targetGroupId,
        ids: selectedIds
      });
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      alert('Failed to remove from group: ' + err.message);
    }
  };

  const handleBulkArchive = async () => {
    try {
      await api.bulkEmployees({
        action: 'archive',
        ids: selectedIds
      });
      setBulkActionConfirm(null);
      setSelectedIds([]);
      await loadData();
      await loadSummaryCounts();
    } catch (err) {
      alert('Failed to bulk archive: ' + err.message);
    }
  };

  const handleBulkRestore = async () => {
    try {
      await api.bulkEmployees({
        action: 'restore',
        ids: selectedIds
      });
      setBulkActionConfirm(null);
      setSelectedIds([]);
      await loadData();
      await loadSummaryCounts();
    } catch (err) {
      alert('Failed to bulk restore: ' + err.message);
    }
  };

  const handleBulkPermanentDelete = async () => {
    try {
      await api.bulkEmployees({
        action: 'delete',
        ids: selectedIds
      });
      setBulkActionConfirm(null);
      setSelectedIds([]);
      await loadData();
      await loadSummaryCounts();
    } catch (err) {
      alert('Failed to bulk delete: ' + err.message);
    }
  };

  // Export dropdown handler (Spec 9)
  const handleExport = async (format) => {
    setShowExportMenu(false);
    try {
      const blob = await api.exportEmployeesBlob({
        search,
        unit: selectedUnit,
        groupId: selectedGroupId,
        status: activeTab === 'all' ? selectedStatus : '',
        tab: activeTab,
        ids: selectedIds.length > 0 ? selectedIds.join(',') : '',
        format
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Staff_Directory_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const selectedEmployeeObjects = employees.filter(e => selectedIds.includes(e.id));
  const isArchivedView = activeTab === 'archived';

  // Quick view tab definition (Spec 4)
  const QUICK_TABS = [
    { id: 'all', label: 'All Staff', count: summaryCounts.total },
    { id: 'needs_review', label: 'Needs Review', count: summaryCounts.needs_review, isAlert: summaryCounts.needs_review > 0 },
    { id: 'on_leave', label: 'On Leave', count: summaryCounts.on_leave },
    { id: 'detached', label: 'Detached', count: summaryCounts.detached },
    { id: 'archived', label: 'Archived', count: summaryCounts.archived, isArchive: true }
  ];

  return (
    <div className="space-y-4">
      {/* 1. QUICK VIEWS TAB ROW (Spec 4) */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {QUICK_TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'all') setSelectedStatus('');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-bold'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                    : tab.isAlert
                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RESPONSIVE TOOLBAR (Spec 9) */}
      <div className="bg-white dark:bg-zinc-900 p-3 sm:p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search name, position, unit, location, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        {/* Action Buttons: Columns, Single Export Dropdown, Import, New Employee */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Columns Manager */}
          <ColumnManager columns={columns} onColumnsChange={setColumns} />

          {/* Single Combined Export Dropdown (Spec 9) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-9 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Export filtered directory"
            >
              <Download className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 cursor-pointer border-t border-zinc-100 dark:border-zinc-700"
                >
                  <FileText className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <span>Export to CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

          {/* Import Spreadsheet (Admin only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="h-9 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>Import Spreadsheet</span>
            </button>
          )}

          {/* New Employee - The Primary Styled Button (Spec 9) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingEmployee(null);
                setShowEmployeeModal(true);
              }}
              className="h-9 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. FILTER RIBBON (Spec 3 & 4) */}
      <div className="bg-zinc-50/80 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs flex-wrap transition-colors">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-semibold shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Managed Units / Divisions Dropdown (Spec 3) */}
          <div className="flex items-center gap-1">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="h-8 px-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-medium text-xs"
            >
              <option value="">All Units / Divisions</option>
              {units.map(u => (
                <option key={u.id || u.name} value={u.name}>
                  [{u.short_code}] {u.name}
                </option>
              ))}
            </select>
            {isAdmin && onNavigateToUnits && (
              <button
                type="button"
                onClick={onNavigateToUnits}
                title="Manage Units & Divisions"
                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg shrink-0"
              >
                <Building2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="h-8 px-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-medium text-xs"
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
            ))}
          </select>

          {/* Employment Status Filter (only shown on All Staff tab) */}
          {activeTab === 'all' && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 px-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-medium text-xs"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on leave">On Leave</option>
              <option value="detached">Detached</option>
            </select>
          )}

          {/* Reset Filters button */}
          {(selectedUnit || selectedGroupId || selectedStatus || search) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-8 inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-semibold px-2 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Showing N staff records label (Spec 4 & Testing) */}
        <div className="text-slate-600 dark:text-slate-400 font-medium text-xs">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{employees.length}</span> staff records
        </div>
      </div>

      {/* 4. DIRECTORY TABLE WITH DENSITY & STICKY HEADER (Spec 5 & 6) */}
      <EmployeeTable
        employees={employees}
        totalCount={employees.length}
        selectedIds={selectedIds}
        columns={columns}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEditEmployee={(emp) => {
          setEditingEmployee(emp);
          setShowEmployeeModal(true);
        }}
        onViewAudit={(emp) => setAuditEmployee(emp)}
        onInlineUpdate={handleInlineUpdate}
        onArchive={(emp) => setArchiveTargetEmp(emp)}
        onRestore={handleRestoreSingle}
        onDelete={(emp) => setDeleteConfirmEmp(emp)}
        onClearFilters={handleClearFilters}
        isArchivedView={isArchivedView}
        density={density}
        onToggleDensity={handleToggleDensity}
        loading={loading}
      />

      {/* 5. FLOATING BULK ACTIONS BAR (Spec 7) */}
      <BulkActionBar
        selectedIds={selectedIds}
        totalFilteredCount={employees.length}
        allFilteredSelected={allFilteredSelected}
        onSelectAllFiltered={handleSelectAllFiltered}
        units={units}
        groups={groups}
        onClearSelection={() => {
          setSelectedIds([]);
          setAllFilteredSelected(false);
        }}
        onOpenCopyModal={() => setShowCopyModal(true)}
        onMoveToUnit={handleBulkMoveUnit}
        onAddToGroup={handleBulkAddToGroup}
        onRemoveFromGroup={handleBulkRemoveFromGroup}
        onExportSelected={() => handleExport('xlsx')}
        isArchivedTab={isArchivedView}
        onArchiveSelected={() => setBulkActionConfirm({ type: 'archive', count: selectedIds.length })}
        onRestoreSelected={() => setBulkActionConfirm({ type: 'restore', count: selectedIds.length })}
        onDeleteSelected={() => setBulkActionConfirm({ type: 'delete', count: selectedIds.length })}
      />

      {/* MODAL: Employee Add/Edit (Spec 2 & 3) */}
      <EmployeeModal
        isOpen={showEmployeeModal}
        onClose={() => {
          setShowEmployeeModal(false);
          setEditingEmployee(null);
        }}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
        availableGroups={groups}
        availableUnits={units}
        availableRooms={rooms}
      />

      {/* MODAL: Quick Copy formats for Word/Excel */}
      <QuickCopyModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        selectedEmployees={selectedEmployeeObjects}
      />

      {/* MODAL: Import Wizard */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={async () => {
          await loadData();
          await loadSummaryCounts();
        }}
      />

      {/* MODAL: Record Audit Trail */}
      <AuditModal
        isOpen={Boolean(auditEmployee)}
        onClose={() => setAuditEmployee(null)}
        employee={auditEmployee}
      />

      {/* Archive Single Employee Confirmation Dialog (Spec 8) */}
      <ConfirmDialog
        isOpen={Boolean(archiveTargetEmp)}
        title="Archive Employee Record"
        message={`Are you sure you want to archive ${archiveTargetEmp?.full_name}? The employee will be hidden from the active directory and moved to the Archived view. You can restore them anytime.`}
        confirmText="Archive Employee"
        onConfirm={handleArchiveSingle}
        onCancel={() => setArchiveTargetEmp(null)}
      />

      {/* Delete Single Employee Permanently Confirmation Dialog (Spec 8) */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmEmp)}
        title="Permanently Delete Employee"
        message={`Are you sure you want to permanently delete ${deleteConfirmEmp?.full_name}? This cannot be undone.`}
        confirmText="Delete Permanently"
        onConfirm={handleDeletePermanent}
        onCancel={() => setDeleteConfirmEmp(null)}
      />

      {/* Bulk Action Confirmation Dialog (Spec 7 & 8) */}
      <ConfirmDialog
        isOpen={Boolean(bulkActionConfirm)}
        title={`${bulkActionConfirm?.type === 'archive' ? 'Archive' : bulkActionConfirm?.type === 'restore' ? 'Restore' : 'Delete'} ${bulkActionConfirm?.count} Records`}
        message={`Are you sure you want to ${bulkActionConfirm?.type} ${bulkActionConfirm?.count} selected employee records?`}
        confirmText={`${bulkActionConfirm?.type === 'archive' ? 'Archive' : bulkActionConfirm?.type === 'restore' ? 'Restore' : 'Delete'} Selected`}
        onConfirm={() => {
          if (bulkActionConfirm?.type === 'archive') handleBulkArchive();
          else if (bulkActionConfirm?.type === 'restore') handleBulkRestore();
          else if (bulkActionConfirm?.type === 'delete') handleBulkPermanentDelete();
        }}
        onCancel={() => setBulkActionConfirm(null)}
      />
    </div>
  );
}
