'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DataCard } from '@/components/DataCard';
import {
    Users,
    Buildings,
    MapPin,
    Plus,
    PencilSimple,
    Trash,
    Eye,
    EyeSlash,
    Circle,
    X,
    CheckCircle,
    Warning,
    CaretRight,
    CaretLeft,
    List,
    SquaresFour,
    Pulse,
    Sparkle
} from '@phosphor-icons/react';

interface Building {
    id: number;
    name: string;
    code: string;
    description: string | null;
    floor_count: number;
    is_active: boolean;
}

interface FacultyStats {
    total_faculty: number;
    sharing_enabled_count: number;
    available_count: number;
    busy_count: number;
    offline_count: number;
}

interface AdminFaculty {
    faculty_id: number;
    username: string;
    faculty_name: string;
    email: string;
    department: string | null;
    is_sharing_enabled: boolean;
    availability_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    visibility_level: 'ALL_STUDENTS' | 'SAME_DEPARTMENT' | 'ADMIN_ONLY' | 'HIDDEN';
    status_message: string | null;
    last_seen_building_name: string | null;
    last_seen_at: string | null;
}

const STATUS_INDICATORS: Record<string, any> = {
    AVAILABLE: { color: 'text-green-400', bg: 'bg-green-950/40 border-green-800/50', label: 'Available' },
    BUSY: { color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'Busy' },
    OFFLINE: { color: 'text-slate-500', bg: 'bg-slate-900/40 border-slate-700/60', label: 'Offline' },
};

