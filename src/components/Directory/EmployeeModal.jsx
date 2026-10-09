import React, { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Save, Check, Plus } from 'lucide-react';

const STANDARD_FLOORS = [
  'Ground Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  'Basement'
];

export function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  employee = null,
  availableGroups = [],
  availableUnits = [],
  availableRooms = []
}) {
  const isEditing = Boolean(employee);

  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    unit: '',
    unit_code: '',
    unit_id: null,
    floor: '',
    room: '',
    email: '',
    phone: '',
    status: 'active',
    notes: '',
    groupIds: []
  });

  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      // Determine if room is in standard list
      const empRoom = employee.room || (employee.location ? employee.location.split(' · ')[1] : '') || '';
      const empFloor = employee.floor || (employee.location ? employee.location.split(' · ')[0] : '') || '';
      const roomInList = availableRooms.some(r => r.name.toLowerCase() === empRoom.toLowerCase());

      setFormData({
        full_name: employee.full_name || '',
        position: employee.position || '',
        unit: employee.unit || '',
        unit_code: employee.unit_code || '',
        unit_id: employee.unit_id || null,
        floor: empFloor,
        room: empRoom,
        email: employee.email || '',
        phone: employee.phone || '',
        status: employee.status || 'active',
        notes: employee.notes || '',
        groupIds: employee.groups ? employee.groups.map(g => g.id) : []
      });

      if (empRoom && !roomInList && availableRooms.length > 0) {
        setIsCustomRoom(true);
        setCustomRoomInput(empRoom);
      } else {
        setIsCustomRoom(false);
        setCustomRoomInput('');
      }
    } else {
      setFormData({
        full_name: '',
        position: '',
        unit: '',
        unit_code: '',
        unit_id: null,
        floor: '',
        room: '',
        email: '',
        phone: '',
        status: 'active',
        notes: '',
        groupIds: []
      });
      setIsCustomRoom(false);
      setCustomRoomInput('');
    }
    setErrors({});
  }, [employee, isOpen, availableRooms]);

  if (!isOpen) return null;

  // Selected unit details for soft mismatch warning
  const selectedUnit = availableUnits.find(u =>
    (formData.unit_id && u.id === formData.unit_id) ||
    (formData.unit_code && u.short_code === formData.unit_code) ||
    (formData.unit && u.name.toLowerCase() === formData.unit.toLowerCase())
  );

  const hasLocationMismatch = Boolean(
    selectedUnit?.default_floor &&
    formData.floor &&
    formData.floor.toLowerCase().trim() !== selectedUnit.default_floor.toLowerCase().trim()
  );

  const validate = () => {
    const errs = {};
    if (!formData.full_name.trim()) {
      errs.full_name = 'Full name is required.';
    }
    if (!formData.position.trim()) {
      errs.position = 'Position is required before saving.';
    }
    if (!formData.unit.trim()) {
      errs.unit = 'Unit / Division must be selected from the list.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUnitChange = (e) => {
    const val = e.target.value;
    const found = availableUnits.find(u => u.name === val || u.short_code === val);
    if (found) {
      setFormData(prev => ({
        ...prev,
        unit: found.name,
        unit_code: found.short_code,
        unit_id: found.id,
        // Auto-suggest default floor if none selected yet
        floor: prev.floor || found.default_floor || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        unit: val,
        unit_code: '',
        unit_id: null
      }));
    }
  };

  const handleRoomSelect = (e) => {
    const val = e.target.value;
    if (val === '__OTHER__') {
      setIsCustomRoom(true);
      setFormData(prev => ({ ...prev, room: customRoomInput }));
    } else {
      setIsCustomRoom(false);
      setFormData(prev => ({ ...prev, room: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const finalRoom = isCustomRoom ? customRoomInput.trim() : formData.room.trim();
      const payload = {
        ...formData,
        room: finalRoom,
        location: formData.floor && finalRoom ? `${formData.floor} · ${finalRoom}` : (formData.floor || finalRoom)
      };
      await onSave(payload, employee?.id);
      onClose();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGroup = (groupId) => {
    setFormData(prev => {
      const exists = prev.groupIds.includes(groupId);
      return {
        ...prev,
        groupIds: exists
          ? prev.groupIds.filter(id => id !== groupId)
          : [...prev, groupId]
      };
    });
  };

  // Rooms filtered by chosen floor if any
  const roomsForFloor = formData.floor
    ? availableRooms.filter(r => !r.floor || r.floor === formData.floor)
    : availableRooms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? 'Edit Employee Record' : 'Add New Employee'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Position and managed Unit/Division are mandatory fields for directory integrity.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.form && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz or DELA CRUZ, Juan P."
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                errors.full_name 
                  ? 'border-rose-300 dark:border-rose-700 ring-1 ring-rose-200 bg-rose-50/20' 
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
              } focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
            />
            {errors.full_name ? (
              <p className="text-xs text-rose-500 mt-1">{errors.full_name}</p>
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Name will be automatically normalized into standard format: "LAST, First M."
              </p>
            )}
          </div>

          {/* Position & Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Position / Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Administrative Officer V"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  errors.position 
                    ? 'border-rose-300 dark:border-rose-700 ring-1 ring-rose-200 bg-rose-50/20' 
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                } focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.position && <p className="text-xs text-rose-500 mt-1">{errors.position}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Managed Unit / Division <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.unit}
                onChange={handleUnitChange}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  errors.unit 
                    ? 'border-rose-300 dark:border-rose-700 ring-1 ring-rose-200 bg-rose-50/20' 
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                } focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="">Select Unit / Division...</option>
                {availableUnits.map(u => (
                  <option key={u.id} value={u.name}>
                    [{u.short_code}] {u.name}
                  </option>
                ))}
              </select>
              {errors.unit && <p className="text-xs text-rose-500 mt-1">{errors.unit}</p>}
            </div>
          </div>

          {/* Structured Location (Floor & Room/Area) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Structured Office Location
              </label>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Format: "4th Floor · Room 408"
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Floor
                </label>
                <select
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Floor...</option>
                  {STANDARD_FLOORS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Room / Area
                </label>
                <select
                  value={isCustomRoom ? '__OTHER__' : formData.room}
                  onChange={handleRoomSelect}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Room / Area...</option>
                  {roomsForFloor.map(r => (
                    <option key={r.id || r.name} value={r.name}>
                      {r.name} {r.floor ? `(${r.floor})` : ''}
                    </option>
                  ))}
                  <option value="__OTHER__">+ Specify Other Room / Area...</option>
                </select>
              </div>
            </div>

            {/* Custom Room Input if Other selected */}
            {isCustomRoom && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Enter custom room/desk name (e.g. Conference Room B, Desk 204)"
                  value={customRoomInput}
                  onChange={(e) => {
                    setCustomRoomInput(e.target.value);
                    setFormData(prev => ({ ...prev, room: e.target.value }));
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Soft Location Mismatch Warning Notice (Spec 3) */}
            {hasLocationMismatch && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <span className="font-semibold">Location Mismatch Notice:</span> {selectedUnit?.name} is typically stationed on <strong>{selectedUnit?.default_floor}</strong>, but employee is assigned to <strong>{formData.floor}</strong>. (Soft warning, record can still be saved).
                </div>
              </div>
            )}
          </div>

          {/* Status & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="on leave">On Leave</option>
                <option value="detached">Detached</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Office Email
              </label>
              <input
                type="email"
                placeholder="e.g. name@office.gov"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone / Extension
              </label>
              <input
                type="text"
                placeholder="e.g. Ext. 204 or +63 912 345 6789"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Group Memberships */}
          {availableGroups.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Group Memberships
              </label>
              <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg max-h-32 overflow-y-auto">
                {availableGroups.map(g => {
                  const isChecked = formData.groupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-xs border flex items-center justify-center text-[9px] ${
                        isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      {g.name}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">({g.type})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Special designations, temporary assignments, or certifications"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 inline-flex items-center justify-center gap-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Employee' : 'Save Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
