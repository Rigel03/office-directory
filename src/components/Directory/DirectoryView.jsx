import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Upload, Download, AlertTriangle,
  RotateCcw, CheckCircle2, FileSpreadsheet, Building2
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
import { DirectoryTabManager } from './DirectoryTabManager';
import { ColumnManager, ALL_COLUMNS } from './ColumnManager';

export function DirectoryView({ onNavigateToUnits }) {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [units, setUnits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Directory Tabs State
  const [activeTabId, setActiveTabId] = useState('all');

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

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filterNeedsReview, setFilterNeedsReview] = useState(false);
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [auditEmployee, setAuditEmployee] = useState(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Tab counts
  const [tabCounts, setTabCounts] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, unitList, groupList, allEmpForCounts] = await Promise.all([
        api.getEmployees({
          search,
          unit: selectedUnit,
          groupId: selectedGroupId,
          status: selectedStatus,
          needsReview: filterNeedsReview ? 'true' : '',
          sortBy,
          sortOrder
        }),
        api.getUnits(),
        api.getGroups(),
        api.getEmployees({}) // unscoped to compute tab badge counts
      ]);
      setEmployees(empList);
      setUnits(unitList);
      setGroups(groupList);

      // Compute counts for quick tabs
      const counts = {
        all: allEmpForCounts.length,
        needs_review: allEmpForCounts.filter(e => e.needs_review).length,
        active: allEmpForCounts.filter(e => e.status === 'active').length,
        on_leave: allEmpForCounts.filter(e => e.status === 'on leave').length,
        detached: allEmpForCounts.filter(e => e.status === 'detached').length,
        unit_hr: allEmpForCounts.filter(e => e.unit === 'Human Resources').length,
        unit_ops: allEmpForCounts.filter(e => e.unit === 'Operations Division').length,
        unit_it: allEmpForCounts.filter(e => e.unit === 'IT Services').length,
        unit_finance: allEmpForCounts.filter(e => e.unit === 'Finance & Budget').length
      };

      // Custom unit tabs
      unitList.forEach(u => {
        counts[u] = allEmpForCounts.filter(e => e.unit === u).length;
      });

      setTabCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedUnit, selectedGroupId, selectedStatus, filterNeedsReview, sortBy, sortOrder]);

  const handleSelectDirectoryTab = (tab) => {
    setActiveTabId(tab.id);
    if (tab.id === 'all') {
      setSelectedUnit('');
      setSelectedStatus('');
      setFilterNeedsReview(false);
    } else if (tab.id === 'needs_review') {
      setSelectedUnit('');
      setSelectedStatus('');
      setFilterNeedsReview(true);
    } else if (tab.filter?.needsReview) {
      setSelectedUnit('');
      setSelectedStatus('');
      setFilterNeedsReview(true);
    } else if (tab.filter?.status) {
      setSelectedUnit('');
      setSelectedStatus(tab.filter.status);
      setFilterNeedsReview(false);
    } else if (tab.filter?.unit) {
      setSelectedUnit(tab.filter.unit);
      setSelectedStatus('');
      setFilterNeedsReview(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allIds = employees.map(e => e.id);
    const areAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
    if (areAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleSaveEmployee = async (formData, id) => {
    if (id) {
      await api.updateEmployee(id, formData);
    } else {
      await api.createEmployee(formData);
    }
    loadData();
  };

  const handleInlineUpdate = async (id, field, value) => {
    await api.patchInline(id, field, value);
    loadData();
  };

  const handleVerify = async (id) => {
    await api.verifyEmployee(id);
    loadData();
  };

  const handleDeleteEmployee = async () => {
    if (!deleteConfirmEmp) return;
    try {
      await api.deleteEmployee(deleteConfirmEmp.id);
      setDeleteConfirmEmp(null);
      loadData();
    } catch (err) {
      alert('Failed to delete employee: ' + err.message);
    }
  };

  const handleBulkMoveUnit = async (targetUnit) => {
    try {
      await api.bulkEmployees({
        action: 'move_unit',
        targetUnit,
        ids: selectedIds
      });
      setSelectedIds([]);
      loadData();
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
      loadData();
    } catch (err) {
      alert('Failed to add to group: ' + err.message);
    }
  };

  const handleBulkVerify = async () => {
    try {
      await api.bulkEmployees({
        action: 'verify',
        ids: selectedIds
      });
      setSelectedIds([]);
      loadData();
    } catch (err) {
      alert('Failed to verify records: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.bulkEmployees({
        action: 'delete',
        ids: selectedIds
      });
      setBulkDeleteConfirm(false);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      alert('Failed to bulk delete: ' + err.message);
    }
  };

  const handleExportDirectory = async (format) => {
    try {
      const blob = await api.exportEmployeesBlob({
        search,
        unit: selectedUnit,
        groupId: selectedGroupId,
        status: selectedStatus,
        needsReview: filterNeedsReview ? 'true' : '',
        ids: selectedIds.length > 0 ? selectedIds.join(',') : '',
        format
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Employee_Directory_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const selectedEmployeeObjects = employees.filter(e => selectedIds.includes(e.id));
  const reviewCount = tabCounts.needs_review || 0;

  return (
    <div className="space-y-4">
      {/* 1. CUSTOMIZABLE DIRECTORY TABS BAR */}
      <DirectoryTabManager
        activeTabId={activeTabId}
        onSelectTab={handleSelectDirectoryTab}
        units={units}
        groups={groups}
        tabCounts={tabCounts}
      />

      {/* 2. SEARCH AND ACTION BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, position, unit, email, desk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column Customizer (Move & Choose Columns to Show) */}
          <ColumnManager columns={columns} onColumnsChange={setColumns} />

          {/* Missing Info Quick Filter Pill */}
          <button
            onClick={() => setFilterNeedsReview(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              filterNeedsReview
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Missing Info</span>
            {reviewCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterNeedsReview ? 'bg-white text-rose-700' : 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
              }`}>
                {reviewCount}
              </span>
            )}
          </button>

          {/* Export Dropdown / Button */}
          <button
            onClick={() => handleExportDirectory('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs"
            title="Export filtered directory to Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExportDirectory('csv')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="Export filtered directory to CSV"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>CSV</span>
          </button>

          {/* Import Button (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Spreadsheet</span>
            </button>
          )}

          {/* Add Employee Button (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => {
                setEditingEmployee(null);
                setShowEmployeeModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. FILTER RIBBON */}
      <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap transition-colors">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Unit Filter with shortcut */}
          <div className="flex items-center gap-1">
            <select
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setActiveTabId('');
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="">All Units / Divisions</option>
              {units.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {isAdmin && onNavigateToUnits && (
              <button
                type="button"
                onClick={onNavigateToUnits}
                title="Edit / Rename Divisions & Units"
                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
              >
                <Building2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setActiveTabId('');
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setActiveTabId('');
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="">All Employment Statuses</option>
            <option value="active">Active</option>
            <option value="on leave">On Leave</option>
            <option value="detached">Detached</option>
          </select>

          {/* Reset Filters */}
          {(selectedUnit || selectedGroupId || selectedStatus || filterNeedsReview || search) && (
            <button
              onClick={() => {
                setSelectedUnit('');
                setSelectedGroupId('');
                setSelectedStatus('');
                setFilterNeedsReview(false);
                setSearch('');
                setActiveTabId('all');
              }}
              className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{employees.length}</span> staff records
        </div>
      </div>

      {/* 4. DIRECTORY TABLE WITH DYNAMIC COLUMNS */}
      <EmployeeTable
        employees={employees}
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
        onVerify={handleVerify}
        onDelete={(emp) => setDeleteConfirmEmp(emp)}
      />

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        selectedEmployees={selectedEmployeeObjects}
        units={units}
        groups={groups}
        onClearSelection={() => setSelectedIds([])}
        onOpenCopyModal={() => setShowCopyModal(true)}
        onMoveToUnit={handleBulkMoveUnit}
        onAddToGroup={handleBulkAddToGroup}
        onVerifySelected={handleBulkVerify}
        onDeleteSelected={() => setBulkDeleteConfirm(true)}
        onAddTraining={() => {
          alert('Switch to the Training & Reports tab to record group training, or select a group in Groups view.');
        }}
      />

      {/* MODAL: Employee Add/Edit */}
      <EmployeeModal
        isOpen={showEmployeeModal}
        onClose={() => {
          setShowEmployeeModal(false);
          setEditingEmployee(null);
        }}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
        availableGroups={groups}
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
        onImportComplete={loadData}
      />

      {/* MODAL: Record Audit Trail */}
      <AuditModal
        isOpen={Boolean(auditEmployee)}
        onClose={() => setAuditEmployee(null)}
        employee={auditEmployee}
      />

      {/* Delete Single Employee Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmEmp)}
        title="Delete Employee Record"
        message={`Are you sure you want to delete ${deleteConfirmEmp?.full_name}? All associated group assignments and training records will also be removed.`}
        confirmText="Delete Employee"
        onConfirm={handleDeleteEmployee}
        onCancel={() => setDeleteConfirmEmp(null)}
      />

      {/* Delete Bulk Confirm */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title={`Delete ${selectedIds.length} Selected Records`}
        message={`Are you sure you want to delete ${selectedIds.length} employee records permanently? This action will be recorded in the audit trail.`}
        confirmText="Delete All Selected"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}
