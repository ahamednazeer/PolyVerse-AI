'use client';

import React, { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useOffline } from '@/components/OfflineContext';
import { OfflineFacultyView } from '@/components/offline';
import {
    MagnifyingGlass,
    Circle,
    MapPin,
    Clock,
    Funnel,
    Info,
    X,
    CaretRight,
    CaretLeft,
    ShieldCheck,
    Pulse,
    Users,
    Broadcast
} from '@phosphor-icons/react';

interface FacultyLocation {
    faculty_id: number;
    faculty_name: string;
    department: string | null;
    availability_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    status_message: string | null;
    last_seen_building_name: string | null;
    last_seen_floor: number | null;
    last_seen_at: string | null;
}

const STATUS_CONFIG = {
    AVAILABLE: { color: 'text-green-400', bg: 'bg-green-950/30 border-green-700/50', label: 'Available', dotColor: 'bg-green-400', pulse: 'animate-pulse' },
    BUSY: { color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-700/50', label: 'Busy', dotColor: 'bg-amber-400', pulse: '' },
    OFFLINE: { color: 'text-slate-400', bg: 'bg-slate-800/30 border-slate-700/50', label: 'Offline', dotColor: 'bg-slate-500', pulse: '' },
};

const formatTimeAgo = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
};

export default function FacultyLocatorPage() {
    const { isOfflineMode } = useOffline();
    const [faculty, setFaculty] = useState<FacultyLocation[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedFaculty, setSelectedFaculty] = useState<FacultyLocation | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    const handleCloseModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setSelectedFaculty(null);
            setIsClosing(false);
        }, 250);
    };

    useEffect(() => {
        if (isOfflineMode) return; // Skip fetch when offline
        async function loadMeta() {
            try {
                const data = await api.getFacultyDepartments();
                setDepartments(data.departments || []);
            } catch (err) { }
        }
        loadMeta();
    }, [isOfflineMode]);

    useEffect(() => {
        if (isOfflineMode) return; // Skip fetch when offline
        async function loadFaculty() {
            setLoading(true);
            try {
                const data = await api.getAvailableFaculty({
                    search: searchQuery || undefined,
                    department: selectedDepartment || undefined,
                    page: currentPage,
                    page_size: 20
                });
                setFaculty(data.faculty || []);
                setTotalPages(data.total_pages || 1);
            } catch (err) {
            } finally {
                setLoading(false);
            }
        }
        loadFaculty();
    }, [searchQuery, selectedDepartment, currentPage, isOfflineMode]);

    // Show offline view when offline
    if (isOfflineMode) {
        return <OfflineFacultyView />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <Users size={28} weight="duotone" className="text-blue-400" />
                    Faculty Locator
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Real-time faculty presence & availability tracking</p>
            </div>

            {/* Info Notice */}
            <div className="bg-gradient-to-r from-blue-950/30 to-blue-900/20 border border-blue-800/30 rounded-xl p-5 flex items-start gap-4">
                <div className="p-2.5 bg-blue-900/40 rounded-xl flex-shrink-0">
                    <Info size={22} weight="duotone" className="text-blue-400" />
                </div>
                <div>
                    <p className="text-blue-300 font-semibold mb-1">How it works</p>
                    <p className="text-sm text-blue-400/80 leading-relaxed">
                        Track faculty availability and their last-seen campus area. Location data represents the <span className="font-bold text-blue-200">last-seen</span> position — not a live GPS track.
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search faculty by name..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-12 pr-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all placeholder-slate-600 font-medium"
                    />
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Funnel size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <select
                            value={selectedDepartment}
                            onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
                            className="pl-12 pr-10 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-200 outline-none focus:border-blue-500 transition-all appearance-none text-sm font-medium cursor-pointer"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    {(searchQuery || selectedDepartment) && (
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedDepartment(''); setCurrentPage(1); }}
                            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition-all border border-slate-700 hover:border-slate-600 hover:scale-105 active:scale-95"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Faculty List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin" />
                        <Pulse size={24} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
                    </div>
                    <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                        Scanning Faculty Signals...
                    </p>
                </div>
            ) : faculty.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-16 text-center relative overflow-hidden">
                    <Broadcast size={120} weight="duotone" className="absolute -right-6 -bottom-6 text-slate-800/30" />
                    <ShieldCheck size={64} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wider">No Signals Found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">No faculty members are currently sharing their location in this sector.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {faculty.map((f) => {
                        const status = STATUS_CONFIG[f.availability_status];
                        return (
                            <div
                                key={f.faculty_id}
                                onClick={() => setSelectedFaculty(f)}
                                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 hover:border-blue-500/50 transition-all duration-300 group hover:scale-[1.02] cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                                            {f.faculty_name}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-1">{f.department || 'General'}</p>
                                    </div>
                                    <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${status.bg} ${status.color}`}>
                                        <span className={`w-2 h-2 rounded-full ${status.dotColor} ${status.pulse}`} />
                                        {status.label}
                                    </div>
                                </div>

                                {f.status_message && (
                                    <div className="bg-slate-900/60 border-l-2 border-blue-500/50 px-4 py-3 rounded-r-xl mb-4">
                                        <p className="text-xs text-slate-400 italic line-clamp-2">"{f.status_message}"</p>
                                    </div>
                                )}

                                <div className="space-y-3 pt-4 border-t border-slate-700/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <MapPin size={18} weight="duotone" className="text-blue-400" />
                                            <span className="text-sm font-semibold">{f.last_seen_building_name || 'Off-Campus'}</span>
                                        </div>
                                        {f.last_seen_floor && (
                                            <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-800/60 px-2 py-1 rounded">Floor {f.last_seen_floor}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} weight="duotone" />
                                            <span>Seen {formatTimeAgo(f.last_seen_at)}</span>
                                        </div>
                                        <span className="text-blue-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">View Details</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Faculty Details Modal */}
            {selectedFaculty && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={handleCloseModal}
                    style={{
                        animation: isClosing
                            ? 'fadeOut 0.25s cubic-bezier(0.4, 0, 1, 1) forwards'
                            : 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <div
                        className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl shadow-black/50"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            animation: isClosing
                                ? 'modalClose 0.25s cubic-bezier(0.4, 0, 1, 1) forwards'
                                : 'modalOpen 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
                        >
                            <X size={20} />
                        </button>

                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl font-bold text-white">
                                    {selectedFaculty.faculty_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">{selectedFaculty.faculty_name}</h2>
                                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{selectedFaculty.department || 'General Department'}</p>
                                </div>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest ${STATUS_CONFIG[selectedFaculty.availability_status].bg} ${STATUS_CONFIG[selectedFaculty.availability_status].color}`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[selectedFaculty.availability_status].dotColor} ${STATUS_CONFIG[selectedFaculty.availability_status].pulse}`} />
                                {STATUS_CONFIG[selectedFaculty.availability_status].label}
                            </div>
                        </div>

                        {/* Status Message */}
                        {selectedFaculty.status_message && (
                            <div className="bg-slate-800/60 border-l-4 border-blue-500 px-4 py-4 rounded-r-xl mb-6">
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Current Status</p>
                                <p className="text-slate-300 italic">"{selectedFaculty.status_message}"</p>
                            </div>
                        )}

                        {/* Location Details */}
                        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 mb-6">
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Last Known Location</p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-900/40 rounded-xl">
                                        <MapPin size={20} weight="duotone" className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">{selectedFaculty.last_seen_building_name || 'Off-Campus'}</p>
                                        {selectedFaculty.last_seen_floor && (
                                            <p className="text-xs text-slate-500">Floor {selectedFaculty.last_seen_floor}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-800/60 rounded-xl">
                                        <Clock size={20} weight="duotone" className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">Last Seen</p>
                                        <p className="text-xs text-slate-500">{formatTimeAgo(selectedFaculty.last_seen_at)}{selectedFaculty.last_seen_at && ` • ${new Date(selectedFaculty.last_seen_at).toLocaleString()}`}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Faculty ID */}
                        <div className="text-center pt-4 border-t border-slate-800">
                            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                                Faculty ID: {selectedFaculty.faculty_id}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-6">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-3 border border-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                    >
                        <CaretLeft size={20} className="text-slate-400" />
                    </button>
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest bg-slate-800/40 px-4 py-2 rounded-lg border border-slate-700/40">
                        Page {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-3 border border-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                    >
                        <CaretRight size={20} className="text-slate-400" />
                    </button>
                </div>
            )}
        </div>
    );
}
