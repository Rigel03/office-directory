import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, Check } from 'lucide-react';

export function EmployeeModal({ isOpen, onClose, onSave, employee = null, availableGroups = [] }) {
  const isEditing = Boolean(employee);

  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    unit: '',
    email: '',
    phone: '',
    location: '',
    status: 'active',
    notes: '',
    groupIds: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || '',
        position: employee.position || '',
        unit: employee.unit || '',
        email: employee.email || '',
        phone: employee.phone || '',
        location: employee.location || '',
        status: employee.status || 'active',
        notes: employee.notes || '',
        groupIds: employee.groups ? employee.groups.map(g => g.id) : []
      });
    } else {
      setFormData({
        full_name: '',
        position: '',
        unit: '',
        email: '',
        phone: '',
        location: '',
        status: 'active',
        notes: '',
        groupIds: []
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.full_name.trim()) {
      errs.full_name = 'Full name is required.';
    }
    if (!formData.position.trim()) {
      errs.position = 'Position is required before saving.';
    }
    if (!formData.unit.trim()) {
      errs.unit = 'Unit / Division is required before saving.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData, employee?.id);
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
              Position and Unit/Division are mandatory fields for all manual entries.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
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

          {/* Position & Unit - Required fields */}
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
                Unit / Division <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Human Resources or Operations"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  errors.unit 
                    ? 'border-rose-300 dark:border-rose-700 ring-1 ring-rose-200 bg-rose-50/20' 
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                } focus:outline-hidden focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.unit && <p className="text-xs text-rose-500 mt-1">{errors.unit}</p>}
            </div>
          </div>

          {/* Physical Quick-find Location & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Physical Office Location
              </label>
              <input
                type="text"
                placeholder="e.g. 2nd Floor - HR Bay 3 or Rm 302"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Helps colleagues locate the person physically in the building.
              </p>
            </div>

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
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Employee' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
