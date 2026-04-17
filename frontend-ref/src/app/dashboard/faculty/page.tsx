'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    User,
    MapPin,
    Eye,
    EyeSlash,
    CheckCircle,
    Clock,
    Circle,
    Buildings,
    Spinner,
    ArrowsClockwise,
    Info,
    ToggleLeft,
    ToggleRight,
    Warning
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

const STATUS_OPTIONS: { value: 'AVAILABLE' | 'BUSY' | 'OFFLINE'; label: string; description: string; color: string; bg: string }[] = [
    { value: 'AVAILABLE', label: 'Available', description: 'Can meet students', color: 'text-green-400', bg: 'bg-green-600' },
    { value: 'BUSY', label: 'Busy', description: 'On campus but unavailable', color: 'text-amber-400', bg: 'bg-amber-600' },
    { value: 'OFFLINE', label: 'Offline', description: 'Not available', color: 'text-slate-400', bg: 'bg-slate-600' },
];

const VISIBILITY_OPTIONS: { value: 'ALL_STUDENTS' | 'SAME_DEPARTMENT' | 'ADMIN_ONLY' | 'HIDDEN'; label: string; description: string; icon: typeof Eye }[] = [
    { value: 'ALL_STUDENTS', label: 'All Students', description: 'Any student can see your status', icon: Eye },
    { value: 'SAME_DEPARTMENT', label: 'Same Department', description: 'Only students in your department', icon: User },
    { value: 'ADMIN_ONLY', label: 'Admin Only', description: 'Only administrators can see', icon: EyeSlash },
    { value: 'HIDDEN', label: 'Hidden', description: 'Not visible to anyone', icon: EyeSlash },
];

