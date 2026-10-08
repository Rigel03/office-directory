import React, { useState, useEffect } from 'react';
import { History, User, Clock, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../../api';

export function AuditView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getSystemAudit(100);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">System Activity & Audit Log</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of all employee additions, modifications, inline edits, imports, and bulk changes.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-40">Timestamp</th>
                <th className="py-3 px-4 w-36">User / Actor</th>
                <th className="py-3 px-4 w-32">Action</th>
                <th className="py-3 px-4 min-w-[160px]">Target Employee</th>
                <th className="py-3 px-4 min-w-[300px]">Field Changes / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">Loading audit history...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">No activity recorded yet.</td>
                </tr>
              ) : (
                logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {l.user_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {l.employee_name || (l.employee_id ? `Employee #${l.employee_id}` : 'System')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {l.changes && l.changes.length > 0 ? (
                          l.changes.map((c, i) => (
                            <div key={i} className="flex items-center flex-wrap gap-1.5 text-slate-700 dark:text-slate-300">
                              <span className="font-semibold capitalize text-slate-900 dark:text-white">{c.field}:</span>
                              {c.old != null && (
                                <span className="line-through text-slate-400 dark:text-slate-500 text-[11px] bg-rose-50 dark:bg-rose-950/40 px-1 py-0.2 rounded">
                                  {String(c.old) || '(blank)'}
                                </span>
                              )}
                              <ArrowRight className="w-3 h-3 text-slate-400 inline" />
                              <span className="font-medium text-emerald-700 dark:text-emerald-400 text-[11px] bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">
                                {String(c.new)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No field details</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
