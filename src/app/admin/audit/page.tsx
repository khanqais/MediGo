"use client";

import { useState, useEffect } from "react";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/audit?page=${p}&limit=${limit}`);
    const data = await res.json();
    if (data.success) {
      setLogs(data.data);
      setTotalPages(data.pagination.totalPages || 1);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">System Audit Log</h1>
          <p className="text-slate-500 text-sm mt-1">Immutable record of admin and pharmacist actions</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Timestamp</th>
              <th className="p-4 font-semibold">Action</th>
              <th className="p-4 font-semibold">Entity Type</th>
              <th className="p-4 font-semibold">Entity ID</th>
              <th className="p-4 font-semibold">Performed By</th>
              <th className="p-4 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4 whitespace-nowrap text-xs">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-4 font-bold text-slate-900">{log.action}</td>
                  <td className="p-4">{log.entity_type}</td>
                  <td className="p-4 text-xs font-mono">{log.entity_id}</td>
                  <td className="p-4">
                    {log.admin?.full_name || log.admin?.email || 'Unknown'}
                  </td>
                  <td className="p-4 text-xs font-mono bg-slate-50 max-w-xs overflow-x-auto">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        <div className="text-sm text-slate-500">
          Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)}
            className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="p-2 border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