export default function AdminFacultyLocations() {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [faculty, setFaculty] = useState<AdminFaculty[]>([]);
    const [stats, setStats] = useState<FacultyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'faculty' | 'buildings'>('faculty');

    // Modal states
    const [showBuildingModal, setShowBuildingModal] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [buildingForm, setBuildingForm] = useState({ name: '', code: '', description: '', floor_count: 1 });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [b, f, s] = await Promise.all([
                api.getCampusBuildings(),
                api.getAllFacultyAdmin().catch(() => ({ faculty: [] })),
                api.getFacultyStats().catch(() => null)
            ]);
            setBuildings(b);
            setFaculty(f.faculty || []);
            setStats(s);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBuilding = async () => {
        if (!buildingForm.name || !buildingForm.code) return;
        setSubmitting(true);
        try {
            if (editingBuilding) {
                await api.updateCampusBuilding(editingBuilding.id, buildingForm);
                setToast({ type: 'success', text: 'Building configuration updated' });
            } else {
                await api.createCampusBuilding(buildingForm);
                setToast({ type: 'success', text: 'New campus building registered' });
            }
            setShowBuildingModal(false);
            setEditingBuilding(null);
            fetchData();
        } catch (err: any) {
            setToast({ type: 'error', text: err.message || 'Operation failed' });
        } finally {
            setSubmitting(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleDeleteBuilding = async (id: number) => {
        if (!confirm('Permanently remove this building from campus database?')) return;
        try {
            await api.deleteCampusBuilding(id);
            setToast({ type: 'success', text: 'Building removed' });
            fetchData();
        } catch (err: any) {
            setToast({ type: 'error', text: err.message || 'Deletion failed' });
        } finally {
            setTimeout(() => setToast(null), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Accessing Satellite Data...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header matched to Admin dashboard */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <MapPin size={28} weight="duotone" className="text-blue-400" />
                        Faculty Geographic Data
                    </h1>
                    <p className="text-slate-500 mt-1 uppercase font-mono text-[10px] tracking-widest">Global Campus Navigation Control</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('faculty')}
                        className={`p-2.5 rounded-xl border transition-all ${view === 'faculty' ? 'bg-blue-900/20 border-blue-500/50 text-blue-400' : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:bg-slate-700'}`}
                    >
                        <List size={20} weight="duotone" />
                    </button>
                    <button
                        onClick={() => setView('buildings')}
                        className={`p-2.5 rounded-xl border transition-all ${view === 'buildings' ? 'bg-blue-900/20 border-blue-500/50 text-blue-400' : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:bg-slate-700'}`}
                    >
                        <Buildings size={20} weight="duotone" />
                    </button>
                </div>
            </div>

            {/* Toast Notifications */}
            {toast && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-2xl animate-in fade-in slide-in-from-right-5 ${toast.type === 'success' ? 'bg-green-950/40 border-green-800/50 text-green-400' : 'bg-red-950/40 border-red-800/50 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle size={20} weight="duotone" /> : <Warning size={20} weight="duotone" />}
                    <span className="text-xs font-bold uppercase tracking-widest">{toast.text}</span>
                </div>
            )}

            {/* Stats Visualization */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    <DataCard title="Total Registrations" value={stats.total_faculty} icon={Users} />
                    <DataCard title="Public Nodes" value={stats.sharing_enabled_count} icon={Eye} />
                    <DataCard title="Nodes Online" value={stats.available_count} icon={Circle} className="border-green-500/30" />
                    <DataCard title="Nodes Occupied" value={stats.busy_count} icon={Circle} className="border-amber-500/30" />
                    <DataCard title="Nodes Ghost" value={stats.offline_count} icon={Circle} className="border-slate-500/30" />
                </div>
            )}

            {/* Main Application Interface */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                {view === 'faculty' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80 border-b border-slate-700/60">
                                    <th className="p-4 text-[10px] uppercase font-mono text-slate-500 tracking-widest">Faculty Identity</th>
                                    <th className="p-4 text-[10px] uppercase font-mono text-slate-500 tracking-widest">Sector</th>
                                    <th className="p-4 text-[10px] uppercase font-mono text-slate-500 tracking-widest">Protocol</th>
                                    <th className="p-4 text-[10px] uppercase font-mono text-slate-500 tracking-widest">Status</th>
                                    <th className="p-4 text-[10px] uppercase font-mono text-slate-500 tracking-widest">Current Grid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/40">
                                {faculty.map((f) => {
                                    const indicator = STATUS_INDICATORS[f.availability_status];
                                    return (
                                        <tr key={f.faculty_id} className="hover:bg-slate-800/60 transition-colors group">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{f.faculty_name}</p>
                                                <p className="text-[10px] font-mono text-slate-500 uppercase">{f.email}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs text-slate-400 font-semibold">{f.department || 'UNCATEGORIZED'}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {f.is_sharing_enabled ? <Eye size={14} weight="duotone" className="text-green-500" /> : <EyeSlash size={14} weight="duotone" className="text-slate-600" />}
                                                    <span className="text-[10px] font-mono text-slate-500 uppercase">{f.visibility_level.replace('_', ' ')}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest font-mono ${indicator.bg}`}>
                                                    <Circle size={8} weight="fill" className={indicator.color} />
                                                    {indicator.label}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} weight="duotone" className="text-blue-400" />
                                                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                                                        {f.last_seen_building_name || 'COORDINATES MISSING'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-chivo font-bold uppercase tracking-wider">Campus Grid Nodes (Buildings)</h2>
                            <button
                                onClick={() => { setEditingBuilding(null); setBuildingForm({ name: '', code: '', description: '', floor_count: 1 }); setShowBuildingModal(true); }}
                                className="px-5 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 hover:scale-[1.02]"
                            >
                                <Plus size={16} weight="bold" /> Add Building
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {buildings.map((b) => (
                                <div key={b.id} className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 hover:border-blue-500/50 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-950/50 rounded-xl">
                                            <Buildings size={24} weight="duotone" className="text-blue-400" />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => { setEditingBuilding(b); setBuildingForm({ name: b.name, code: b.code, description: b.description || '', floor_count: b.floor_count }); setShowBuildingModal(true); }} className="p-2 hover:bg-slate-700 text-slate-400 rounded-xl transition-colors"><PencilSimple size={16} weight="duotone" /></button>
                                            <button onClick={() => handleDeleteBuilding(b.id)} className="p-2 hover:bg-red-900/30 text-red-400 rounded-xl transition-colors"><Trash size={16} weight="duotone" /></button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 uppercase tracking-tight">{b.name}</h3>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">NODE: {b.code}</p>
                                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-700/40 pt-3">
                                            <span>{b.floor_count} PLATFORMS (FLOORS)</span>
                                            <span className={b.is_active ? 'text-green-500' : 'text-red-500'}>{b.is_active ? 'ACTIVE' : 'DEACTIVATED'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Building Modal matched to Admin style */}
            {showBuildingModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700/60 bg-slate-900/80">
                            <h3 className="text-sm font-chivo font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
                                <Buildings size={18} weight="duotone" /> {editingBuilding ? 'Update Node Configuration' : 'Register New Campus Node'}
                            </h3>
                            <button onClick={() => setShowBuildingModal(false)} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-500"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-mono font-bold text-slate-500">Formal Name</label>
                                    <input type="text" value={buildingForm.name} onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })} placeholder="e.g. Science Block" className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-mono font-bold text-slate-500">Registry Code</label>
                                    <input type="text" value={buildingForm.code} onChange={e => setBuildingForm({ ...buildingForm, code: e.target.value.toUpperCase() })} placeholder="e.g. SCI-BK" className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-mono font-bold text-slate-500">Node Description</label>
                                <textarea value={buildingForm.description} onChange={e => setBuildingForm({ ...buildingForm, description: e.target.value })} rows={2} className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500 transition-all resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-mono font-bold text-slate-500">Platform Intensity (Floors)</label>
                                <input type="number" value={buildingForm.floor_count} onChange={e => setBuildingForm({ ...buildingForm, floor_count: parseInt(e.target.value) || 1 })} className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500 transition-all" />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-900/60 border-t border-slate-700/60 flex gap-3">
                            <button onClick={() => setShowBuildingModal(false)} className="flex-1 py-3 text-xs uppercase font-bold tracking-widest text-slate-500 hover:text-slate-300 transition-all rounded-xl">Abort</button>
                            <button onClick={handleSaveBuilding} disabled={submitting} className="flex-[2] py-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                                {submitting ? 'Transmitting...' : 'Confirm registry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