export default function FacultyAvailabilityPage() {
    const [settings, setSettings] = useState<FacultySettings | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [selectedBuilding, setSelectedBuilding] = useState<number | ''>('');
    const [selectedFloor, setSelectedFloor] = useState<number | ''>('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [settingsData, buildingsData] = await Promise.all([
                api.getFacultySettings(),
                api.getCampusBuildings()
            ]);
            setSettings(settingsData);
            setBuildings(buildingsData);
            setStatusMessage(settingsData.status_message || '');
        } catch (err) {
            console.error('Failed to load settings', err);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (updates: {
        is_sharing_enabled?: boolean;
        availability_status?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
        visibility_level?: 'ALL_STUDENTS' | 'SAME_DEPARTMENT' | 'ADMIN_ONLY' | 'HIDDEN';
        status_message?: string | null;
    }) => {
        setSaving(true);
        setMessage(null);
        try {
            const updatedSettings = await api.updateFacultySettings(updates);
            setSettings(updatedSettings);
            setMessage({ type: 'success', text: 'Settings updated!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update settings' });
        } finally {
            setSaving(false);
        }
    };

    const refreshLocation = async () => {
        if (!selectedBuilding) {
            setMessage({ type: 'error', text: 'Please select a building' });
            return;
        }
        setRefreshing(true);
        setMessage(null);
        try {
            const updatedSettings = await api.refreshFacultyLocation(
                selectedBuilding as number,
                selectedFloor || undefined
            );
            setSettings(updatedSettings);
            setMessage({ type: 'success', text: 'Location updated!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to refresh location' });
        } finally {
            setRefreshing(false);
        }
    };

    const selectedBuildingData = buildings.find(b => b.id === selectedBuilding);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-slate-500 font-mono flex items-center gap-2">
                    <Spinner size={20} className="animate-spin" />
                    Loading settings...
                </div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-12">
                <Warning size={48} className="text-red-400 mx-auto mb-4" />
                <p className="text-slate-400">Failed to load settings. Please refresh the page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <MapPin size={28} weight="duotone" className="text-blue-400" />
                    Availability Settings
                </h1>
                <p className="text-slate-500 mt-1">Control your visibility and location sharing with students</p>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                    ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                    : 'bg-red-900/30 border border-red-700/50 text-red-300'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <Warning size={20} />}
                    {message.text}
                </div>
            )}

            {/* Privacy Notice */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 flex items-start gap-3">
                <Info size={24} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Your Privacy</p>
                    <p className="text-blue-400">
                        You have full control over your visibility. Location sharing is opt-in and
                        only shows your last-seen campus area - not live tracking. You can disable
                        sharing at any time.
                    </p>
                </div>
            </div>

            {/* Main Toggle */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            {settings.is_sharing_enabled ? (
                                <Eye size={24} className="text-green-400" />
                            ) : (
                                <EyeSlash size={24} className="text-slate-500" />
                            )}
                            Location Sharing
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {settings.is_sharing_enabled
                                ? 'Students can see your availability and last-seen location'
                                : 'You are hidden from students'
                            }
                        </p>
                    </div>
                    <button
                        onClick={() => updateSettings({ is_sharing_enabled: !settings.is_sharing_enabled })}
                        disabled={saving}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                        {settings.is_sharing_enabled ? (
                            <ToggleRight size={48} weight="fill" className="text-green-500" />
                        ) : (
                            <ToggleLeft size={48} weight="fill" className="text-slate-500" />
                        )}
                    </button>
                </div>
            </div>

            {/* Status Selection */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Circle size={20} weight="fill" className={STATUS_OPTIONS.find(s => s.value === settings.availability_status)?.color} />
                    Current Status
                </h2>
                <div className="grid grid-cols-3 gap-3">
                    {STATUS_OPTIONS.map((status) => (
                        <button
                            key={status.value}
                            onClick={() => updateSettings({ availability_status: status.value })}
                            disabled={saving}
                            className={`p-4 rounded-lg text-center transition-all ${settings.availability_status === status.value
                                ? `${status.bg} text-white`
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                }`}
                        >
                            <div className="font-semibold">{status.label}</div>
                            <div className="text-xs mt-1 opacity-75">{status.description}</div>
                        </button>
                    ))}
                </div>

                {/* Status Message */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Status Message (optional)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={statusMessage}
                            onChange={(e) => setStatusMessage(e.target.value)}
                            placeholder="e.g., In meeting until 3pm"
                            maxLength={200}
                            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <button
                            onClick={() => updateSettings({ status_message: statusMessage || null })}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Visibility Level */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Eye size={20} className="text-slate-400" />
                    Who Can See You
                </h2>
                <div className="space-y-2">
                    {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                onClick={() => updateSettings({ visibility_level: option.value })}
                                disabled={saving}
                                className={`w-full p-4 rounded-lg text-left flex items-center gap-4 transition-all ${settings.visibility_level === option.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                <Icon size={24} />
                                <div>
                                    <div className="font-semibold">{option.label}</div>
                                    <div className="text-sm opacity-75">{option.description}</div>
                                </div>
                                {settings.visibility_level === option.value && (
                                    <CheckCircle size={24} weight="fill" className="ml-auto" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Location Refresh */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Buildings size={20} className="text-slate-400" />
                    Update Your Location
                </h2>

                {/* Current Location Display */}
                {settings.last_seen_building && (
                    <div className="bg-slate-900/50 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <MapPin size={24} className="text-blue-400" />
                        <div>
                            <div className="font-medium">
                                {settings.last_seen_building.name}
                                {settings.last_seen_floor && ` (Floor ${settings.last_seen_floor})`}
                            </div>
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                                <Clock size={14} />
                                Last updated: {settings.last_seen_at
                                    ? new Date(settings.last_seen_at).toLocaleString()
                                    : 'Never'
                                }
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Building
                        </label>
                        <select
                            value={selectedBuilding}
                            onChange={(e) => {
                                setSelectedBuilding(e.target.value ? parseInt(e.target.value) : '');
                                setSelectedFloor('');
                            }}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">Select building...</option>
                            {buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Floor (optional)
                        </label>
                        <select
                            value={selectedFloor}
                            onChange={(e) => setSelectedFloor(e.target.value ? parseInt(e.target.value) : '')}
                            disabled={!selectedBuildingData}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        >
                            <option value="">Any floor</option>
                            {selectedBuildingData && Array.from(
                                { length: selectedBuildingData.floor_count },
                                (_, i) => i + 1
                            ).map(floor => (
                                <option key={floor} value={floor}>Floor {floor}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={refreshLocation}
                    disabled={refreshing || !selectedBuilding}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {refreshing ? (
                        <>
                            <Spinner size={20} className="animate-spin" />
                            Updating...
                        </>
                    ) : (
                        <>
                            <ArrowsClockwise size={20} />
                            Update My Location
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
