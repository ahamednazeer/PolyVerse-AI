'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    Buildings,
    Clock,
    CheckCircle,
    XCircle,
    Warning,
    Spinner,
    User,
    MapPin,
    Phone,
    CalendarCheck,
    IdentificationCard,
    Shield
} from '@phosphor-icons/react';

interface OutpassDetails {
    id: number;
    student_id: number;
    reason: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    emergency_contact: string;
    status: string;
    rejection_reason: string | null;
    reviewed_by: number | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
    // Additional fields from enriched data
    student_name?: string;
    register_number?: string;
    hostel_name?: string;
    room_number?: string;
    warden_name?: string;
}

interface HostelInfo {
    is_assigned: boolean;
    hostel_name: string | null;
    room_number: string | null;
    floor: number | null;
    warden_name: string | null;
}

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

// Format full date and time using client's local timezone
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

export default function OutpassViewPage() {
    const params = useParams();
    const router = useRouter();
    const outpassId = params?.id as string;

    const [outpass, setOutpass] = useState<OutpassDetails | null>(null);
    const [hostelInfo, setHostelInfo] = useState<HostelInfo | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second for live clock
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        async function fetchData() {
            if (!outpassId) return;

            setLoading(true);
            setError(null);
            try {
                // Fetch outpass, hostel info, and user info in parallel
                const [outpassData, hostelData, userData] = await Promise.all([
                    api.getOutpass(parseInt(outpassId)),
                    api.getMyHostelInfo(),
                    api.getMe()
                ]);

                setOutpass(outpassData);
                setHostelInfo(hostelData);
                setUserInfo(userData);
            } catch (err: any) {
                setError(err.message || 'Failed to load outpass');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [outpassId]);

    // Prevent right-click context menu (basic screenshot prevention)
    useEffect(() => {
        const preventContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', preventContextMenu);
        return () => document.removeEventListener('contextmenu', preventContextMenu);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-slate-500 animate-pulse font-mono flex items-center gap-2">
                    <Spinner size={24} className="animate-spin" />
                    Loading outpass...
                </div>
            </div>
        );
    }

    if (error || !outpass) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-red-700/50 rounded-lg p-8 text-center max-w-md">
                    <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">Outpass Not Found</h3>
                    <p className="text-slate-500 mb-4">{error || "Unable to load outpass details."}</p>
                    <button
                        onClick={() => router.back()}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const isApproved = outpass.status === 'APPROVED';
    const isValid = isApproved && isOutpassValid(outpass.start_datetime, outpass.end_datetime);
    const isExpired = isApproved && new Date() > new Date(outpass.end_datetime);
    const isPending = outpass.status === 'SUBMITTED' || outpass.status === 'UNDER_REVIEW';
    const isRejected = outpass.status === 'REJECTED';

    // Don't show paper view for non-approved outpasses
    if (!isApproved) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-8 text-center max-w-md">
                    {isRejected ? (
                        <>
                            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-red-400 mb-2">Outpass Rejected</h3>
                            <p className="text-slate-500 mb-2">This outpass was rejected by the warden.</p>
                            {outpass.rejection_reason && (
                                <p className="text-red-300 text-sm bg-red-900/20 p-3 rounded-lg mb-4">
                                    Reason: {outpass.rejection_reason}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Pending Approval</h3>
                            <p className="text-slate-500 mb-4">This outpass is awaiting warden approval.</p>
                        </>
                    )}
                    <button
                        onClick={() => router.back()}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const studentName = userInfo ? `${userInfo.first_name} ${userInfo.last_name || ''}` : 'Student';
    const registerNumber = userInfo?.register_number || 'N/A';
    const hostelName = hostelInfo?.hostel_name || 'N/A';
    const roomNumber = hostelInfo?.room_number || 'N/A';
    const wardenName = hostelInfo?.warden_name || outpass.warden_name || 'Hostel Warden';
    const outpassIdFormatted = generateOutpassId(outpass.id, outpass.created_at);

    return (
        <div className="min-h-screen bg-slate-950 p-4 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="fixed top-4 left-4 z-50 bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
            >
                <ArrowLeft size={24} />
            </button>

            {/* Live Clock */}
            <div className="fixed top-4 right-4 z-50 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-slate-500 font-mono">CURRENT TIME</div>
                <div className="text-lg font-mono text-white">
                    {currentTime.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    }).toUpperCase()}
                </div>
            </div>

            {/* Paper-Like Outpass Card */}
            <div className="max-w-md mx-auto mt-16 mb-8">
                <div
                    className={`relative bg-gradient-to-b from-white to-gray-100 rounded-lg shadow-2xl overflow-hidden ${isExpired ? 'opacity-75' : ''
                        }`}
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

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                            <div className="text-center">
                                <div className="border-b border-gray-400 h-8 mb-1"></div>
                                <label className="text-gray-500 text-xs">Student Sign</label>
                            </div>
                            <div className="text-center">
                                <div className="border-b border-gray-400 h-8 mb-1"></div>
                                <label className="text-gray-500 text-xs">Warden Sign</label>
                            </div>
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
                            This is a digital outpass. Show this to the guard.
                        </p>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-slate-600">
                        🔒 This outpass is non-printable and for digital verification only.
                    </p>
                </div>
            </div>
        </div>
    );
}
