'use client';

import React from 'react';
import { useOffline } from '@/components/OfflineContext';
import { OfflineIndicator } from '@/components/OfflineBanner';
import {
    Users,
    MapPin,
    Clock,
    Circle,
    CloudSlash,
    Info
} from '@phosphor-icons/react';

const STATUS_CONFIG = {
    AVAILABLE: { color: 'text-green-400', bg: 'bg-green-950/30 border-green-700/50', label: 'Available', dotColor: 'bg-green-400' },
    BUSY: { color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-700/50', label: 'Busy', dotColor: 'bg-amber-400' },
    OFFLINE: { color: 'text-slate-400', bg: 'bg-slate-800/30 border-slate-700/50', label: 'Offline', dotColor: 'bg-slate-500' },
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

export function OfflineFacultyView() {
    const { offlineData, lastSyncTimes } = useOffline();
    const faculty = offlineData.facultyAvailability;
    const lastSync = lastSyncTimes.facultyAvailability;

    if (!faculty || faculty.length === 0) {
        return (
            <div className="space-y-4">
                <OfflineIndicator dataKey="FACULTY_AVAILABILITY" className="mx-auto" />
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center">
                    <CloudSlash size={48} className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No Cached Faculty Data</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        Faculty availability data was not cached. Visit the Faculty Locator page while online to cache this data.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <Users size={28} weight="duotone" className="text-blue-400" />
                    Faculty Locator
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Cached faculty availability data</p>
            </div>

            {/* Offline Indicator */}
            <div className="flex justify-center">
                <OfflineIndicator dataKey="FACULTY_AVAILABILITY" />
            </div>

            {/* Warning Notice */}
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-start gap-3">
                <Info size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-amber-300 font-medium text-sm">Viewing Cached Data</p>
                    <p className="text-amber-400/70 text-xs mt-1">
                        This is last-synced data and may not reflect current faculty status.
                        {lastSync && ` Last updated: ${lastSync.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                    </p>
                </div>
            </div>

            {/* Disabled search notice */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-500 text-sm flex items-center gap-2">
                <CloudSlash size={16} />
                Search and filters disabled in offline mode
            </div>

            {/* Faculty List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {faculty.map((f) => {
                    const status = STATUS_CONFIG[f.availability_status] || STATUS_CONFIG.OFFLINE;
                    return (
                        <div
                            key={f.faculty_id}
                            className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 opacity-90"
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-slate-100 truncate">
                                        {f.faculty_name}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-1">
                                        {f.department || 'General'}
                                    </p>
                                </div>
                                <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${status.bg} ${status.color}`}>
                                    <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
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
                                        <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-800/60 px-2 py-1 rounded">
                                            Floor {f.last_seen_floor}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} weight="duotone" />
                                        <span>Seen {formatTimeAgo(f.last_seen_at)}</span>
                                    </div>
                                    <span className="text-amber-500 font-bold uppercase tracking-widest">
                                        Cached
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Cache timestamp */}
            {lastSync && (
                <div className="text-center text-xs text-slate-500">
                    <Clock size={12} className="inline mr-1" />
                    Data cached at {lastSync.toLocaleString()}
                </div>
            )}
        </div>
    );
}

export default OfflineFacultyView;
