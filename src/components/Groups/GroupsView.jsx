import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Trash2, Edit2, Search, X, Users,
  Building, UserPlus, Check, MoreVertical, AlertCircle
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../Common/ConfirmDialog';

export function GroupsView() {
  const { isAdmin } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null); // active group for right drawer
  const [drawerDetails, setDrawerDetails] = useState(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Dialogs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Group Form Data
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    type: 'training batch',
    description: '',
    scope: 'office-wide',
    scope_division_id: ''
  });

  // Divisions list for scope dropdown
  const [divisions, setDivisions] = useState([]);

  // Candidate member modal state
  const [candidateEmployees, setCandidateEmployees] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateDivisionFilter, setCandidateDivisionFilter] = useState('all');
  const [candidateSectionFilter, setCandidateSectionFilter] = useState('all');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('all');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (scopeFilter !== 'all') params.scope = scopeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await api.getGroups(params);
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDivisions = async () => {
    try {
      const data = await api.getOrgDivisions();
      setDivisions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadGroupDrawer = async (groupId) => {
    if (!groupId) return;
    try {
      setLoadingDrawer(true);
      const data = await api.getGroup(groupId);
      setDrawerDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDrawer(false);
    }
  };

  useEffect(() => {
    loadGroups();
    loadDivisions();
  }, [typeFilter, scopeFilter, searchQuery]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDrawer(selectedGroup.id);
    } else {
      setDrawerDetails(null);
    }
  }, [selectedGroup]);

  // Open candidate member selection dialog
  const openAddMembersDialog = async () => {
    try {
      const emps = await api.getEmployees();
      setCandidateEmployees(emps);
      setSelectedCandidateIds([]);
      setCandidateSearch('');
      setCandidateDivisionFilter('all');
      setCandidateSectionFilter('all');
      setCandidateStatusFilter('all');
      setShowAddMembersModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedCandidateIds.length === 0 || !selectedGroup) return;
    try {
      await api.addGroupMembers(selectedGroup.id, selectedCandidateIds);
      setShowAddMembersModal(false);
      loadGroupDrawer(selectedGroup.id);
      loadGroups();
    } catch (err) {
      alert('Failed to add members: ' + err.message);
    }
  };

  const handleRemoveMember = async (empId) => {
    if (!selectedGroup) return;
    try {
      await api.removeGroupMember(selectedGroup.id, empId);
      loadGroupDrawer(selectedGroup.id);
      loadGroups();
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: groupFormData.name.trim(),
        type: groupFormData.type,
        description: groupFormData.description.trim(),
        scope: groupFormData.scope,
        scope_division_id: groupFormData.scope === 'division' ? Number(groupFormData.scope_division_id) : null
      };

      if (editingGroup) {
        await api.updateGroup(editingGroup.id, payload);
      } else {
        await api.createGroup(payload);
      }

      setShowCreateModal(false);
      setEditingGroup(null);
      setGroupFormData({
        name: '',
        type: 'training batch',
        description: '',
        scope: 'office-wide',
        scope_division_id: ''
      });
      loadGroups();
      if (selectedGroup && editingGroup && selectedGroup.id === editingGroup.id) {
        loadGroupDrawer(selectedGroup.id);
      }
    } catch (err) {
      alert('Failed to save group: ' + err.message);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteGroup(deleteConfirm.id);
      setDeleteConfirm(null);
      if (selectedGroup && selectedGroup.id === deleteConfirm.id) {
        setSelectedGroup(null);
      }
      loadGroups();
    } catch (err) {
      alert('Failed to delete group: ' + err.message);
    }
  };

  // Filter candidates for Add Members modal
  const existingMemberIds = new Set(drawerDetails?.members?.map(m => m.id) || []);
  const filteredCandidates = candidateEmployees.filter(emp => {
    // If group is division-scoped, limit candidates to that division
    if (drawerDetails?.scope === 'division' && drawerDetails?.scope_division_id) {
      const divMatch = emp.unit_id === drawerDetails.scope_division_id ||
                       emp.unit === drawerDetails.scope_division_name ||
                       emp.unit_code === drawerDetails.scope_division_short_code;
      if (!divMatch) return false;
    }

    if (candidateSearch.trim()) {
      const q = candidateSearch.toLowerCase();
      const matchName = emp.full_name?.toLowerCase().includes(q);
      const matchPos = emp.position?.toLowerCase().includes(q);
      if (!matchName && !matchPos) return false;
    }

    if (candidateDivisionFilter !== 'all') {
      if (emp.unit !== candidateDivisionFilter && emp.unit_code !== candidateDivisionFilter) return false;
    }

    if (candidateSectionFilter !== 'all') {
      if (emp.section !== candidateSectionFilter && emp.sub_unit !== candidateSectionFilter) return false;
    }

    if (candidateStatusFilter !== 'all') {
      if (emp.status !== candidateStatusFilter) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-900 dark:text-white" />
            Cross-Cutting Groups & Committees
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Training batches, taskforces, working teams, and multi-division committees. Permanent units belong under Organization.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingGroup(null);
              setGroupFormData({
                name: '',
                type: 'training batch',
                description: '',
                scope: 'office-wide',
                scope_division_id: ''
              });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Group</span>
          </button>
        )}
      </div>

      {/* Filter Ribbon: Search, Type Dropdown, Scope Dropdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search groups by name or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        {/* Type Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
          >
            <option value="all">All Group Types</option>
            <option value="training batch">Training Batch</option>
            <option value="team">Team / Taskforce</option>
            <option value="committee">Committee</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Scope Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Scope:</span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
          >
            <option value="all">All Scopes</option>
            <option value="office-wide">Office-Wide</option>
            <option value="division">Division Specific</option>
          </select>
        </div>
      </div>

      {/* Main Groups Table (Full-Width) */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
            <Layers className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">No groups match your filter.</p>
            {(typeFilter !== 'all' || scopeFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setScopeFilter('all');
                  setSearchQuery('');
                }}
                className="text-zinc-900 dark:text-zinc-100 font-bold underline cursor-pointer mt-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider sticky top-0">
                  <th className="py-3 px-4 min-w-[200px]">Group Name</th>
                  <th className="py-3 px-4 min-w-[140px]">Type</th>
                  <th className="py-3 px-4 min-w-[150px]">Scope</th>
                  <th className="py-3 px-4 min-w-[100px]">Members</th>
                  <th className="py-3 px-4 min-w-[130px]">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {groups.map(g => (
                  <tr
                    key={g.id}
                    onClick={() => setSelectedGroup(g)}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-zinc-950 dark:text-white">
                      <div>{g.name}</div>
                      {g.description && (
                        <p className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {g.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 capitalize text-zinc-700 dark:text-zinc-300">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        {g.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                      {g.scope === 'division' ? (
                        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {g.scope_division_short_code || g.scope_division_name || 'Division'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">Office-Wide</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                        {g.member_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {g.created_at ? g.created_at.split(' ')[0] : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-zinc-900 dark:text-zinc-100 font-semibold underline text-xs">
                        View Drawer &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* RIGHT-SIDE DRAWER                                         */}
      {/* ======================================================== */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 h-full shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                    {drawerDetails?.type || selectedGroup.type}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    Scope: {drawerDetails?.scope === 'division' ? `Division (${drawerDetails?.scope_division_short_code})` : 'Office-Wide'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white leading-tight">
                  {drawerDetails?.name || selectedGroup.name}
                </h3>
                {drawerDetails?.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                    {drawerDetails.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setEditingGroup(drawerDetails || selectedGroup);
                        setGroupFormData({
                          name: drawerDetails?.name || selectedGroup.name,
                          type: drawerDetails?.type || selectedGroup.type,
                          description: drawerDetails?.description || selectedGroup.description || '',
                          scope: drawerDetails?.scope || selectedGroup.scope || 'office-wide',
                          scope_division_id: drawerDetails?.scope_division_id || ''
                        });
                        setShowCreateModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      title="Edit info"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(drawerDetails || selectedGroup)}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 cursor-pointer"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Member Action Bar */}
            <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs bg-zinc-100/40 dark:bg-zinc-800/40">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                Enrolled Members ({drawerDetails?.members?.length || 0})
              </span>
              {isAdmin && (
                <button
                  onClick={openAddMembersDialog}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold cursor-pointer shadow-2xs hover:bg-zinc-800"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Members...
                </button>
              )}
            </div>

            {/* Member Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingDrawer ? (
                <div className="p-12 text-center text-xs text-zinc-400">Loading members...</div>
              ) : (drawerDetails?.members || []).length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
                  <p>No members enrolled in this group yet.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Position</th>
                      <th className="py-2 px-3">Division · Section</th>
                      {isAdmin && <th className="py-2 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {drawerDetails.members.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 font-semibold text-zinc-950 dark:text-white">
                          <div className="flex items-center gap-1">
                            {m.title && <span className="text-[11px] font-bold">{m.title}</span>}
                            <span>{m.full_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">{m.position || '—'}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">
                          <div>{m.division_short_code || m.unit_code || m.unit || '—'}</div>
                          {m.section_name && <div className="text-[10px]">{m.section_name}</div>}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                              title="Remove from group"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT GROUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              {editingGroup ? 'Edit Group Information' : 'Create New Group'}
            </h3>

            {/* Note clarifying Organization vs Groups */}
            <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
              <span>
                <strong>Note:</strong> Permanent office divisions, sections, and units belong under the <strong>Organization</strong> tab. Use Groups for training batches, temporary committees, and cross-cutting teams.
              </span>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q2 Induction Batch or Safety Committee"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Type *</label>
                  <select
                    value={groupFormData.type}
                    onChange={(e) => setGroupFormData({ ...groupFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="training batch">Training Batch</option>
                    <option value="team">Team / Taskforce</option>
                    <option value="committee">Committee</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Scope *</label>
                  <select
                    value={groupFormData.scope}
                    onChange={(e) => setGroupFormData({ ...groupFormData, scope: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="office-wide">Office-Wide</option>
                    <option value="division">Division-Scoped</option>
                  </select>
                </div>
              </div>

              {groupFormData.scope === 'division' && (
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Target Division *</label>
                  <select
                    required
                    value={groupFormData.scope_division_id}
                    onChange={(e) => setGroupFormData({ ...groupFormData, scope_division_id: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="">Select Division...</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.short_code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Description / Mandate</label>
                <textarea
                  rows={3}
                  placeholder="Describe the mandate or purpose of this group..."
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold cursor-pointer"
                >
                  {editingGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBERS DIALOG (WITH ADVANCED SEARCH & FILTERS) */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Add Personnel to "{drawerDetails?.name || selectedGroup?.name}"
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Select staff to enroll. {selectedCandidateIds.length} person(s) currently selected.
                </p>
              </div>
              <button onClick={() => setShowAddMembersModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Filters */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <input
                type="text"
                placeholder="Search staff name..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
              />
              <select
                value={candidateStatusFilter}
                onChange={(e) => setCandidateStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-950 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="on leave">On Leave</option>
                <option value="detached">Detached</option>
              </select>
              <div className="text-right text-[11px] flex items-center justify-end text-zinc-500 font-semibold">
                {filteredCandidates.length} matches
              </div>
            </div>

            {/* Candidate List Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
                    <th className="py-2 px-3 w-10"></th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Position</th>
                    <th className="py-2 px-3">Division</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredCandidates.map(emp => {
                    const alreadyInGroup = existingMemberIds.has(emp.id);
                    const isSelected = selectedCandidateIds.includes(emp.id);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${alreadyInGroup ? 'opacity-50' : 'cursor-pointer'}`}
                        onClick={() => {
                          if (alreadyInGroup) return;
                          setSelectedCandidateIds(prev =>
                            prev.includes(emp.id) ? prev.filter(x => x !== emp.id) : [...prev, emp.id]
                          );
                        }}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={alreadyInGroup || isSelected}
                            disabled={alreadyInGroup}
                            onChange={() => {}}
                            className="rounded border-zinc-300 text-zinc-900"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-zinc-950 dark:text-white">
                          {emp.full_name}
                          {alreadyInGroup && <span className="text-[10px] text-zinc-400 ml-1.5">(Already enrolled)</span>}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 dark:text-zinc-300">{emp.position}</td>
                        <td className="py-2 px-3 text-zinc-500">{emp.unit_code || emp.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Candidate Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-900">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {selectedCandidateIds.length} person(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMembersModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedCandidateIds.length === 0}
                  onClick={handleAddMembersSubmit}
                  className="px-5 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Enroll Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete Group"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? All member associations will be cleared.`}
        confirmText="Delete Group"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
