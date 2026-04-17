'use client';

import React, { useState, useEffect } from 'react';
import {
    WifiSlash,
    ArrowClockwise,
    DoorOpen,
    Users,
    User,
    CaretDown,
    CaretUp,
    MapPin,
    Clock,
    CheckCircle,
    Warning,
    Buildings,
    X,
    Eye,
    Phone,
    Shield,
    XCircle,
    CloudSlash
} from '@phosphor-icons/react';
import { getOfflineData, getLastSyncTime, OFFLINE_KEYS } from '@/lib/offlineStorage';

// Types for cached data
interface CachedOutpass {
    id: number;
    reason: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    emergency_contact: string;
    status: string;
    reviewed_at?: string;
    created_at: string;
}

interface CachedFacultyMember {
    faculty_id: number;
    faculty_name: string;
    department: string | null;
    availability_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    last_seen_building_name: string | null;
}

interface CachedProfile {
    email: string;
    first_name: string;
    last_name?: string;
    student_id?: string;
    department?: string;
}

interface CachedHostelInfo {
    hostel_name: string | null;
    room_number: string | null;
    warden_name?: string | null;
}

// Format helpers
const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDisplayTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
};

const formatFullDateTime = (dateStr: string) => `${formatDisplayDate(dateStr)} | ${formatDisplayTime(dateStr)}`;

const generateOutpassId = (id: number, createdAt: string) => {
    const year = new Date(createdAt).getFullYear();
    return `OP-${year}-${String(id).padStart(6, '0')}`;
};

const isOutpassValid = (startDatetime: string, endDatetime: string) => {
    const now = new Date();
    return now >= new Date(startDatetime) && now <= new Date(endDatetime);
};

