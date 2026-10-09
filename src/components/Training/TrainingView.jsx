import React, { useState, useEffect } from 'react';
import {
  Award, Download, Plus, Filter, Calendar, Clock, Building, Users,
  Trash2, X, CheckCircle, Search, FileSpreadsheet, ChevronDown, FileText
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../Common/ConfirmDialog';

export function TrainingView() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [units, setUnits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Form State for Adding Training (Single or Bulk)
  const [addMode, setAddMode] = useState('single'); // 'single' | 'group'
  const [allEmployees, setAllEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    groupId: '',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    hours: 8,
    provider: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recList, qList, uList, gList] = await Promise.all([
        api.getTrainingRecords({
          quarter: selectedQuarter,
          unit: selectedUnit,
          groupId: selectedGroupId,
          search
        }),
        api.getQuarters(),
        api.getUnits(),
        api.getGroups()
      ]);
      setRecords(recList);
      setQuarters(qList);
      setUnits(uList);
      setGroups(gList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedQuarter, selectedUnit, selectedGroupId, search]);

  const openAddModal = async () => {
    try {
      const emps = await api.getEmployees();
      setAllEmployees(emps);
      setFormData({
        employeeId: emps.length > 0 ? emps[0].id : '',
        groupId: groups.length > 0 ? groups[0].id : '',
        title: '',
        date: new Date().toISOString().slice(0, 10),
        hours: 8,
        provider: ''
      });
      setShowAddModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTraining = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (addMode === 'single') {
        await api.createTraining({
          employeeId: Number(formData.employeeId),
          title: formData.title,
          date: formData.date,
          hours: Number(formData.hours),
          provider: formData.provider
        });
      } else {
        await api.bulkCreateTraining({
          groupId: Number(formData.groupId),
          title: formData.title,
          date: formData.date,
          hours: Number(formData.hours),
          provider: formData.provider
        });
      }
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert('Failed to save training record: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteTraining(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      alert('Failed to delete training record: ' + err.message);
    }
  };

  const handleExport = async (format) => {
    try {
      const blob = await api.exportTrainingBlob({
        quarter: selectedQuarter,
        unit: selectedUnit,
        groupId: selectedGroupId,
        format
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quarterly_Training_Report_${(selectedQuarter || 'All').replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Metrics calculation
  const totalHours = records.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
  const uniqueEmployees = new Set(records.map(r => r.employee_id)).size;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center gap-4 transition-colors">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Records</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{records.length}</p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center gap-4 transition-colors">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unique Trainees</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{uniqueEmployees}</p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center gap-4 transition-colors">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Training Hours</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalHours.toLocaleString()} hrs</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Export/Add buttons */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quarter filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Quarter:</span>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Quarters</option>
              {quarters.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* Unit filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Units</option>
              {units.map(u => {
                const uName = typeof u === 'string' ? u : u.name;
                const uDisplay = typeof u === 'string' ? u : `[${u.short_code}] ${u.name}`;
                return <option key={uName} value={uName}>{uDisplay}</option>;
              })}
            </select>
          </div>

          {/* Group filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Group:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Groups</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search training or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 w-44"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Combined Export Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
              title="Export quarterly training report"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Report</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExport('xlsx');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExport('csv');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-700"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="h-9 inline-flex items-center gap-1.5 px-3.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Training Record</span>
            </button>
          )}
        </div>
      </div>


      {/* Quarterly Training Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[180px]">Employee Name</th>
                <th className="py-3 px-4 min-w-[160px]">Position</th>
                <th className="py-3 px-4 min-w-[140px]">Unit / Division</th>
                <th className="py-3 px-4 min-w-[220px]">Training Title</th>
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4 w-20 text-right">Hours</th>
                <th className="py-3 px-4 min-w-[160px]">Provider / Institution</th>
                <th className="py-3 px-4 w-24">Quarter</th>
                {isAdmin && <th className="py-3 px-4 text-right w-16">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400">
                    No training records found for the selected filters.
                  </td>
                </tr>
              ) : (
                records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{rec.full_name}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{rec.position || '(None)'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{rec.unit || '(None)'}</td>
                    <td className="py-3 px-4 font-medium text-indigo-950 dark:text-indigo-200">{rec.title}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">{rec.date}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">{rec.hours} hrs</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{rec.provider || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {rec.quarter}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteConfirm(rec)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add Training Record (Single or Bulk) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-semibold text-slate-900">Add Training Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTraining} className="p-6 space-y-4 text-xs">
              {/* Mode switch */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setAddMode('single')}
                  className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
                    addMode === 'single' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Single Employee
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('group')}
                  className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
                    addMode === 'group' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Bulk Add to Group
                </button>
              </div>

              {/* Target recipient */}
              {addMode === 'single' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {allEmployees.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name} ({e.unit || 'No Unit'})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Group *</label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Training record will be added to all members currently in this group.
                  </p>
                </div>
              )}

              {/* Course Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Training Course / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supervisory Development Course Track 1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Date & Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Conducted *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Quarter is auto-derived from this date.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hours *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Training Provider / Organizer</label>
                <input
                  type="text"
                  placeholder="e.g. Civil Service Commission or DICT"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 rounded-lg hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {formSubmitting ? 'Saving...' : 'Save Training'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Record Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete Training Record"
        message={`Delete training record "${deleteConfirm?.title}" for ${deleteConfirm?.full_name}?`}
        confirmText="Delete"
        onConfirm={handleDeleteRecord}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
