import React, { useState, useEffect } from 'react';
import {
  Building2, Users, ChevronRight, Layers, ArrowLeft, MoreHorizontal,
  Plus, Edit2, Trash2, Shield, Search, Filter, AlertCircle, Check,
  ChevronDown, ChevronUp, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Upload
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../Common/ConfirmDialog';

export function OrganizationView({ onNavigateToDirectory, onOpenImport }) {
  const { isAdmin } = useAuth();

  // Navigation state: null = landing grid; object = active division
  const [selectedDivisionId, setSelectedDivisionId] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [loadingDivisions, setLoadingDivisions] = useState(true);

  // Active division details
  const [divisionData, setDivisionData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters within division
  const [activeSectionTab, setActiveSectionTab] = useState('ALL'); // 'ALL' | sectionId
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('ALL'); // 'ALL' | unitId
  const [groupBySection, setGroupBySection] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Table Density & Sorting
  const [density, setDensity] = useState(() => localStorage.getItem('org_table_density') || 'comfortable');
  const [sortField, setSortField] = useState('full_name');
  const [sortAsc, setSortAsc] = useState(true);

  // Manage Dialogs
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [renameModal, setRenameModal] = useState(null); // { id, name, short_code, type }
  const [createChildModal, setCreateChildModal] = useState(null); // { parent_id, parent_type, parent_name, target_type }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name, type }
  const [setHeadModal, setSetHeadModal] = useState(null); // { org_unit_id, org_unit_name }

  // Load divisions list
  const loadDivisions = async () => {
    try {
      setLoadingDivisions(true);
      const data = await api.getOrgDivisions();
      setDivisions(data);
    } catch (err) {
      console.error('Failed to load divisions:', err);
    } finally {
      setLoadingDivisions(false);
    }
  };

  // Load active division details
  const loadDivisionDetails = async (id) => {
    if (!id) return;
    try {
      setLoadingDetails(true);
      const data = await api.getOrgDivisionDetails(id);
      setDivisionData(data);
      setActiveSectionTab('ALL');
      setSelectedUnitFilter('ALL');
    } catch (err) {
      console.error('Failed to load division details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadDivisions();
  }, []);

  useEffect(() => {
    if (selectedDivisionId) {
      loadDivisionDetails(selectedDivisionId);
    } else {
      setDivisionData(null);
    }
  }, [selectedDivisionId]);

  // Handle Rename Org Unit
  const handleSaveRename = async (e) => {
    e.preventDefault();
    if (!renameModal || !renameModal.name.trim()) return;
    try {
      await api.updateOrgUnit(renameModal.id, {
        name: renameModal.name.trim(),
        short_code: renameModal.short_code.trim().toUpperCase()
      });
      setRenameModal(null);
      loadDivisions();
      if (selectedDivisionId) {
        loadDivisionDetails(selectedDivisionId);
      }
    } catch (err) {
      alert('Error updating: ' + err.message);
    }
  };

  // Handle Create Section or Unit
  const handleCreateChild = async (e) => {
    e.preventDefault();
    if (!createChildModal || !createChildModal.name.trim()) return;
    try {
      await api.createOrgUnit({
        name: createChildModal.name.trim(),
        short_code: createChildModal.short_code.trim().toUpperCase(),
        type: createChildModal.target_type,
        parent_id: createChildModal.parent_id
      });
      setCreateChildModal(null);
      loadDivisionDetails(selectedDivisionId);
      loadDivisions();
    } catch (err) {
      alert('Error creating ' + createChildModal.target_type + ': ' + err.message);
    }
  };

  // Handle Delete Org Unit
  const handleDeleteOrgUnit = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteOrgUnit(deleteConfirm.id);
      setDeleteConfirm(null);
      if (deleteConfirm.type === 'division') {
        setSelectedDivisionId(null);
      }
      loadDivisions();
      if (selectedDivisionId && deleteConfirm.type !== 'division') {
        loadDivisionDetails(selectedDivisionId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Set Section Head
  const handleSaveHead = async (employeeId) => {
    if (!setHeadModal) return;
    try {
      await api.updateOrgUnit(setHeadModal.org_unit_id, {
        head_employee_id: employeeId || null
      });
      setSetHeadModal(null);
      loadDivisionDetails(selectedDivisionId);
    } catch (err) {
      alert('Error setting head: ' + err.message);
    }
  };

  const toggleSectionCollapse = (secId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  // Filter staff assignments in division view
  const currentSections = divisionData?.sections || [];
  const activeSection = currentSections.find(s => s.id === Number(activeSectionTab));
  const availableUnitsForSection = activeSection?.units || [];

  let filteredAssignments = (divisionData?.assignments || []).filter(item => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.full_name?.toLowerCase().includes(q);
      const matchPos = item.position?.toLowerCase().includes(q);
      const matchLoc = item.location?.toLowerCase().includes(q);
      const matchOrg = item.org_unit_name?.toLowerCase().includes(q);
      if (!matchName && !matchPos && !matchLoc && !matchOrg) return false;
    }

    // Section Tab filter
    if (activeSectionTab !== 'ALL') {
      const secId = Number(activeSectionTab);
      const targetSec = currentSections.find(s => s.id === secId);
      const childUnitIds = targetSec?.units?.map(u => u.id) || [];

      // Check if assignment is directly in section or in one of its units
      const inThisSection = item.org_unit_id === secId || childUnitIds.includes(item.org_unit_id);
      if (!inThisSection) return false;

      // Unit dropdown filter
      if (selectedUnitFilter !== 'ALL') {
        const uId = Number(selectedUnitFilter);
        if (item.org_unit_id !== uId) return false;
      }
    }

    return true;
  });

  // Sort assignments
  filteredAssignments.sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Group by section data structure
  const groupedSectionsMap = {};
  if (groupBySection && divisionData) {
    // Collect under each section
    for (const sec of currentSections) {
      const childUnitIds = sec.units.map(u => u.id);
      const staffInSec = filteredAssignments.filter(a => a.org_unit_id === sec.id || childUnitIds.includes(a.org_unit_id));
      groupedSectionsMap[sec.id] = {
        section: sec,
        staff: staffInSec
      };
    }
  }

  const isCompact = density === 'compact';
  const cellPadding = isCompact ? 'py-2 px-3.5' : 'py-3.5 px-4';

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. LANDING VIEW: GRID OF DIVISION CARDS                  */}
      {/* ======================================================== */}
      {!selectedDivisionId && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-zinc-900 dark:text-white" />
                Office Organizational Structure
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                City Transport & Traffic Management Office (CTTMO) permanent operational divisions, sections, and units.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                {divisions.length} Divisions
              </span>
            </div>
          </div>

          {loadingDivisions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse space-y-4">
                  <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
                  <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2"></div>
                  <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {divisions.map(div => {
                const hasStaff = div.staff_count > 0;
                return (
                  <div
                    key={div.id}
                    onClick={() => setSelectedDivisionId(div.id)}
                    className={`rounded-2xl border transition-all cursor-pointer flex flex-col justify-between p-6 shadow-xs group ${
                      hasStaff
                        ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-white hover:shadow-md'
                        : 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/60 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div>
                      {/* Top Code Badge & Staff Pill */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                          {div.short_code}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          hasStaff
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-2xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        }`}>
                          {div.staff_count} {div.staff_count === 1 ? 'person' : 'people'}
                        </span>
                      </div>

                      {/* Division Name */}
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white leading-snug group-hover:underline">
                        {div.name}
                      </h3>

                      {/* Division Head */}
                      <div className="mt-3 text-xs">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium">Division Head: </span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {div.head_name || 'Not Designated'}
                        </span>
                      </div>

                      {/* Floor Location */}
                      {div.default_floor && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          Base location: {div.default_floor}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      {hasStaff ? (
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Open Division Structure & Staff
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-zinc-400">0 staff assigned</span>
                          {isAdmin && onOpenImport && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenImport();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              Import staff
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DIVISION VIEW: FULL WIDTH WITH NO SIDE LIST            */}
      {/* ======================================================== */}
      {selectedDivisionId && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Breadcrumb & Switcher Header */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Breadcrumb: CTTMO › Division › Section › Unit */}
              <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-2 text-xs font-semibold">
                <button
                  onClick={() => setSelectedDivisionId(null)}
                  className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  CTTMO
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />

                <span className="text-zinc-950 dark:text-white font-bold">
                  {divisionData?.division?.name}
                </span>

                {activeSectionTab !== 'ALL' && activeSection && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    <button
                      onClick={() => setSelectedUnitFilter('ALL')}
                      className="text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer"
                    >
                      {activeSection.name}
                    </button>
                  </>
                )}

                {selectedUnitFilter !== 'ALL' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-zinc-950 dark:text-white font-bold">
                      {availableUnitsForSection.find(u => u.id === Number(selectedUnitFilter))?.name}
                    </span>
                  </>
                )}
              </nav>

              {/* Right Controls: Division Switcher & Manage Dropdown */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Division Dropdown Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Switch Division:</span>
                  <select
                    value={selectedDivisionId || ''}
                    onChange={(e) => setSelectedDivisionId(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900"
                  >
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.short_code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Back to all divisions */}
                <button
                  onClick={() => setSelectedDivisionId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Divisions Overview
                </button>

                {/* Manage Menu (⋯ Overflow - Admin only) */}
                {isAdmin && (
                  <div className="relative">
                    <button
                      onClick={() => setShowManageMenu(!showManageMenu)}
                      aria-label="Manage division settings"
                      className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 cursor-pointer shadow-2xs"
                      title="Manage Division Structure"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {showManageMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1.5 z-40 text-xs animate-in fade-in">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                          Manage Division
                        </div>
                        <button
                          onClick={() => {
                            setShowManageMenu(false);
                            setRenameModal({
                              id: divisionData.division.id,
                              name: divisionData.division.name,
                              short_code: divisionData.division.short_code,
                              type: 'division'
                            });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Rename Division
                        </button>

                        <button
                          onClick={() => {
                            setShowManageMenu(false);
                            setCreateChildModal({
                              parent_id: divisionData.division.id,
                              parent_name: divisionData.division.name,
                              target_type: 'section',
                              name: '',
                              short_code: ''
                            });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Permanent Section...
                        </button>

                        <button
                          onClick={() => {
                            setShowManageMenu(false);
                            setSetHeadModal({
                              org_unit_id: divisionData.division.id,
                              org_unit_name: divisionData.division.name
                            });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Designate Division Head
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Division Info Banner & Disclaimers */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-zinc-950 dark:text-white text-sm">
                  {divisionData?.division?.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                  Total Unique Personnel: {divisionData?.unique_staff_count || 0}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 italic">
                * Division total counts unique individuals. Section and unit sub-counts may overlap for dual assignments.
              </p>
            </div>
          </div>

          {/* Section Tabs Ribbon, Unit Filter, Search, and Group-by-Section Switch */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              {/* Section Tabs (plus "All") */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => {
                    setActiveSectionTab('ALL');
                    setSelectedUnitFilter('ALL');
                  }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                    activeSectionTab === 'ALL'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-bold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  All Sections ({divisionData?.unique_staff_count || 0})
                </button>

                {currentSections.map(sec => {
                  const isTabActive = activeSectionTab === String(sec.id);
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSectionTab(String(sec.id));
                        setSelectedUnitFilter('ALL');
                      }}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                        isTabActive
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      <span>{sec.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        isTabActive
                          ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {sec.staff_count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Unit Dropdown Filter (when section has units) */}
              <div className="flex items-center gap-3 flex-wrap">
                {activeSectionTab !== 'ALL' && availableUnitsForSection.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 font-medium">Unit:</span>
                    <select
                      value={selectedUnitFilter}
                      onChange={(e) => setSelectedUnitFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    >
                      <option value="ALL">All Units in {activeSection?.name}</option>
                      {availableUnitsForSection.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.staff_count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Group by section toggle switch */}
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none font-semibold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={groupBySection}
                    onChange={(e) => setGroupBySection(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                  <span>Group by Section</span>
                </label>

                {/* Density Toggle */}
                <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold">
                  <button
                    onClick={() => {
                      setDensity('comfortable');
                      localStorage.setItem('org_table_density', 'comfortable');
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      density === 'comfortable' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs' : 'text-zinc-500'
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    onClick={() => {
                      setDensity('compact');
                      localStorage.setItem('org_table_density', 'compact');
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      density === 'compact' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs' : 'text-zinc-500'
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </div>

            {/* Search Box within Division */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff in this division by name, position, section, desk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. STAFF TABLE (FULL WIDTH, NO CLIPPING, SCROLLABLE)     */}
          {/* ======================================================== */}
          {loadingDetails ? (
            <div className="p-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              Loading division roster...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <Users className="w-8 h-8 text-zinc-400 mx-auto" />
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">No personnel found</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                No employees are assigned to this section or match the active search criteria.
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : groupBySection ? (
            /* GROUPED BY SECTION ACCORDION / EXPANDABLE VIEW */
            <div className="space-y-4">
              {Object.keys(groupedSectionsMap).map(secId => {
                const group = groupedSectionsMap[secId];
                const isCollapsed = collapsedSections[secId];
                return (
                  <div key={secId} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                    {/* Collapsible Section Header */}
                    <div
                      onClick={() => toggleSectionCollapse(secId)}
                      className="p-3.5 bg-zinc-100/60 dark:bg-zinc-800/50 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
                        <span className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                          {group.section.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                          {group.staff.length} staff
                        </span>
                        {group.section.head_name && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-2 hidden sm:inline">
                            Head: <strong>{group.section.head_name}</strong>
                          </span>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setCreateChildModal({
                              parent_id: group.section.id,
                              parent_name: group.section.name,
                              target_type: 'unit',
                              name: '',
                              short_code: ''
                            })}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50"
                          >
                            + Add Unit
                          </button>
                        </div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <StaffAssignmentTable
                          assignments={group.staff}
                          cellPadding={cellPadding}
                          onNavigateToDirectory={onNavigateToDirectory}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* FLAT FULL-WIDTH TABLE */
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <StaffAssignmentTable
                  assignments={filteredAssignments}
                  cellPadding={cellPadding}
                  onNavigateToDirectory={onNavigateToDirectory}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENAME MODAL */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Rename {renameModal.type}
            </h3>
            <form onSubmit={handleSaveRename} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={renameModal.name}
                  onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  value={renameModal.short_code}
                  onChange={(e) => setRenameModal({ ...renameModal, short_code: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameModal(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SECTION / UNIT MODAL */}
      {createChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white capitalize">
              Add New {createChildModal.target_type} under {createChildModal.parent_name}
            </h3>
            <form onSubmit={handleCreateChild} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {createChildModal.target_type === 'section' ? 'Section Name' : 'Unit Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${createChildModal.target_type === 'section' ? 'Transport Operations Section' : 'Traffic Signals Unit'}`}
                  value={createChildModal.name}
                  onChange={(e) => setCreateChildModal({ ...createChildModal, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TOS or TSU"
                  value={createChildModal.short_code}
                  onChange={(e) => setCreateChildModal({ ...createChildModal, short_code: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateChildModal(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                >
                  Create {createChildModal.target_type}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title={`Delete ${deleteConfirm?.type || 'Org Unit'}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? Deletion is blocked if there are active staff or child units assigned.`}
        confirmText="Delete"
        onConfirm={handleDeleteOrgUnit}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

// Subcomponent: Reusable Staff Assignment Table
function StaffAssignmentTable({ assignments, cellPadding, onNavigateToDirectory }) {
  return (
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider sticky top-0 z-10">
          <th className="py-2.5 px-4 min-w-[210px]">Name & Role</th>
          <th className="py-2.5 px-4 min-w-[190px]">Position</th>
          <th className="py-2.5 px-4 min-w-[190px]">Section · Unit Placement</th>
          <th className="py-2.5 px-4 min-w-[150px]">Desk / Location</th>
          <th className="py-2.5 px-4 min-w-[170px]">Contact</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {assignments.map(assn => {
          const isSecondary = !assn.is_primary;

          return (
            <tr
              key={`${assn.assignment_id}-${assn.employee_id}`}
              className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                isSecondary ? 'opacity-80 bg-zinc-50/40 dark:bg-zinc-900/30' : ''
              }`}
            >
              {/* Name & Role badge */}
              <td className={`${cellPadding} font-semibold text-zinc-950 dark:text-white`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {assn.title && (
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                      {assn.title}
                    </span>
                  )}
                  <span>{assn.full_name}</span>

                  {/* Role Badge (Division Head / Section Head / Staff) */}
                  {assn.assignment_role === 'head' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs">
                      {assn.org_unit_type === 'division' ? 'Division Head' : 'Section Head'}
                    </span>
                  )}

                  {/* Secondary Assignment Badge */}
                  {isSecondary && (
                    <span
                      title={`Secondary assignment. Primary placement is in: ${assn.primary_placement?.org_name || 'Primary unit'}`}
                      className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600"
                    >
                      Also
                    </span>
                  )}
                </div>

                {isSecondary && assn.primary_placement && (
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Primary: {assn.primary_placement.org_name}
                  </div>
                )}
              </td>

              {/* Position */}
              <td className={`${cellPadding} text-zinc-700 dark:text-zinc-300 font-medium`}>
                {assn.position || '(Missing Position)'}
              </td>

              {/* Section · Unit */}
              <td className={`${cellPadding} text-zinc-900 dark:text-zinc-100`}>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  {assn.org_unit_short_code || assn.org_unit_name}
                </span>
                <span className="text-zinc-400 text-[11px] ml-1.5">
                  ({assn.org_unit_type})
                </span>
              </td>

              {/* Desk / Location */}
              <td className={`${cellPadding} text-zinc-500 dark:text-zinc-400`}>
                {assn.location || '—'}
              </td>

              {/* Contact */}
              <td className={`${cellPadding} text-zinc-600 dark:text-zinc-400`}>
                <div>{assn.email || '—'}</div>
                {assn.phone && <div className="text-[10px] text-zinc-400">{assn.phone}</div>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
