'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ClipboardText, MagnifyingGlass, Funnel, Pulse, Sparkle, Eye } from '@phosphor-icons/react';

interface AuditLog {
    id: number;
    user_id: number;
    user_name?: string; // Optional as backend might not return it yet
    action: string;
    details: any; // Can be object or string
    ip_address: string;
    timestamp: string;
    resource_type?: string; // Added for modal
    resource_id?: number; // Added for modal
}

export default function AdminAuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const data = await api.getAuditLogs();
            setLogs(data);
        } catch (err) {
            console.error('Failed to load audit logs', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
    (log.user_name?.toLowerCase().includes(filter.toLowerCase()) ||
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        String(log.user_id).includes(filter))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Audit Logs...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <ClipboardText size={28} weight="duotone" className="text-cyan-400" />
                        Audit Logs
                    </h1>
                    <p className="text-slate-500 mt-1">System activity and security events</p>
                </div>
                {/* Search */}
                <div className="relative">
                    <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} weight="duotone" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-slate-800/60 border border-slate-700/60 text-slate-200 pl-11 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none w-64"
                    />
                </div>
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-start mb-5">
                            <h2 className="text-lg font-chivo font-bold uppercase tracking-wider flex items-center gap-2">
                                <Eye size={20} weight="duotone" className="text-cyan-400" />
                                Log Details <span className="text-slate-500 font-mono text-sm ml-2">#{selectedLog.id}</span>
                            </h2>
                            <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Action</p>
                                    <span className="px-2.5 py-1 bg-blue-950/40 text-blue-400 border border-blue-800/50 rounded-lg font-mono text-xs font-bold">
                                        {selectedLog.action}
                                    </span>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Resource</p>
                                    <p className="text-slate-200 font-mono text-sm">{selectedLog.resource_type} #{selectedLog.resource_id || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">User</p>
                                    <p className="text-slate-200 font-bold">{selectedLog.user_name || `ID: ${selectedLog.user_id}`}</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Time</p>
                                    <p className="text-slate-200 font-mono text-xs">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Details Payload</p>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-auto max-h-60">
                                    <pre className="text-xs font-mono text-green-400">
                                        {typeof selectedLog.details === 'object'
                                            ? JSON.stringify(selectedLog.details, null, 2)
                                            : selectedLog.details}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="bg-slate-800 hover:bg-slate-700 rounded-xl px-5 py-2.5 font-bold text-sm uppercase tracking-wider transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700/60 text-[10px] uppercase text-slate-500 font-mono tracking-widest">
                                <th className="p-5">Time</th>
                                <th className="p-5">User</th>
                                <th className="p-5">Action</th>
                                <th className="p-5">Resource</th>
                                <th className="p-5 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-5 font-mono text-slate-400 whitespace-nowrap text-xs">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-5 font-bold text-slate-200">
                                        {log.user_name || `User #${log.user_id}`}
                                    </td>
                                    <td className="p-5">
                                        <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-xs font-mono font-bold border border-slate-700 text-blue-300">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-5 text-slate-400 font-mono text-xs">
                                        {log.resource_type}
                                    </td>
                                    <td className="p-5 text-right">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 rounded-lg hover:bg-cyan-900/40 transition-colors"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredLogs.length === 0 && (
                    <div className="p-16 text-center relative overflow-hidden">
                        <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                        <ClipboardText size={56} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-500">No audit logs found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
