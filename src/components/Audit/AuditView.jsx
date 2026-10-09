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
      <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex items-center justify-between transition-colors">
        <div>
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">System Activity & Audit Log</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Immutable log of all employee additions, modifications, inline edits, imports, and bulk changes.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="h-8.5 px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Log</span>
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-40 whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-4 w-36 whitespace-nowrap">User / Actor</th>
                <th className="py-3 px-4 w-32 whitespace-nowrap">Action</th>
                <th className="py-3 px-4 min-w-[160px]">Target Employee</th>
                <th className="py-3 px-4 min-w-[300px]">Field Changes / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">Loading audit history...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">No activity recorded yet.</td>
                </tr>
              ) : (
                logs.map(l => (
                  <tr key={l.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        {l.user_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-950 dark:text-zinc-100 whitespace-nowrap">
                      {l.employee_name || (l.employee_id ? `Employee #${l.employee_id}` : 'System')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {l.changes && l.changes.length > 0 ? (
                          l.changes.map((c, i) => (
                            <div key={i} className="flex items-center flex-wrap gap-1.5 text-zinc-700 dark:text-zinc-300">
                              <span className="font-semibold capitalize text-zinc-950 dark:text-white">{c.field}:</span>
                              {c.old != null && (
                                <span className="line-through text-zinc-500 dark:text-zinc-400 text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700">
                                  {String(c.old) || '(blank)'}
                                </span>
                              )}
                              <ArrowRight className="w-3 h-3 text-zinc-400 inline" />
                              <span className="font-medium text-zinc-950 dark:text-white text-[11px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 rounded border border-zinc-300 dark:border-zinc-600">
                                {String(c.new)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-zinc-400 italic">No field details</span>
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
