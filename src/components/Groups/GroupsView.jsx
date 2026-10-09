import React, { useState, useEffect } from 'react';
import {
  Users, Plus, FolderInput, UserMinus, Trash2, Edit2, Search,
  CheckCircle, ArrowRight, X, AlertCircle, Building, Layers, Check, Tag
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../Common/ConfirmDialog';

export function GroupsView() {
  const { isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('groups'); // 'groups' | 'units'

  // GROUPS STATE
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // UNITS STATE
  const [unitSummaries, setUnitSummaries] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitMembers, setUnitMembers] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [editingUnitName, setEditingUnitName] = useState(null); // { oldUnit: '', newUnit: '' }
  const [newUnitInput, setNewUnitInput] = useState('');
  const [selectedUnitMemberIds, setSelectedUnitMemberIds] = useState([]);

  // Modals & Dialogs
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMoveUnitMembersModal, setShowMoveUnitMembersModal] = useState(false);
  const [targetMoveUnit, setTargetMoveUnit] = useState('');
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);

  // Group Form Data
  const [groupFormData, setGroupFormData] = useState({ name: '', type: 'training batch', description: '' });
  const [editingGroup, setEditingGroup] = useState(null);

  // Candidate member search
  const [allEmployees, setAllEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [candidateMemberIds, setCandidateMemberIds] = useState([]);

  // --- GROUPS LOGIC ---
  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const data = await api.getGroups(activeType === 'all' ? '' : activeType);
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadGroupDetails = async (id) => {
    if (!id) return;
    try {
      const data = await api.getGroup(id);
      setSelectedGroupDetails(data);
      setSelectedMemberIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  // --- UNITS LOGIC ---
  const loadUnits = async () => {
    try {
      setLoadingUnits(true);
      const data = await api.getUnitsSummary();
      const formatted = (data || []).map(u => ({
        ...u,
        unit: u.unit || u.name
      }));
      setUnitSummaries(formatted);
      if (formatted.length > 0 && !selectedUnit) {
        setSelectedUnit(formatted[0].unit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadUnitMembers = async (unitName) => {
    if (!unitName) return;
    try {
      const emps = await api.getEmployees({ unit: unitName });
      setUnitMembers(emps);
      setSelectedUnitMemberIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadGroups();
    loadUnits();
  }, [activeType]);

  useEffect(() => {
    if (selectedGroupId && activeSubTab === 'groups') {
      loadGroupDetails(selectedGroupId);
    }
  }, [selectedGroupId, activeSubTab]);

  useEffect(() => {
    if (activeSubTab === 'units') {
      loadUnits();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (selectedUnit && activeSubTab === 'units') {
      loadUnitMembers(selectedUnit);
    }
  }, [selectedUnit, activeSubTab]);

  // Handle Save / Rename Unit across all employees
  const handleRenameUnitSubmit = async (e) => {
    e.preventDefault();
    if (!editingUnitName?.oldUnit || !editingUnitName?.newUnit.trim()) return;
    try {
      await api.renameUnit(editingUnitName.oldUnit, editingUnitName.newUnit.trim());
      const updatedName = editingUnitName.newUnit.trim();
      setEditingUnitName(null);
      setSelectedUnit(updatedName);
      loadUnits();
      loadUnitMembers(updatedName);
    } catch (err) {
      alert('Failed to rename division: ' + err.message);
    }
  };

  // Handle Move Unit Members to Another Unit
  const handleMoveUnitMembers = async () => {
    if (selectedUnitMemberIds.length === 0 || !targetMoveUnit) return;
    try {
      await api.bulkEmployees({
        action: 'move_unit',
        targetUnit: targetMoveUnit,
        ids: selectedUnitMemberIds
      });
      setShowMoveUnitMembersModal(false);
      setSelectedUnitMemberIds([]);
      loadUnits();
      loadUnitMembers(selectedUnit);
    } catch (err) {
      alert('Failed to move employees: ' + err.message);
    }
  };

  // Handle Add Member to Group
  const openAddMembers = async () => {
    try {
      const emps = await api.getEmployees();
      const existingIds = new Set(selectedGroupDetails?.members?.map(m => m.id) || []);
      setAllEmployees(emps.filter(e => !existingIds.has(e.id)));
      setCandidateMemberIds([]);
      setEmpSearch('');
      setShowAddMemberModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (candidateMemberIds.length === 0) return;
    try {
      await api.addGroupMembers(selectedGroupId, candidateMemberIds);
      setShowAddMemberModal(false);
      loadGroupDetails(selectedGroupId);
      loadGroups();
    } catch (err) {
      alert('Failed to add members: ' + err.message);
    }
  };

  const handleRemoveMember = async (employeeId) => {
    try {
      await api.removeGroupMember(selectedGroupId, employeeId);
      loadGroupDetails(selectedGroupId);
      loadGroups();
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.updateGroup(editingGroup.id, groupFormData);
      } else {
        const created = await api.createGroup(groupFormData);
        setSelectedGroupId(created.id);
      }
      setShowCreateGroupModal(false);
      setEditingGroup(null);
      setGroupFormData({ name: '', type: 'training batch', description: '' });
      loadGroups();
    } catch (err) {
      alert('Failed to save group: ' + err.message);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupConfirm) return;
    try {
      await api.deleteGroup(deleteGroupConfirm.id);
      setDeleteGroupConfirm(null);
      setSelectedGroupId(null);
      setSelectedGroupDetails(null);
      loadGroups();
    } catch (err) {
      alert('Failed to delete group: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Main Navigation: GROUPS vs DIVISIONS & UNITS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl">
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'groups'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Groups Management</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeSubTab === 'groups'
                ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}>
              {groups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('units')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'units'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Divisions & Units</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeSubTab === 'units'
                ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}>
              {unitSummaries.length}
            </span>
          </button>
        </div>

        {/* Action Button */}
        {isAdmin && activeSubTab === 'groups' && (
          <button
            onClick={() => {
              setEditingGroup(null);
              setGroupFormData({ name: '', type: 'training batch', description: '' });
              setShowCreateGroupModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* VIEW A: GROUPS MANAGEMENT                                */}
      {/* ======================================================== */}
      {activeSubTab === 'groups' && (
        <div className="space-y-6">
          {/* Group Type Filters */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl text-xs font-semibold w-fit flex-wrap">
            {[
              { id: 'all', label: 'All Groups' },
              { id: 'training batch', label: 'Training Batches' },
              { id: 'team', label: 'Teams' },
              { id: 'committee', label: 'Committees' },
              { id: 'other', label: 'Other' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeType === t.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Groups list */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
                Select a Group to Edit
              </div>

              {loadingGroups ? (
                <div className="p-8 text-center text-xs text-zinc-400">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xs text-zinc-400">
                  No groups created in this category.
                </div>
              ) : (
                groups.map(g => {
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-950 dark:border-white shadow-xs'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-zinc-950 dark:text-white truncate">{g.name}</h4>
                          <span className="inline-block px-2 py-0.5 mt-1 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {g.type}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold shadow-2xs whitespace-nowrap shrink-0">
                          {g.member_count} {g.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      {g.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">{g.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Selected group detail */}
            <div className="lg:col-span-8">
              {selectedGroupDetails ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                  <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-zinc-950 dark:text-white">{selectedGroupDetails.name}</h3>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap shrink-0">
                          {selectedGroupDetails.type}
                        </span>
                      </div>
                      {selectedGroupDetails.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{selectedGroupDetails.description}</p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          onClick={() => {
                            setEditingGroup(selectedGroupDetails);
                            setGroupFormData({
                              name: selectedGroupDetails.name,
                              type: selectedGroupDetails.type,
                              description: selectedGroupDetails.description || ''
                            });
                            setShowCreateGroupModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
                          title="Edit group name or description"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Info</span>
                        </button>
                        <button
                          onClick={() => setDeleteGroupConfirm(selectedGroupDetails)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                          title="Delete group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={openAddMembers}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Members</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Group Members Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          <th className="py-2.5 px-4 min-w-[170px]">Name</th>
                          <th className="py-2.5 px-4 min-w-[180px]">Position</th>
                          <th className="py-2.5 px-4 min-w-[160px]">Unit / Division</th>
                          <th className="py-2.5 px-4 min-w-[160px]">Office Desk</th>
                          {isAdmin && <th className="py-2.5 px-4 text-right w-20">Remove</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                        {selectedGroupDetails.members && selectedGroupDetails.members.length > 0 ? (
                          selectedGroupDetails.members.map(m => (
                            <tr key={m.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                              <td className="py-2.5 px-4 font-semibold text-zinc-950 dark:text-white whitespace-nowrap">{m.full_name}</td>
                              <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300">{m.position || '(None)'}</td>
                              <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{m.unit || '(None)'}</td>
                              <td className="py-2.5 px-4 text-zinc-500 dark:text-zinc-400">{m.location || '—'}</td>
                              {isAdmin && (
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => handleRemoveMember(m.id)}
                                    className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                                    title="Remove from group"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-zinc-400">
                              This group has no members yet. Click "Add Members" to enroll colleagues.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-400 text-xs">
                  Select a group on the left.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW B: DIVISIONS & UNITS MANAGEMENT                     */}
      {/* ======================================================== */}
      {activeSubTab === 'units' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: List of all active units */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Active Divisions ({unitSummaries.length})
                </span>
                <span className="text-[11px] text-zinc-400">Click to view staff & rename</span>
              </div>

              {loadingUnits ? (
                <div className="p-8 text-center text-xs text-zinc-400">Loading divisions...</div>
              ) : (
                <div className="space-y-2.5">
                  {unitSummaries.map(u => {
                    const isSelected = selectedUnit === u.unit;
                    return (
                      <div
                        key={u.unit}
                        onClick={() => setSelectedUnit(u.unit)}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-950 dark:border-white shadow-xs'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                            <Building className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white leading-snug line-clamp-2">{u.unit}</h4>
                            <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">[{u.short_code || 'DIV'}] Office Division</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs border ${
                            isSelected
                              ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white border-zinc-300 dark:border-zinc-700'
                              : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                          }`}>
                            {u.member_count} {u.member_count === 1 ? 'staff' : 'staff'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Division Details, Rename & Staff List */}
            <div className="lg:col-span-7">
              {selectedUnit ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                  {/* Division Header & Rename Action */}
                  <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white leading-tight">
                            {selectedUnit}
                          </h3>
                          <span className="shrink-0 whitespace-nowrap px-2.5 py-0.5 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                            {unitMembers.length} {unitMembers.length === 1 ? 'Staff Member' : 'Staff Members'} Assigned
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          You can rename this division across all assigned employee profiles simultaneously.
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setEditingUnitName({ oldUnit: selectedUnit, newUnit: selectedUnit })}
                          className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs self-start"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Rename Division</span>
                        </button>
                      )}
                    </div>

                    {/* Inline Rename Form */}
                    {editingUnitName && (
                      <form onSubmit={handleRenameUnitSubmit} className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-xs space-y-3">
                        <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Rename "{editingUnitName.oldUnit}" across all staff records:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={editingUnitName.newUnit}
                            onChange={(e) => setEditingUnitName({ ...editingUnitName, newUnit: e.target.value })}
                            placeholder="Enter new division name..."
                            className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold rounded-lg shadow-xs cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
                          >
                            Save Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUnitName(null)}
                            className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 whitespace-nowrap shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Multi-select staff in unit bar */}
                  {selectedUnitMemberIds.length > 0 && isAdmin && (
                    <div className="bg-zinc-900 text-white px-6 py-2.5 flex items-center justify-between text-xs animate-in fade-in">
                      <span>{selectedUnitMemberIds.length} staff selected in {selectedUnit}</span>
                      <button
                        onClick={() => {
                          setTargetMoveUnit(unitSummaries.find(u => u.unit !== selectedUnit)?.unit || '');
                          setShowMoveUnitMembersModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white font-semibold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                        Reassign to Another Division...
                      </button>
                    </div>
                  )}

                  {/* Division Staff Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          {isAdmin && <th className="py-2.5 px-4 w-10"></th>}
                          <th className="py-2.5 px-4 min-w-[170px]">Staff Name</th>
                          <th className="py-2.5 px-4 min-w-[190px]">Position</th>
                          <th className="py-2.5 px-4 min-w-[170px]">Desk Location</th>
                          <th className="py-2.5 px-4 w-24 whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {unitMembers.map(emp => {
                          const isChecked = selectedUnitMemberIds.includes(emp.id);
                          return (
                            <tr key={emp.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                              {isAdmin && (
                                <td className="py-2.5 px-4">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedUnitMemberIds(prev =>
                                        prev.includes(emp.id)
                                          ? prev.filter(x => x !== emp.id)
                                          : [...prev, emp.id]
                                      );
                                    }}
                                    className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500 cursor-pointer dark:bg-zinc-800"
                                  />
                                </td>
                              )}
                              <td className="py-2.5 px-4 font-semibold text-zinc-950 dark:text-white whitespace-nowrap">{emp.full_name}</td>
                              <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300">{emp.position || '(Missing Position)'}</td>
                              <td className="py-2.5 px-4 text-zinc-500 dark:text-zinc-400">{emp.location || '—'}</td>
                              <td className="py-2.5 px-4 capitalize text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{emp.status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs">
                  Select a division on the left to view staff.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Group */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingGroup ? 'Edit Group Information' : 'Create New Group'}
              </h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGroup} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch 2026 Q2 Induction or Safety Committee"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Group Type *</label>
                <select
                  value={groupFormData.type}
                  onChange={(e) => setGroupFormData({ ...groupFormData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="training batch">Training Batch</option>
                  <option value="team">Team</option>
                  <option value="committee">Committee</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Mandate</label>
                <textarea
                  rows={3}
                  placeholder="Describe the mandate or purpose of this group..."
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  {editingGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Members to Group */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Add Members to {selectedGroupDetails?.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select colleagues from the directory to enroll into this group.
                </p>
              </div>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, position, or unit..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {allEmployees.filter(e => {
                if (!empSearch) return true;
                const t = empSearch.toLowerCase();
                return e.full_name.toLowerCase().includes(t) || (e.position && e.position.toLowerCase().includes(t)) || (e.unit && e.unit.toLowerCase().includes(t));
              }).map(emp => {
                const isChecked = candidateMemberIds.includes(emp.id);
                return (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                      isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/40' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setCandidateMemberIds(prev =>
                          prev.includes(emp.id) ? prev.filter(x => x !== emp.id) : [...prev, emp.id]
                        );
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{emp.full_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {emp.position || 'No Position'} • {emp.unit || 'No Unit'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {candidateMemberIds.length} employee(s) chosen
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={candidateMemberIds.length === 0}
                  onClick={handleAddMembersSubmit}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  Add Selected Members
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reassign Unit Members to Another Unit */}
      {showMoveUnitMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Reassign Staff ({selectedUnitMemberIds.length})
              </h3>
              <button onClick={() => setShowMoveUnitMembersModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Move {selectedUnitMemberIds.length} employee(s) from <strong>"{selectedUnit}"</strong> to a different division:
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Division / Unit *</label>
                <select
                  value={targetMoveUnit}
                  onChange={(e) => setTargetMoveUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {unitSummaries.filter(u => u.unit !== selectedUnit).map(u => (
                    <option key={u.unit} value={u.unit}>{u.unit}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoveUnitMembersModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!targetMoveUnit}
                  onClick={handleMoveUnitMembers}
                  className="px-5 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Confirm Reassignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteGroupConfirm)}
        title="Delete Group"
        message={`Are you sure you want to delete "${deleteGroupConfirm?.name}"? Group membership records will be cleaned up, but employee accounts remain safe.`}
        confirmText="Delete Group"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupConfirm(null)}
      />
    </div>
  );
}
