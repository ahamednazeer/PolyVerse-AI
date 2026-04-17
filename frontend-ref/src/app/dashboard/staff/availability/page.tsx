'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import {
    MapPin,
    Eye,
    EyeSlash,
    CheckCircle,
    Clock,
    Circle,
    ArrowsClockwise,
    ToggleLeft,
    ToggleRight,
    Warning,
    CaretLeft,
    ShieldCheck,
    ChatCircle,
    Broadcast,
    Pulse,
    Buildings,
    Lightning
} from '@phosphor-icons/react';

interface Building {
    id: number;
    name: string;
    code: string;
    floor_count: number;
}

interface FacultySettings {
    id: number;
    faculty_id: number;
    is_sharing_enabled: boolean;
    availability_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    visibility_level: 'ALL_STUDENTS' | 'SAME_DEPARTMENT' | 'ADMIN_ONLY' | 'HIDDEN';
    status_message: string | null;
    last_seen_building: Building | null;
    last_seen_floor: number | null;
    last_seen_at: string | null;
    updated_at: string;
}

type StatusType = 'AVAILABLE' | 'BUSY' | 'OFFLINE';
type VisibilityType = 'ALL_STUDENTS' | 'SAME_DEPARTMENT' | 'ADMIN_ONLY' | 'HIDDEN';

