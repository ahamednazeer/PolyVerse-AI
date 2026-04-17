'use client';

import React from 'react';
import { useOffline } from '@/components/OfflineContext';
import { OfflineIndicator } from '@/components/OfflineBanner';
import {
    Buildings,
    CheckCircle,
    XCircle,
    MapPin,
    Phone,
    Shield,
    Clock,
    CloudSlash
} from '@phosphor-icons/react';

// Format date using client's local timezone
const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
};

// Format time using client's local timezone
const formatDisplayTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).toUpperCase();
};

// Format full date and time
const formatFullDateTime = (dateStr: string) => {
    return `${formatDisplayDate(dateStr)} | ${formatDisplayTime(dateStr)}`;
};

// Generate unique outpass ID
const generateOutpassId = (id: number, createdAt: string) => {
    const year = new Date(createdAt).getFullYear();
    return `OP-${year}-${String(id).padStart(6, '0')}`;
};

// Check if outpass is currently valid
const isOutpassValid = (startDatetime: string, endDatetime: string) => {
    const now = new Date();
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    return now >= start && now <= end;
};

export function OfflineOutpassView() {
    const { offlineData, lastSyncTimes } = useOffline();
    const outpass = offlineData.approvedOutpass;
    const hostelInfo = offlineData.hostelInfo;
    const profile = offlineData.studentProfile;

    if (!outpass) {
        return (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center">
                <CloudSlash size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No Cached Outpass</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                    No approved outpass was cached. Connect to the internet and view your outpass to cache it for offline use.
                </p>
            </div>
        );
    }

    const isApproved = outpass.status === 'APPROVED';
    const isValid = isApproved && isOutpassValid(outpass.start_datetime, outpass.end_datetime);
    const isExpired = isApproved && new Date() > new Date(outpass.end_datetime);

    const studentName = profile ? `${profile.first_name} ${profile.last_name || ''}` : 'Student';
    const registerNumber = profile?.student_id || 'N/A';
    const hostelName = hostelInfo?.hostel_name || 'N/A';
    const roomNumber = hostelInfo?.room_number || 'N/A';
    const wardenName = hostelInfo?.warden_name || 'Hostel Warden';
    const outpassIdFormatted = generateOutpassId(outpass.id, outpass.created_at);

    return (
        <div className="space-y-4">
            {/* Offline Indicator */}
            <div className="flex justify-center">
                <OfflineIndicator dataKey="APPROVED_OUTPASS" />
            </div>

            {/* Paper-Like Outpass Card */}
            <div className="max-w-md mx-auto">
                <div
                    className={`relative bg-gradient-to-b from-white to-gray-100 rounded-lg shadow-2xl overflow-hidden ${isExpired ? 'opacity-75' : ''}`}
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        transform: 'perspective(1000px) rotateX(2deg)'
                    }}
                >
                    {/* Watermark Overlay */}
                    {isExpired && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <div
                                className="text-red-500/30 text-6xl font-bold font-mono rotate-[-25deg]"
                                style={{ textShadow: '2px 2px 0 rgba(255,0,0,0.1)' }}
                            >
                                EXPIRED
                            </div>
                        </div>
                    )}
                    {isValid && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div
                                className="text-green-500/15 text-7xl font-bold font-mono rotate-[-25deg]"
                                style={{ textShadow: '2px 2px 0 rgba(0,255,0,0.05)' }}
                            >
                                VALID
                            </div>
                        </div>
                    )}

                    {/* Offline Mode Indicator */}
                    <div className="absolute top-2 right-2 z-30 bg-amber-500 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <CloudSlash size={12} />
                        OFFLINE VIEW
                    </div>

                    {/* Header */}
                    <div className={`py-4 px-5 text-center border-b-2 border-dashed ${isExpired
                        ? 'bg-gradient-to-r from-red-700 to-red-600'
                        : 'bg-gradient-to-r from-green-700 to-green-600'
                        }`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Buildings size={20} className="text-white/80" />
                            <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">
                                Institution Mangement System
                            </span>
                        </div>
                        <h1 className="text-white font-bold text-lg uppercase tracking-wide">
                            HOSTEL DIGITAL OUTPASS
                        </h1>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold mt-1 ${isExpired
                            ? 'bg-red-900/50 text-red-200'
                            : 'bg-green-900/50 text-green-200'
                            }`}>
                            {isExpired ? <XCircle size={12} /> : <CheckCircle size={12} />}
                            {isExpired ? 'EXPIRED' : 'APPROVED'}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-5 py-4 text-gray-800 space-y-3" style={{ fontFamily: 'Georgia, serif' }}>
                        {/* Student Info Section */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div>
                                <label className="text-gray-500 text-xs uppercase">Student Name</label>
                                <p className="font-semibold">{studentName}</p>
                            </div>
                            <div>
                                <label className="text-gray-500 text-xs uppercase">Register No</label>
                                <p className="font-semibold font-mono">{registerNumber}</p>
                            </div>
                            <div>
                                <label className="text-gray-500 text-xs uppercase">Hostel Name</label>
                                <p className="font-semibold">{hostelName}</p>
                            </div>
                            <div>
                                <label className="text-gray-500 text-xs uppercase">Room Number</label>
                                <p className="font-semibold font-mono">{roomNumber}</p>
                            </div>
                        </div>

                        {/* Divider */}
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

                        {/* Divider */}
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

                        {/* Divider */}
                        <div className="border-t border-dashed border-gray-300 my-3"></div>

                        {/* Approval Details */}
                        <div className="grid grid-cols-2 gap-x-4 text-sm">
                            <div>
                                <label className="text-gray-500 text-xs uppercase">Approved By</label>
                                <p className="font-semibold flex items-center gap-1">
                                    <Shield size={14} className="text-gray-500" />
                                    {wardenName}
                                </p>
                            </div>
                            <div>
                                <label className="text-gray-500 text-xs uppercase">Approval Time</label>
                                <p className="font-semibold text-xs">
                                    {outpass.reviewed_at ? formatFullDateTime(outpass.reviewed_at) : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-dashed border-gray-300 my-3"></div>

                        {/* Outpass ID */}
                        <div className="text-center">
                            <label className="text-gray-500 text-xs uppercase">Outpass ID</label>
                            <p className="font-bold font-mono text-lg tracking-wider">{outpassIdFormatted}</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`py-3 px-5 text-center border-t-2 border-dashed ${isExpired
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                        }`}>
                        <div className="flex items-center justify-center gap-2 text-sm font-bold">
                            {isExpired ? (
                                <>
                                    <XCircle size={18} weight="fill" />
                                    OUTPASS EXPIRED
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} weight="fill" />
                                    STATUS: APPROVED
                                </>
                            )}
                        </div>
                        <p className="text-xs mt-1 opacity-70">
                            This is an offline view. Show this to the guard.
                        </p>
                    </div>
                </div>

                {/* Cache Notice */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-amber-500 flex items-center justify-center gap-1.5">
                        <Clock size={12} />
                        Cached data - may not reflect latest changes
                    </p>
                </div>
            </div>
        </div>
    );
}

export default OfflineOutpassView;
