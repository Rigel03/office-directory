import React, { useState } from 'react';
import {
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle, ArrowRight,
  RefreshCw, X, ShieldAlert, GitMerge, UserPlus, SkipForward, Edit3
} from 'lucide-react';
import { api } from '../../api';

export function ImportModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'mapping' | 'duplicates' | 'review' | 'success'
  const [file, setFile] = useState(null);
  const [pastedData, setPastedData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Import preview response
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [rowActions, setRowActions] = useState({}); // { [rowIndex]: { action: 'create'|'merge'|'skip', targetEmployeeId, data } }
  const [commitResult, setCommitResult] = useState(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPastedData('');
    setLoading(false);
    setError('');
    setPreviewData(null);
    setColumnMapping({});
    setRowActions({});
    setCommitResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const loadSampleMessyData = () => {
    const sample = `Employee Name,Designation,Department,Email Address,Phone No,Desk Room
"Dela Cruz, J.",Junior Administrative Assistant,Human Resources,j.delacruz@office.gov,Ext. 102,2nd Floor - HR Bay 4
"MENDOZA, Roberto Jr.",Executive Director,Office of the Director,r.mendoza@office.gov,Ext. 100,5th Floor - Suite 501
"SAN JUAN, Patricia",,Finance & Budget,p.sanjuan@office.gov,Ext. 315,3rd Floor - Finance
"Villanueva, Gabriel",Senior IT Support Specialist,IT Services,g.villanueva@office.gov,Ext. 552,2nd Floor - Helpdesk
"Navarro, Fernando M.",Procurement Officer II,,f.navarro@office.gov,Ext. 220,1st Floor - Supply Room
"LIM, Kimberly Ann",,,k.lim@office.gov,Ext. 211,1st Floor - Front Desk`;
    setPastedData(sample);
  };

  const handleProcessPreview = async (mappingOverride = null) => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else if (pastedData.trim()) {
        formData.append('pastedData', pastedData.trim());
      } else {
        throw new Error('Please select a file or paste data.');
      }

      if (mappingOverride) {
        formData.append('columnMapping', JSON.stringify(mappingOverride));
      }

      const res = await api.previewImport(formData);
      setPreviewData(res);
      setColumnMapping(res.suggestedMapping || {});

      // Initialize default actions for rows
      const actions = {};
      res.rows.forEach(r => {
        const isDupe = r.duplicates && r.duplicates.length > 0;
        actions[r.rowIndex] = {
          action: isDupe ? 'merge' : 'create',
          targetEmployeeId: isDupe ? r.duplicates[0].existingId : null,
          data: { ...r.normalized }
        };
      });
      setRowActions(actions);

      // Determine next step
      if (!mappingOverride) {
        setStep('mapping');
      } else if (res.duplicateCount > 0) {
        setStep('duplicates');
      } else {
        setStep('review');
      }
    } catch (err) {
      setError(err.message || 'Failed to parse spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = () => {
    handleProcessPreview(columnMapping);
  };

  const handleCommit = async () => {
    setLoading(true);
    setError('');
    try {
      const items = Object.values(rowActions);
      const res = await api.commitImport({ items });
      setCommitResult(res);
      setStep('success');
      onImportComplete();
    } catch (err) {
      setError(err.message || 'Failed to commit import records.');
    } finally {
      setLoading(false);
    }
  };

  const updateRowField = (rowIndex, field, value) => {
    setRowActions(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        data: {
          ...prev[rowIndex].data,
          [field]: value
        }
      }
    }));
  };

  const setRowDecision = (rowIndex, action, targetEmployeeId = null) => {
    setRowActions(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        action,
        targetEmployeeId: targetEmployeeId ?? prev[rowIndex].targetEmployeeId
      }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header with wizard step indicator */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Import Employees from Spreadsheet
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Normalizes names to standard "LAST, First M.", flags missing positions, and detects duplicates.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-2.5 bg-indigo-50/40 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
          <span className={step === 'upload' ? 'text-indigo-600 font-bold' : ''}>1. Select Data</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className={step === 'mapping' ? 'text-indigo-600 font-bold' : ''}>2. Map Columns</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className={step === 'duplicates' ? 'text-indigo-600 font-bold' : ''}>3. Resolve Duplicates</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className={step === 'review' ? 'text-indigo-600 font-bold' : ''}>4. Review & Fix Fields</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className={step === 'success' ? 'text-emerald-600 font-bold' : ''}>5. Done</span>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors bg-slate-50/50">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800">
                  Choose an Excel or CSV file
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .xlsx, .xls, and .csv files from office spreadsheets
                </p>
                <input
                  type="file"
                  id="import-file"
                  accept=".xlsx, .xls, .csv, .txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setPastedData('');
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="import-file"
                  className="mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Browse File
                </label>
                {file && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Or Paste Data */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Or paste rows directly from Excel / CSV:
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleMessyData}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Load Sample Test Spreadsheet
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={pastedData}
                  onChange={(e) => {
                    setPastedData(e.target.value);
                    setFile(null);
                  }}
                  placeholder="Paste headers and rows here (e.g. Employee Name, Designation, Department...)"
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={loading || (!file && !pastedData.trim())}
                  onClick={() => handleProcessPreview()}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? 'Analyzing columns...' : 'Next: Map Columns'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && previewData && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                Confirm which columns in your spreadsheet correspond to our standard directory fields.
                We have automatically pre-mapped the best matches found.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { field: 'full_name', label: 'Full Name', required: true },
                  { field: 'position', label: 'Position / Designation', required: false },
                  { field: 'unit', label: 'Unit / Division / Dept', required: false },
                  { field: 'email', label: 'Email Address', required: false },
                  { field: 'phone', label: 'Phone / Extension', required: false },
                  { field: 'location', label: 'Desk / Office Location', required: false },
                  { field: 'status', label: 'Employment Status', required: false },
                  { field: 'notes', label: 'Notes / Remarks', required: false }
                ].map(({ field, label, required }) => (
                  <div key={field} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      value={columnMapping[field] || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">(None / Skip)</option>
                      {previewData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!columnMapping.full_name || loading}
                  onClick={handleApplyMapping}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? 'Evaluating...' : 'Next: Check Duplicates & Fields'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Duplicate Resolution */}
          {step === 'duplicates' && previewData && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Likely duplicate employee records detected</p>
                  <p className="mt-0.5">
                    We detected similarity between candidate rows and existing database records.
                    Choose whether to merge data into the existing profile, keep as a separate new entry, or skip.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {previewData.rows.filter(r => r.duplicates && r.duplicates.length > 0).map(r => {
                  const action = rowActions[r.rowIndex]?.action || 'merge';
                  const topDupe = r.duplicates[0];

                  return (
                    <div key={r.rowIndex} className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-900">
                          Row #{r.rowIndex}: {r.normalized.full_name}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          {topDupe.score}% match ({topDupe.reasons})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Incoming Row</p>
                          <p className="font-semibold text-slate-800">{r.normalized.full_name}</p>
                          <p className="text-slate-600">Pos: {r.normalized.position || '(None)'}</p>
                          <p className="text-slate-600">Unit: {r.normalized.unit || '(None)'}</p>
                          <p className="text-slate-500 text-[11px]">Email: {r.normalized.email || '—'}</p>
                        </div>

                        <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-200">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Existing Database Record</p>
                          <p className="font-semibold text-indigo-950">{topDupe.existingName}</p>
                          <p className="text-slate-600">Pos: {topDupe.existingPosition || '(None)'}</p>
                          <p className="text-slate-600">Unit: {topDupe.existingUnit || '(None)'}</p>
                        </div>
                      </div>

                      {/* User Choice */}
                      <div className="flex items-center gap-3 pt-1 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-indigo-700">
                          <input
                            type="radio"
                            name={`decision-${r.rowIndex}`}
                            checked={action === 'merge'}
                            onChange={() => setRowDecision(r.rowIndex, 'merge', topDupe.existingId)}
                            className="text-indigo-600"
                          />
                          <GitMerge className="w-3.5 h-3.5 text-indigo-600" />
                          Confirm Merge (Fill empty fields in existing profile)
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="radio"
                            name={`decision-${r.rowIndex}`}
                            checked={action === 'create'}
                            onChange={() => setRowDecision(r.rowIndex, 'create', null)}
                            className="text-slate-600"
                          />
                          <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                          Keep Separate as New
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-700">
                          <input
                            type="radio"
                            name={`decision-${r.rowIndex}`}
                            checked={action === 'skip'}
                            onChange={() => setRowDecision(r.rowIndex, 'skip', null)}
                            className="text-rose-600"
                          />
                          <SkipForward className="w-3.5 h-3.5 text-rose-500" />
                          Skip Row
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Back to Mapping
                </button>
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Next: Review Missing Fields
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review Screen (Missing fields & inline fixes) */}
          {step === 'review' && previewData && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    Review Screen: {previewData.missingInfoCount} row(s) missing required fields
                  </p>
                  <p className="mt-0.5">
                    Per policy, employees require Position and Unit. You can supply them below now, or import anyway
                    (they will be clearly tagged with <span className="font-bold underline">"Needs Review"</span> in the directory).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-12">#</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Normalized Name</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Position (Required)</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Unit / Division (Required)</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Location</th>
                      <th className="py-2.5 px-3 w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.rows.map(r => {
                      const cur = rowActions[r.rowIndex] || { action: 'create', data: r.normalized };
                      const isMissingPos = !cur.data.position || cur.data.position.trim() === '';
                      const isMissingUnit = !cur.data.unit || cur.data.unit.trim() === '';

                      return (
                        <tr
                          key={r.rowIndex}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            (isMissingPos || isMissingUnit) ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400">{r.rowIndex}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {cur.data.full_name}
                            {(isMissingPos || isMissingUnit) && (
                              <span className="block text-[10px] font-semibold text-rose-600">
                                Incomplete Record
                              </span>
                            )}
                          </td>

                          {/* Editable Position field */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={cur.data.position || ''}
                              onChange={(e) => updateRowField(r.rowIndex, 'position', e.target.value)}
                              placeholder="Fill position..."
                              className={`w-full px-2 py-1 text-xs rounded border ${
                                isMissingPos ? 'border-rose-300 bg-rose-50/40 text-rose-700' : 'border-slate-300'
                              } focus:ring-1 focus:ring-indigo-500`}
                            />
                          </td>

                          {/* Editable Unit field */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={cur.data.unit || ''}
                              onChange={(e) => updateRowField(r.rowIndex, 'unit', e.target.value)}
                              placeholder="Fill unit..."
                              className={`w-full px-2 py-1 text-xs rounded border ${
                                isMissingUnit ? 'border-rose-300 bg-rose-50/40 text-rose-700' : 'border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                              } focus:ring-1 focus:ring-indigo-500`}
                            />
                            {r.unmatchedUnit && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
                                Unmatched managed unit
                              </span>
                            )}
                          </td>

                          {/* Location with Floor & Room */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {cur.data.location || '—'}
                              </span>
                              {r.unmatchedLocation && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  Unmatched raw: "{r.normalized.raw_location}"
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                              cur.action === 'merge' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' :
                              cur.action === 'skip' ? 'bg-slate-100 text-slate-600 line-through dark:bg-slate-800 dark:text-slate-400' :
                              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                              {cur.action}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(previewData.duplicateCount > 0 ? 'duplicates' : 'mapping')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCommit}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Committing...' : 'Commit Import to Directory'}
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success Confirmation */}
          {step === 'success' && commitResult && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Import Completed Successfully</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                The spreadsheet rows have been verified and processed into the directory database.
              </p>

              <div className="flex justify-center gap-6 py-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl min-w-[120px]">
                  <p className="text-2xl font-bold text-emerald-600">{commitResult.createdCount}</p>
                  <p className="text-xs text-slate-500 font-medium">New Employees</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl min-w-[120px]">
                  <p className="text-2xl font-bold text-indigo-600">{commitResult.mergedCount}</p>
                  <p className="text-xs text-slate-500 font-medium">Merged Records</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl min-w-[120px]">
                  <p className="text-2xl font-bold text-slate-500">{commitResult.skippedCount}</p>
                  <p className="text-xs text-slate-500 font-medium">Skipped</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                >
                  View Updated Directory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