const STATUS_OPTIONS: { value: StatusType; label: string; description: string; color: string; bgActive: string }[] = [
    { value: 'AVAILABLE', label: 'Available', description: 'Open for consultations', color: 'text-green-400', bgActive: 'bg-green-500/10 border-green-500/50 ring-1 ring-green-500/20' },
    { value: 'BUSY', label: 'Busy', description: 'In a meeting or class', color: 'text-amber-400', bgActive: 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/20' },
    { value: 'OFFLINE', label: 'Offline', description: 'Not on campus', color: 'text-slate-400', bgActive: 'bg-slate-500/10 border-slate-500/50 ring-1 ring-slate-500/20' },
];

const VISIBILITY_OPTIONS: { value: VisibilityType; label: string; icon: any; description: string; colorActive: string }[] = [
    { value: 'ALL_STUDENTS', label: 'Public', icon: Eye, description: 'Everyone can see', colorActive: 'text-blue-400' },
    { value: 'SAME_DEPARTMENT', label: 'Department', icon: ShieldCheck, description: 'Your students only', colorActive: 'text-cyan-400' },
    { value: 'ADMIN_ONLY', label: 'Admin Only', icon: EyeSlash, description: 'Hidden from students', colorActive: 'text-amber-400' },
    { value: 'HIDDEN', label: 'Incognito', icon: EyeSlash, description: 'Completely hidden', colorActive: 'text-red-400' },
];

export default function FacultyAvailabilitySettings() {
    const router = useRouter();
    const [settings, setSettings] = useState<FacultySettings | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [selectedBuilding, setSelectedBuilding] = useState<number | ''>('');
    const [selectedFloor, setSelectedFloor] = useState<number | ''>('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        async function fetchData() {
            try {
                const [settingsData, buildingsData] = await Promise.all([
                    api.getFacultySettings(),
                    api.getCampusBuildings()
                ]);
                setSettings(settingsData);
                setBuildings(buildingsData);
                setStatusMessage(settingsData.status_message || '');
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to connect to server' });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const updateSettings = async (updates: any) => {
        setSaving(true);
        setMessage(null);
        try {
            const updated = await api.updateFacultySettings(updates);
            setSettings(updated);
            setMessage({ type: 'success', text: 'Settings saved successfully' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Update failed' });
        } finally {
            setSaving(false);
        }
    };

    const refreshLocation = async () => {
        if (!selectedBuilding) {
            setMessage({ type: 'error', text: 'Please select a building first' });
            return;
        }
        setRefreshing(true);
        setMessage(null);
        try {
            const updated = await api.refreshFacultyLocation(
                selectedBuilding as number,
                selectedFloor || undefined
            );
            setSettings(updated);
            setMessage({ type: 'success', text: 'Location updated on campus!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Location update failed' });
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Presence Settings...
                </p>
            </div>
        );
    }

    const selectedBuildingData = buildings.find(b => b.id === selectedBuilding);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/dashboard/staff')}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all text-slate-400 hover:text-slate-100 hover:scale-105 active:scale-95"
                >
                    <CaretLeft size={20} weight="bold" />
                </button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100">
                        Presence Settings
                    </h1>
                    <p className="text-slate-500 mt-1 font-mono text-[11px] uppercase tracking-widest">
                        Visibility & Location Control
                    </p>
                </div>
            </div>

            {/* Notification Toast */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border ${message.type === 'success'
                        ? 'bg-green-950/30 border-green-700/50 text-green-400'
                        : 'bg-red-950/30 border-red-700/50 text-red-400'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle size={22} weight="fill" className="flex-shrink-0" />
                    ) : (
                        <Warning size={22} weight="fill" className="flex-shrink-0" />
                    )}
                    <span className="text-sm font-bold uppercase font-mono tracking-wider">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Master Toggle */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 hover:border-slate-600 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-lg font-chivo font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Lightning size={18} weight="fill" className="text-amber-400" />
                                    Master Switch
                                </h2>
                                <p className="text-sm text-slate-500">Enable campus location tracking</p>
                            </div>
                            <button
                                onClick={() => updateSettings({ is_sharing_enabled: !settings?.is_sharing_enabled })}
                                disabled={saving}
                                className="transition-all active:scale-90 hover:scale-105 disabled:opacity-50"
                            >
                                {settings?.is_sharing_enabled ? (
                                    <ToggleRight size={56} weight="fill" className="text-blue-400" />
                                ) : (
                                    <ToggleLeft size={56} weight="fill" className="text-slate-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Status Options */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                        <h2 className="text-base font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Circle size={16} weight="fill" className="text-green-400" />
                            Availability Status
                        </h2>
                        <div className="space-y-3">
                            {STATUS_OPTIONS.map((opt) => {
                                const isSelected = settings?.availability_status === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateSettings({ availability_status: opt.value })}
                                        disabled={saving}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${isSelected
                                                ? opt.bgActive
                                                : 'bg-slate-900/40 border-slate-700/60 hover:bg-slate-800/40 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Circle size={14} weight="fill" className={opt.color} />
                                            <span className={`font-bold uppercase tracking-wide text-sm ${isSelected ? 'text-slate-100' : 'text-slate-400'}`}>
                                                {opt.label}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-mono uppercase tracking-widest ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {opt.description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Visibility Options */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                        <h2 className="text-base font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                            <ShieldCheck size={18} weight="duotone" className="text-purple-400" />
                            Privacy Level
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {VISIBILITY_OPTIONS.map((opt) => {
                                const isSelected = settings?.visibility_level === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateSettings({ visibility_level: opt.value })}
                                        disabled={saving}
                                        className={`flex flex-col items-start gap-3 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${isSelected
                                                ? 'bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500/20'
                                                : 'bg-slate-900/40 border-slate-700/60 hover:bg-slate-800/40 hover:border-slate-600'
                                            }`}
                                    >
                                        <opt.icon
                                            size={26}
                                            weight="duotone"
                                            className={isSelected ? opt.colorActive : 'text-slate-600'}
                                        />
                                        <div className="text-left">
                                            <p className={`text-sm font-bold uppercase tracking-tight ${isSelected ? 'text-slate-100' : 'text-slate-400'}`}>
                                                {opt.label}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter mt-1">
                                                {opt.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Location Update */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                        <Buildings size={120} weight="duotone" className="absolute -right-6 -bottom-6 text-slate-800/30" />
                        <div className="relative z-10">
                            <h2 className="text-base font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                                <MapPin size={18} weight="duotone" className="text-blue-400" />
                                Update Location
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-500 uppercase font-mono tracking-widest block">Building</label>
                                        <select
                                            value={selectedBuilding}
                                            onChange={(e) => {
                                                setSelectedBuilding(e.target.value ? parseInt(e.target.value) : '');
                                                setSelectedFloor('');
                                            }}
                                            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 outline-none hover:border-blue-500/50 focus:border-blue-500 transition-all text-sm font-semibold cursor-pointer"
                                        >
                                            <option value="">Select...</option>
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-500 uppercase font-mono tracking-widest block">Floor</label>
                                        <select
                                            value={selectedFloor}
                                            onChange={(e) => setSelectedFloor(e.target.value ? parseInt(e.target.value) : '')}
                                            disabled={!selectedBuilding}
                                            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 outline-none hover:border-blue-500/50 focus:border-blue-500 transition-all text-sm font-semibold cursor-pointer disabled:opacity-30"
                                        >
                                            <option value="">General</option>
                                            {selectedBuildingData && Array.from({ length: selectedBuildingData.floor_count }, (_, i) => i + 1).map(f => (
                                                <option key={f} value={f}>Floor {f}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={refreshLocation}
                                    disabled={refreshing || !selectedBuilding}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-white font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100"
                                >
                                    {refreshing ? (
                                        <ArrowsClockwise size={20} className="animate-spin" />
                                    ) : (
                                        <Broadcast size={20} />
                                    )}
                                    {refreshing ? 'Updating...' : 'Update My Location'}
                                </button>

                                {settings?.last_seen_building && (
                                    <div className="flex items-center justify-center gap-4 py-3 border-t border-slate-700/40 text-[11px] font-mono text-slate-500 tracking-wider">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-blue-400" />
                                            {settings.last_seen_building.name}
                                            {settings.last_seen_floor && ` F${settings.last_seen_floor}`}
                                        </div>
                                        <span className="text-slate-700">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-slate-500" />
                                            {new Date(settings.last_seen_at!).toLocaleTimeString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Message Broadcast */}
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-blue-900/30 rounded-xl">
                        <ChatCircle size={22} weight="duotone" className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-chivo font-bold uppercase tracking-wider text-slate-200">Status Message</h2>
                        <p className="text-xs text-slate-500">This message is visible to students who view your profile</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <textarea
                        value={statusMessage}
                        onChange={(e) => setStatusMessage(e.target.value)}
                        placeholder="e.g. Available in Room 402 for walk-in consultations until 4pm"
                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-5 py-4 text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 transition-all text-sm resize-none"
                        rows={3}
                    />
                    <button
                        onClick={() => updateSettings({ status_message: statusMessage || null })}
                        disabled={saving}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 font-bold uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 hover:border-blue-500/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                        <CheckCircle size={16} />
                        Save Message
                    </button>
                </div>
            </div>
        </div>
    );
}
