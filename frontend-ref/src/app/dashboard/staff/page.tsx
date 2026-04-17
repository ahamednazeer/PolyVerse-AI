'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { api } from '@/lib/api';
import {
    User,
    Eye,
    EyeSlash,
    MapPin,
    Circle,
    ArrowRight,
    CalendarBlank,
    Clock,
    CheckCircle,
    ShieldCheck,
    Broadcast,
    Lightning,
    Sparkle,
    Pulse,
    ChartLineUp,
    Books
} from '@phosphor-icons/react';

interface FacultySettings {
    is_sharing_enabled: boolean;
    availability_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    visibility_level?: string;
    status_message: string | null;
    last_seen_building: { name: string } | null;
    last_seen_at: string | null;
}

const STATUS_CONFIG = {
    AVAILABLE: {
        color: 'text-green-400',
        bg: 'bg-gradient-to-br from-green-900/40 to-green-950/60 border border-green-700/30',
        label: 'Available',
        pulse: 'animate-pulse'
    },
    BUSY: {
        color: 'text-amber-400',
        bg: 'bg-gradient-to-br from-amber-900/40 to-amber-950/60 border border-amber-700/30',
        label: 'Busy',
        pulse: ''
    },
    OFFLINE: {
        color: 'text-slate-400',
        bg: 'bg-gradient-to-br from-slate-800/40 to-slate-900/60 border border-slate-700/30',
        label: 'Offline',
        pulse: ''
    },
};

const formatTimeAgo = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
};