export default function OfflinePage() {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [showOutpassModal, setShowOutpassModal] = useState(false);
    const [outpass, setOutpass] = useState<CachedOutpass | null>(null);
    const [faculty, setFaculty] = useState<CachedFacultyMember[]>([]);
    const [profile, setProfile] = useState<CachedProfile | null>(null);
    const [hostel, setHostel] = useState<CachedHostelInfo | null>(null);
    const [syncTimes, setSyncTimes] = useState<Record<string, Date | null>>({});

    useEffect(() => {
        setOutpass(getOfflineData<CachedOutpass>(OFFLINE_KEYS.APPROVED_OUTPASS));
        setFaculty(getOfflineData<CachedFacultyMember[]>(OFFLINE_KEYS.FACULTY_AVAILABILITY) || []);
        setProfile(getOfflineData<CachedProfile>(OFFLINE_KEYS.STUDENT_PROFILE));
        setHostel(getOfflineData<CachedHostelInfo>(OFFLINE_KEYS.HOSTEL_INFO));

        setSyncTimes({
            outpass: getLastSyncTime(OFFLINE_KEYS.APPROVED_OUTPASS),
            faculty: getLastSyncTime(OFFLINE_KEYS.FACULTY_AVAILABILITY),
            profile: getLastSyncTime(OFFLINE_KEYS.STUDENT_PROFILE),
        });
    }, []);

    const handleRetry = () => window.location.reload();
    const toggleSection = (section: string) => setExpandedSection(expandedSection === section ? null : section);
    const formatTime = (date: Date | null) => date ? new Date(date).toLocaleString() : 'Never synced';
    const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    // Check outpass validity
    const isValid = outpass && isOutpassValid(outpass.start_datetime, outpass.end_datetime);
    const isExpired = outpass && new Date() > new Date(outpass.end_datetime);

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-900/40 to-amber-950/60 border border-amber-700/40 flex items-center justify-center mx-auto mb-4">
                        <WifiSlash size={40} weight="duotone" className="text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-wide mb-2">
                        Offline Safe Mode
                    </h1>
                    <p className="text-slate-400 text-sm">
                        You're currently offline. Viewing cached data.
                    </p>
                </div>

                {/* Digital Outpass Button - Primary Action */}
                {outpass && (
                    <button
                        onClick={() => setShowOutpassModal(true)}
                        className="w-full mb-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg"
                    >
                        <Eye size={24} weight="bold" />
                        View Digital Outpass
                        {isValid && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">VALID</span>}
                        {isExpired && <span className="text-xs bg-red-500/50 px-2 py-0.5 rounded-full">EXPIRED</span>}
                    </button>
                )}

                {/* Expandable Sections */}
                <div className="space-y-3 mb-6">

                    {/* Profile Section */}
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
                        <button onClick={() => toggleSection('profile')} className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <User size={22} className="text-blue-400" />
                                <span className="font-semibold text-slate-200">Student Profile</span>
                                {profile && <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">Cached</span>}
                            </div>
                            {expandedSection === 'profile' ? <CaretUp size={18} className="text-slate-400" /> : <CaretDown size={18} className="text-slate-400" />}
                        </button>
                        {expandedSection === 'profile' && (
                            <div className="px-4 pb-4 border-t border-slate-700/40">
                                {profile ? (
                                    <div className="pt-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-lg">
                                                {profile.first_name?.[0]}{profile.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-100">{profile.first_name} {profile.last_name}</p>
                                                <p className="text-sm text-slate-400">{profile.email}</p>
                                            </div>
                                        </div>
                                        {profile.student_id && <p className="text-sm text-slate-400">ID: <span className="text-slate-300 font-mono">{profile.student_id}</span></p>}
                                        {profile.department && <p className="text-sm text-slate-400">Department: <span className="text-slate-300">{profile.department}</span></p>}
                                        {hostel?.hostel_name && (
                                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                                <Buildings size={14} />
                                                {hostel.hostel_name} {hostel.room_number && `• Room ${hostel.room_number}`}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500">Last synced: {formatTime(syncTimes.profile)}</p>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm pt-4">No cached profile data available.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Faculty Section */}
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
                        <button onClick={() => toggleSection('faculty')} className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <Users size={22} className="text-indigo-400" />
                                <span className="font-semibold text-slate-200">Faculty Availability</span>
                                {faculty.length > 0 && <span className="text-xs bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded-full">{faculty.length} cached</span>}
                            </div>
                            {expandedSection === 'faculty' ? <CaretUp size={18} className="text-slate-400" /> : <CaretDown size={18} className="text-slate-400" />}
                        </button>
                        {expandedSection === 'faculty' && (
                            <div className="px-4 pb-4 border-t border-slate-700/40">
                                {faculty.length > 0 ? (
                                    <div className="pt-4 space-y-2 max-h-64 overflow-y-auto">
                                        {faculty.slice(0, 10).map((f) => (
                                            <div key={f.faculty_id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                                                <div>
                                                    <p className="text-slate-200 text-sm font-medium">{f.faculty_name}</p>
                                                    <p className="text-xs text-slate-500">{f.department || 'No department'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {f.last_seen_building_name && (
                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {f.last_seen_building_name}
                                                        </span>
                                                    )}
                                                    <span className={`w-2 h-2 rounded-full ${f.availability_status === 'AVAILABLE' ? 'bg-green-400' : f.availability_status === 'BUSY' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-xs text-slate-500 pt-2">Last synced: {formatTime(syncTimes.faculty)}</p>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm pt-4">No cached faculty data available.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
                    <Warning size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-400/80 text-sm">Data shown is from cache and may be outdated.</p>
                </div>

                {/* Retry Button */}
                <button onClick={handleRetry} className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg">
                    <ArrowClockwise size={20} weight="bold" />
                    Retry Connection
                </button>

                <p className="text-center text-xs text-slate-600 uppercase tracking-widest font-mono mt-8">Institution Mangement System</p>
            </div>

            {/* Digital Outpass Modal */}
            {showOutpassModal && outpass && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="relative max-w-md w-full">
                        {/* Close Button */}
                        <button onClick={() => setShowOutpassModal(false)} className="absolute -top-12 right-0 text-white/70 hover:text-white p-2">
                            <X size={28} />
                        </button>

                        {/* Paper-Like Outpass Card */}
                        <div className={`relative bg-gradient-to-b from-white to-gray-100 rounded-lg shadow-2xl overflow-hidden ${isExpired ? 'opacity-90' : ''}`}
                            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', transform: 'perspective(1000px) rotateX(2deg)' }}>

                            {/* Watermarks */}
                            {isExpired && (
                                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                    <div className="text-red-500/30 text-6xl font-bold font-mono rotate-[-25deg]">EXPIRED</div>
                                </div>
                            )}
                            {isValid && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <div className="text-green-500/15 text-7xl font-bold font-mono rotate-[-25deg]">VALID</div>
                                </div>
                            )}

                            {/* Offline Badge */}
                            <div className="absolute top-2 right-2 z-30 bg-amber-500 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <CloudSlash size={12} />
                                OFFLINE VIEW
                            </div>

                            {/* Header */}
                            <div className={`py-4 px-5 text-center border-b-2 border-dashed ${isExpired ? 'bg-gradient-to-r from-red-700 to-red-600' : 'bg-gradient-to-r from-green-700 to-green-600'}`}>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Buildings size={20} className="text-white/80" />
                                    <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">Institution Mangement System</span>
                                </div>
                                <h1 className="text-white font-bold text-lg uppercase tracking-wide">HOSTEL DIGITAL OUTPASS</h1>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold mt-1 ${isExpired ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                                    {isExpired ? <XCircle size={12} /> : <CheckCircle size={12} />}
                                    {isExpired ? 'EXPIRED' : 'APPROVED'}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-5 py-4 text-gray-800 space-y-3" style={{ fontFamily: 'Georgia, serif' }}>
                                {/* Student Info */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Student Name</label>
                                        <p className="font-semibold">{profile?.first_name} {profile?.last_name}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Register No</label>
                                        <p className="font-semibold font-mono">{profile?.student_id || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Hostel Name</label>
                                        <p className="font-semibold">{hostel?.hostel_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Room Number</label>
                                        <p className="font-semibold font-mono">{hostel?.room_number || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-gray-300 my-3"></div>

                                {/* Outpass Details */}
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Reason</label>
                                        <p className="font-semibold">{outpass.reason}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Destination</label>
                                        <p className="font-semibold flex items-center gap-1">
                                            <MapPin size={14} className="text-gray-500" />
                                            {outpass.destination}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-gray-300 my-3"></div>

                                {/* Time Details */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Out Time</label>
                                        <p className="font-semibold text-xs">{formatFullDateTime(outpass.start_datetime)}</p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">In Time</label>
                                        <p className="font-semibold text-xs">{formatFullDateTime(outpass.end_datetime)}</p>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div className="text-sm">
                                    <label className="text-gray-500 text-xs uppercase">Emergency Contact</label>
                                    <p className="font-semibold flex items-center gap-1 font-mono">
                                        <Phone size={14} className="text-gray-500" />
                                        {outpass.emergency_contact}
                                    </p>
                                </div>

                                <div className="border-t border-dashed border-gray-300 my-3"></div>

                                {/* Approval Details */}
                                <div className="grid grid-cols-2 gap-x-4 text-sm">
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Approved By</label>
                                        <p className="font-semibold flex items-center gap-1">
                                            <Shield size={14} className="text-gray-500" />
                                            {hostel?.warden_name || 'Warden'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-gray-500 text-xs uppercase">Approval Time</label>
                                        <p className="font-semibold text-xs">
                                            {outpass.reviewed_at ? formatFullDateTime(outpass.reviewed_at) : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-gray-300 my-3"></div>

                                {/* Outpass ID */}
                                <div className="text-center">
                                    <label className="text-gray-500 text-xs uppercase">Outpass ID</label>
                                    <p className="font-bold font-mono text-lg tracking-wider">{generateOutpassId(outpass.id, outpass.created_at)}</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className={`py-3 px-5 text-center border-t-2 border-dashed ${isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                <div className="flex items-center justify-center gap-2 text-sm font-bold">
                                    {isExpired ? <><XCircle size={18} weight="fill" />OUTPASS EXPIRED</> : <><CheckCircle size={18} weight="fill" />STATUS: APPROVED</>}
                                </div>
                                <p className="text-xs mt-1 opacity-70">This is an offline view. Show this to the guard.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
