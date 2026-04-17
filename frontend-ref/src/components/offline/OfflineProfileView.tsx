'use client';

import React from 'react';
import { useOffline } from '@/components/OfflineContext';
import { OfflineIndicator } from '@/components/OfflineBanner';
import {
    User,
    Envelope,
    IdentificationBadge,
    BookOpen,
    Buildings,
    CloudSlash,
    Sparkle
} from '@phosphor-icons/react';

export function OfflineProfileView() {
    const { offlineData, lastSyncTimes } = useOffline();
    const profile = offlineData.studentProfile;
    const hostelInfo = offlineData.hostelInfo;
    const lastSync = lastSyncTimes.studentProfile;

    if (!profile) {
        return (
            <div className="space-y-4">
                <OfflineIndicator dataKey="STUDENT_PROFILE" className="mx-auto" />
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center">
                    <CloudSlash size={48} className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No Cached Profile</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        Your profile data was not cached. Visit your profile page while online to cache this data.
                    </p>
                </div>
            </div>
        );
    }

    const fullName = `${profile.first_name} ${profile.last_name || ''}`.trim();
    const categoryLabel = profile.student_category === 'HOSTELLER' ? 'Hosteller' : 'Day Scholar';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <User size={28} weight="duotone" className="text-indigo-400" />
                    My Profile
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Cached profile information</p>
            </div>

            {/* Offline Indicator */}
            <div className="flex justify-center">
                <OfflineIndicator dataKey="STUDENT_PROFILE" />
            </div>

            {/* Profile Card */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/60 rounded-2xl p-8 relative overflow-hidden">
                <Sparkle size={100} weight="duotone" className="absolute -right-4 -top-4 text-slate-800/30" />

                {/* Avatar & Name */}
                <div className="flex items-center gap-6 mb-8 relative z-10">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                        {profile.first_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">{fullName}</h2>
                        <p className="text-indigo-400 font-medium uppercase tracking-widest text-xs mt-1">
                            {categoryLabel}
                        </p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email */}
                    <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-900/40 rounded-lg">
                                <Envelope size={18} className="text-indigo-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">
                                Email
                            </span>
                        </div>
                        <p className="text-slate-200 font-medium">{profile.email}</p>
                    </div>

                    {/* Student ID */}
                    <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-900/40 rounded-lg">
                                <IdentificationBadge size={18} className="text-indigo-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">
                                Student ID
                            </span>
                        </div>
                        <p className="text-slate-200 font-medium font-mono">{profile.student_id || 'N/A'}</p>
                    </div>

                    {/* Department */}
                    <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-900/40 rounded-lg">
                                <BookOpen size={18} className="text-indigo-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">
                                Department / Batch
                            </span>
                        </div>
                        <p className="text-slate-200 font-medium">
                            {profile.department || 'N/A'} {profile.batch && `• ${profile.batch}`}
                        </p>
                    </div>

                    {/* Hostel Info */}
                    {hostelInfo?.is_assigned && (
                        <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-900/40 rounded-lg">
                                    <Buildings size={18} className="text-indigo-400" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">
                                    Hostel Assignment
                                </span>
                            </div>
                            <p className="text-slate-200 font-medium">
                                {hostelInfo.hostel_name || 'N/A'} • Room {hostelInfo.room_number || 'N/A'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Photo upload disabled notice */}
                <div className="mt-6 bg-amber-900/20 border border-amber-700/30 rounded-lg px-4 py-3 text-amber-400 text-xs flex items-center gap-2">
                    <CloudSlash size={14} />
                    Profile editing and photo upload are disabled in offline mode
                </div>
            </div>

            {/* Cache timestamp */}
            {lastSync && (
                <div className="text-center text-xs text-slate-500">
                    Data cached at {lastSync.toLocaleString()}
                </div>
            )}
        </div>
    );
}

export default OfflineProfileView;
