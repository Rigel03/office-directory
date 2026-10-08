import React, { useEffect, useState } from 'react';
import { X, History, Clock, User, ArrowRight } from 'lucide-react';
import { api } from '../../api';

export function AuditModal({ isOpen, onClose, employee = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && employee) {
      setLoading(true);
      api.getEmployeeAudit(employee.id)
        .then(data => setLogs(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Record Audit Trail</h3>
              <p className="text-xs text-slate-500">{employee.full_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No modification logs found for this record.</div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-500 shadow-xs" />
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {log.action}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {log.user_name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    {log.changes && log.changes.length > 0 ? (
                      log.changes.map((c, i) => (
                        <div key={i} className="flex items-center flex-wrap gap-1.5 text-slate-700">
                          <span className="font-medium text-slate-900 capitalize">{c.field}:</span>
                          {c.old ? (
                            <span className="line-through text-slate-400 bg-rose-50 px-1 py-0.5 rounded text-[11px] border border-rose-100">
                              {String(c.old)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">(empty)</span>
                          )}
                          <ArrowRight className="w-3 h-3 text-slate-400 inline" />
                          <span className="font-medium text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded text-[11px] border border-emerald-100">
                            {String(c.new)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">Record updated</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