export default function StaffDashboard() {
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState<FacultySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [userData, settingsData] = await Promise.all([
                    api.getMe(),
                    api.getFacultySettings().catch(() => null),
                ]);
                setUser(userData);
                setSettings(settingsData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const cycleStatus = async () => {
        if (updating) return;
        setUpdating(true);
        try {
            const nextStatus = settings?.availability_status === 'AVAILABLE' ? 'BUSY'
                : settings?.availability_status === 'BUSY' ? 'OFFLINE'
                    : 'AVAILABLE';
            const updated = await api.updateFacultySettings({ availability_status: nextStatus as any });
            setSettings(updated);
        } catch (err) {
            console.error('Failed to cycle status', err);
        } finally {
            setUpdating(false);
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
                    Syncing Faculty Data...
                </p>
            </div>
        );
    }

    const statusConfig = settings ? STATUS_CONFIG[settings.availability_status] : STATUS_CONFIG.OFFLINE;

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100">
                        Welcome back, <span className="text-blue-400">{user?.first_name || 'Faculty'}</span>
                    </h1>
                    <p className="text-slate-500 mt-2 flex items-center gap-2 text-sm">
                        <User size={16} weight="duotone" className="text-slate-400" />
                        <span>{user?.department || 'Staff Member'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="font-mono text-[11px] uppercase tracking-widest">Faculty Portal</span>
                    </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-mono bg-slate-800/30 px-4 py-2 rounded-lg border border-slate-700/40">
                    <CalendarBlank size={16} weight="duotone" className="text-blue-400" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Visibility Card */}
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-700/30 rounded-xl p-5 hover:border-blue-500/50 transition-all duration-300 group">
                    <div className="flex items-center gap-2 text-blue-400 mb-3">
                        {settings?.is_sharing_enabled ? (
                            <Eye size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                        ) : (
                            <EyeSlash size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-xs font-mono uppercase tracking-widest">Visibility</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-mono font-black text-slate-100 tracking-tight">
                        {settings?.is_sharing_enabled ? 'PUBLIC' : 'HIDDEN'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono uppercase">Location sharing</p>
                </div>

                {/* Status Card */}
                <div className={`${statusConfig.bg} rounded-xl p-5 hover:scale-[1.02] transition-all duration-300 group cursor-pointer`} onClick={cycleStatus}>
                    <div className={`flex items-center gap-2 ${statusConfig.color} mb-3`}>
                        <Circle size={20} weight="fill" className={`group-hover:scale-110 transition-transform ${statusConfig.pulse}`} />
                        <span className="text-xs font-mono uppercase tracking-widest">Status</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-mono font-black text-slate-100 uppercase tracking-tight">
                        {statusConfig.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono uppercase">
                        {updating ? 'Updating...' : 'Click to cycle'}
                    </p>
                </div>

                {/* Location Card */}
                <div className="bg-gradient-to-br from-orange-900/40 to-orange-950/60 border border-orange-700/30 rounded-xl p-5 hover:border-orange-500/50 transition-all duration-300 group">
                    <div className="flex items-center gap-2 text-orange-400 mb-3">
                        <MapPin size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-mono uppercase tracking-widest">Location</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-mono font-black text-slate-100 truncate tracking-tight">
                        {settings?.last_seen_building?.name || 'OFF-CAMPUS'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono uppercase">
                        Updated {formatTimeAgo(settings?.last_seen_at ?? null)}
                    </p>
                </div>

                {/* Privacy Level Card */}
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-950/60 border border-purple-700/30 rounded-xl p-5 hover:border-purple-500/50 transition-all duration-300 group">
                    <div className="flex items-center gap-2 text-purple-400 mb-3">
                        <ShieldCheck size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-mono uppercase tracking-widest">Privacy</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-mono font-black text-slate-100 uppercase tracking-tight">
                        {settings?.visibility_level?.split('_')[0] || 'ALL'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono uppercase">Access level</p>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider flex items-center gap-2">
                        <Lightning size={20} weight="fill" className="text-amber-400" />
                        Quick Actions
                    </h2>
                    <Link href="/dashboard/staff/availability" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 group">
                        <span>All Settings</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Update Location Action */}
                    <Link
                        href="/dashboard/staff/availability"
                        className="block bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 group"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-950/60 rounded-xl group-hover:bg-blue-900/60 transition-colors">
                                    <MapPin size={28} weight="duotone" className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors text-lg">
                                        Update Location
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5">Broadcast your campus presence</p>
                                </div>
                            </div>
                            <ArrowRight size={22} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    </Link>

                    {/* Status Toggle Action */}
                    <button
                        onClick={cycleStatus}
                        disabled={updating}
                        className="block w-full text-left bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 hover:border-green-500/50 hover:bg-slate-800/60 transition-all duration-300 group disabled:opacity-50"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${statusConfig.bg} group-hover:scale-105 transition-transform`}>
                                    <Circle size={28} weight="fill" className={statusConfig.color} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-100 group-hover:text-green-400 transition-colors text-lg">
                                        Toggle Status
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Currently: <span className={`font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
                                    </p>
                                </div>
                            </div>
                            <ArrowRight size={22} className="text-slate-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    </button>

                    {/* Learning Management Action */}
                    <Link
                        href="/dashboard/staff/learning"
                        className="block bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 hover:border-purple-500/50 hover:bg-slate-800/60 transition-all duration-300 group md:col-span-2"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-950/60 rounded-xl group-hover:bg-purple-900/60 transition-colors">
                                    <Books size={28} weight="duotone" className="text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-100 group-hover:text-purple-400 transition-colors text-lg">
                                        Learning Management
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5">Manage courses, flashcards, doubt sessions & knowledge topics</p>
                                </div>
                            </div>
                            <ArrowRight size={22} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Status Broadcast Section */}
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-blue-900/30 rounded-lg">
                        <Broadcast size={22} weight="duotone" className="text-blue-400" />
                    </div>
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider">Current Broadcast</h2>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-5 mb-5 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-800/50" />
                    <p className="text-slate-300 italic text-lg relative z-10">
                        "{settings?.status_message || 'No status message set. Add one in settings...'}"
                    </p>
                </div>

                <div className="space-y-3 text-slate-400 text-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
                        <p>Your <span className="text-blue-400 font-mono font-bold">Location Data</span> is visible based on your privacy settings.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2" />
                        <p>Admins can view your presence logs regardless of visibility configuration.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
                        <p>Access restricted to: <span className="text-purple-400 font-mono font-bold">{settings?.visibility_level?.replace(/_/g, ' ') || 'ALL STUDENTS'}</span></p>
                    </div>
                </div>
            </div>

            {/* Tip Block */}
            <div className="bg-gradient-to-r from-blue-950/40 to-blue-900/20 border border-blue-800/30 rounded-xl p-5 flex items-start gap-4">
                <div className="p-2.5 bg-blue-900/40 rounded-xl flex-shrink-0">
                    <Clock size={22} weight="duotone" className="text-blue-400" />
                </div>
                <div>
                    <p className="text-blue-300 font-semibold mb-1">Pro Tip</p>
                    <p className="text-sm text-blue-400/80 leading-relaxed">
                        Keep your location updated during office hours to help students find you.
                        Set your status to "Busy" when in meetings to automatically hide your room number from students.
                    </p>
                </div>
            </div>
        </div>
    );
}
