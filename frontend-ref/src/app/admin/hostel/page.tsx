'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Buildings,
    DoorOpen,
    Clock,
    CheckCircle,
    XCircle,
    Warning,
    User,
    Phone,
    MapPin,
    CalendarBlank,
    Pulse,
    MagnifyingGlass,
    CaretDown,
    CaretUp,
    Eye,
    Users,
    Timer,
    Hourglass,
    CalendarCheck,
    Certificate,
    DownloadSimple,
    Sparkle
} from '@phosphor-icons/react';

interface HostelDetails {
    id: number;
    name: string;
    address: string | null;
    capacity: number;
    warden_id: number | null;
    is_active: boolean;
    room_count: number;
    occupied_beds: number;
    warden_name: string | null;
}

interface OutpassWithStudent {
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
    student_name: string;
    student_register_number: string | null;
    student_room_number: string | null;
    student_department: string | null;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    SUBMITTED: { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-700/30' },
    UNDER_REVIEW: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-700/30' },
    APPROVED: { bg: 'bg-green-900/40', text: 'text-green-400', border: 'border-green-700/30' },
    REJECTED: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-700/30' },
    EXPIRED: { bg: 'bg-slate-900/40', text: 'text-slate-400', border: 'border-slate-700/30' },
    CLOSED: { bg: 'bg-slate-900/40', text: 'text-slate-500', border: 'border-slate-700/30' },
    DOWNLOADED: { bg: 'bg-indigo-900/40', text: 'text-indigo-400', border: 'border-indigo-700/30' },
};

interface CertificateRequest {
    id: number;
    student_id: number;
    certificate_type: string;
    purpose: string;
    purpose_details: string | null;
    status: string;
    rejection_reason: string | null;
    certificate_number: string | null;
    created_at: string;
    reviewed_at: string | null;
    student_name: string | null;
    student_register_number: string | null;
    student_department: string | null;
    hostel_name: string | null;
}

const CERTIFICATE_TYPES: Record<string, string> = {
    'HOSTEL_BONAFIDE': 'Hostel Bonafide',
    'STAY_CERTIFICATE': 'Stay Certificate',
    'CHARACTER_CERTIFICATE': 'Character Certificate',
};

const CERTIFICATE_PURPOSES: Record<string, string> = {
    'BANK': 'Bank Account',
    'SCHOLARSHIP': 'Scholarship',
    'TRAVEL': 'Travel',
    'PASSPORT': 'Passport',
    'VISA': 'Visa',
    'EMPLOYMENT': 'Employment',
    'HIGHER_STUDIES': 'Higher Studies',
    'OTHER': 'Other',
};

const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

export default function WardenDashboardPage() {
    const [hostel, setHostel] = useState<HostelDetails | null>(null);
    const [pendingOutpasses, setPendingOutpasses] = useState<OutpassWithStudent[]>([]);
    const [activeOutpasses, setActiveOutpasses] = useState<OutpassWithStudent[]>([]);
    const [expiredOutpasses, setExpiredOutpasses] = useState<OutpassWithStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Approval state
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [rejectModalId, setRejectModalId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [upcomingOutpasses, setUpcomingOutpasses] = useState<OutpassWithStudent[]>([]);

    // Tab state
    const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'upcoming' | 'expired' | 'certificates'>('pending');

    // Certificate state
    const [pendingCertificates, setPendingCertificates] = useState<CertificateRequest[]>([]);
    const [certProcessingId, setCertProcessingId] = useState<number | null>(null);
    const [certRejectModalId, setCertRejectModalId] = useState<number | null>(null);
    const [certRejectReason, setCertRejectReason] = useState('');

    // Helper to check if outpass is currently active
    const isOutpassActive = (startDatetime: string, endDatetime: string) => {
        const now = new Date();
        const start = new Date(startDatetime);
        const end = new Date(endDatetime);
        return now >= start && now <= end;
    };

    // Helper to check if outpass hasn't started yet (upcoming)
    const isOutpassUpcoming = (startDatetime: string) => {
        const now = new Date();
        const start = new Date(startDatetime);
        return now < start;
    };

    // Helper to check if outpass is expired
    const isOutpassExpired = (endDatetime: string) => {
        const now = new Date();
        const end = new Date(endDatetime);
        return now > end;
    };

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const [hostelData, pendingData, approvedData, certData] = await Promise.all([
                api.getWardenHostel(),
                api.getPendingOutpasses(),
                api.getApprovedOutpasses ? api.getApprovedOutpasses() : Promise.resolve([]),
                api.getPendingCertificates().catch(() => [])
            ]);
            setHostel(hostelData);
            setPendingOutpasses(pendingData || []);
            setPendingCertificates(certData || []);

            // Separate approved outpasses into active, upcoming, and expired
            const approved = approvedData || [];
            const active: OutpassWithStudent[] = [];
            const upcoming: OutpassWithStudent[] = [];
            const expired: OutpassWithStudent[] = [];

            approved.forEach((outpass: OutpassWithStudent) => {
                if (isOutpassActive(outpass.start_datetime, outpass.end_datetime)) {
                    // Currently ongoing
                    active.push(outpass);
                } else if (isOutpassUpcoming(outpass.start_datetime)) {
                    // Not started yet
                    upcoming.push(outpass);
                } else if (isOutpassExpired(outpass.end_datetime)) {
                    // Already ended
                    expired.push(outpass);
                }
            });

            setActiveOutpasses(active);
            setUpcomingOutpasses(upcoming);
            setExpiredOutpasses(expired);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(outpassId: number) {
        setProcessingId(outpassId);
        try {
            await api.approveOutpass(outpassId);
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve outpass');
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(outpassId: number) {
        if (!rejectReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        setProcessingId(outpassId);
        try {
            await api.rejectOutpass(outpassId, rejectReason);
            setRejectModalId(null);
            setRejectReason('');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to reject outpass');
        } finally {
            setProcessingId(null);
        }
    }

    async function handleApproveCert(certId: number) {
        setCertProcessingId(certId);
        try {
            await api.approveCertificate(certId);
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve certificate');
        } finally {
            setCertProcessingId(null);
        }
    }

    async function handleRejectCert(certId: number) {
        if (!certRejectReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        setCertProcessingId(certId);
        try {
            await api.rejectCertificate(certId, certRejectReason);
            setCertRejectModalId(null);
            setCertRejectReason('');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to reject certificate');
        } finally {
            setCertProcessingId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Warden Dashboard...
                </p>
            </div>
        );
    }

    if (error || !hostel) {
        return (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center relative overflow-hidden">
                <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                <Buildings size={56} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wider">Not Assigned as Warden</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                    {error || "You are not assigned as warden to any hostel."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Buildings size={28} weight="duotone" className="text-indigo-400" />
                        Warden Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        <DoorOpen size={14} weight="duotone" />
                        {hostel.name} • Outpass & Certificate Management
                    </p>
                </div>
            </div>

            {/* Hostel Overview */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-950/60 border border-indigo-700/30 rounded-xl p-6 relative overflow-hidden">
                <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-indigo-500/20" />
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <h2 className="text-sm font-mono text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Buildings size={16} weight="duotone" />
                            Hostel Overview
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                            <div className="bg-indigo-950/40 border border-indigo-800/30 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Name</p>
                                <p className="text-slate-200 font-bold">{hostel.name}</p>
                            </div>
                            <div className="bg-indigo-950/40 border border-indigo-800/30 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Rooms</p>
                                <p className="text-slate-200 font-bold font-mono">{hostel.room_count}</p>
                            </div>
                            <div className="bg-indigo-950/40 border border-indigo-800/30 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Occupancy</p>
                                <p className="text-slate-200 font-bold font-mono">{hostel.occupied_beds} / {hostel.capacity}</p>
                            </div>
                            <div className="bg-yellow-950/40 border border-yellow-800/30 rounded-xl p-3">
                                <p className="text-[10px] text-yellow-400 uppercase tracking-wider mb-1">Pending</p>
                                <p className="text-yellow-400 font-bold font-mono text-lg">{pendingOutpasses.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats - Clickable Tabs */}
            <div className="grid grid-cols-5 gap-3">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border rounded-xl p-4 transition-all text-left hover:scale-[1.02] ${activeTab === 'pending'
                        ? 'border-yellow-500 ring-2 ring-yellow-500/30 shadow-lg shadow-yellow-900/20'
                        : 'border-yellow-700/30 hover:border-yellow-600/50'
                        }`}
                >
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                        <Clock size={18} weight="duotone" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Pending</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-100">
                        {pendingOutpasses.length}
                    </p>
                </button>

                <button
                    onClick={() => setActiveTab('active')}
                    className={`bg-gradient-to-br from-green-900/40 to-green-950/60 border rounded-xl p-4 transition-all text-left hover:scale-[1.02] ${activeTab === 'active'
                        ? 'border-green-500 ring-2 ring-green-500/30 shadow-lg shadow-green-900/20'
                        : 'border-green-700/30 hover:border-green-600/50'
                        }`}
                >
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Timer size={18} weight="duotone" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Active</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-100">
                        {activeOutpasses.length}
                    </p>
                </button>

                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`bg-gradient-to-br from-blue-900/40 to-blue-950/60 border rounded-xl p-4 transition-all text-left hover:scale-[1.02] ${activeTab === 'upcoming'
                        ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-900/20'
                        : 'border-blue-700/30 hover:border-blue-600/50'
                        }`}
                >
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <CalendarCheck size={18} weight="duotone" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Upcoming</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-100">
                        {upcomingOutpasses.length}
                    </p>
                </button>

                <button
                    onClick={() => setActiveTab('expired')}
                    className={`bg-gradient-to-br from-slate-800/40 to-slate-900/60 border rounded-xl p-4 transition-all text-left hover:scale-[1.02] ${activeTab === 'expired'
                        ? 'border-slate-500 ring-2 ring-slate-500/30 shadow-lg shadow-slate-900/20'
                        : 'border-slate-700/30 hover:border-slate-600/50'
                        }`}
                >
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Hourglass size={18} weight="duotone" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Expired</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-100">
                        {expiredOutpasses.length}
                    </p>
                </button>

                <button
                    onClick={() => setActiveTab('certificates')}
                    className={`bg-gradient-to-br from-purple-900/40 to-purple-950/60 border rounded-xl p-4 transition-all text-left hover:scale-[1.02] ${activeTab === 'certificates'
                        ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-900/20'
                        : 'border-purple-700/30 hover:border-purple-600/50'
                        }`}
                >
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <Certificate size={18} weight="duotone" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Certs</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-100">
                        {pendingCertificates.length}
                    </p>
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'pending' && (
                <div>
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Clock size={20} weight="duotone" className="text-yellow-400" />
                        Pending Outpass Requests
                    </h2>

                    {pendingOutpasses.length === 0 ? (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center relative overflow-hidden">
                            <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                            <CheckCircle size={56} weight="duotone" className="text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-green-400 mb-2 uppercase tracking-wider">All Caught Up!</h3>
                            <p className="text-slate-500">No pending outpass requests to review.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingOutpasses.map((outpass) => {
                                const status = statusColors[outpass.status] || statusColors.SUBMITTED;
                                const isExpanded = expandedId === outpass.id;
                                const isProcessing = processingId === outpass.id;

                                return (
                                    <div
                                        key={outpass.id}
                                        className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden hover:border-slate-600/60 transition-all"
                                    >
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
                                                        <User size={24} className={status.text} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-semibold text-slate-200">
                                                                {outpass.student_name}
                                                            </p>
                                                            {outpass.student_register_number && (
                                                                <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                                                                    {outpass.student_register_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-400 flex items-center gap-1">
                                                            <MapPin size={14} />
                                                            {outpass.destination}
                                                        </p>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            {formatDateTime(outpass.start_datetime)} → {formatDateTime(outpass.end_datetime)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : outpass.id)}
                                                        className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                                                        title="View Details"
                                                    >
                                                        {isExpanded ? <CaretUp size={20} /> : <CaretDown size={20} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/40">
                                                <button
                                                    onClick={() => handleApprove(outpass.id)}
                                                    disabled={isProcessing}
                                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    {isProcessing ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <CheckCircle size={18} weight="bold" />
                                                    )}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setRejectModalId(outpass.id)}
                                                    disabled={isProcessing}
                                                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <XCircle size={18} weight="bold" />
                                                    Reject
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-0 border-t border-slate-700/40">
                                                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                                    <div>
                                                        <p className="text-slate-500">Room Number</p>
                                                        <p className="text-slate-300">{outpass.student_room_number || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500">Department</p>
                                                        <p className="text-slate-300">{outpass.student_department || 'N/A'}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-slate-500">Reason</p>
                                                        <p className="text-slate-300">{outpass.reason}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500">Emergency Contact</p>
                                                        <p className="text-slate-300 flex items-center gap-1">
                                                            <Phone size={14} />
                                                            {outpass.emergency_contact}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500">Submitted</p>
                                                        <p className="text-slate-300">{formatDateTime(outpass.created_at)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Active Outpasses Tab */}
            {activeTab === 'active' && (
                <div>
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Timer size={20} className="text-green-400" />
                        Active Outpasses
                    </h2>

                    {activeOutpasses.length === 0 ? (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-8 text-center">
                            <Timer size={48} className="text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Active Outpasses</h3>
                            <p className="text-slate-500">No students are currently out on approved outpass.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeOutpasses.map((outpass) => (
                                <div
                                    key={outpass.id}
                                    className="bg-gradient-to-r from-green-900/20 to-green-950/30 border border-green-700/40 rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="p-2 rounded-lg bg-green-900/40 border border-green-700/30">
                                                <User size={24} className="text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-slate-200">
                                                        {outpass.student_name}
                                                    </p>
                                                    {outpass.student_register_number && (
                                                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                                                            {outpass.student_register_number}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-green-400 bg-green-900/50 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <Timer size={10} /> ACTIVE
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {outpass.destination}
                                                </p>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    Room: {outpass.student_room_number || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Returns by</p>
                                            <p className="text-sm font-medium text-green-400">
                                                {formatDateTime(outpass.end_datetime)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Upcoming Outpasses Tab */}
            {activeTab === 'upcoming' && (
                <div>
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CalendarCheck size={20} className="text-blue-400" />
                        Upcoming Outpasses
                    </h2>

                    {upcomingOutpasses.length === 0 ? (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-8 text-center">
                            <CalendarCheck size={48} className="text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Upcoming Outpasses</h3>
                            <p className="text-slate-500">No approved outpasses scheduled for the future.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingOutpasses.map((outpass) => (
                                <div
                                    key={outpass.id}
                                    className="bg-gradient-to-r from-blue-900/20 to-blue-950/30 border border-blue-700/40 rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="p-2 rounded-lg bg-blue-900/40 border border-blue-700/30">
                                                <User size={24} className="text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-slate-200">
                                                        {outpass.student_name}
                                                    </p>
                                                    {outpass.student_register_number && (
                                                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                                                            {outpass.student_register_number}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <CalendarCheck size={10} /> UPCOMING
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {outpass.destination}
                                                </p>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    Room: {outpass.student_room_number || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Starts at</p>
                                            <p className="text-sm font-medium text-blue-400">
                                                {formatDateTime(outpass.start_datetime)}
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">Until {formatDateTime(outpass.end_datetime)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Expired Outpasses Tab */}
            {activeTab === 'expired' && (
                <div>
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Hourglass size={20} className="text-slate-400" />
                        Expired Outpasses
                    </h2>

                    {expiredOutpasses.length === 0 ? (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-8 text-center">
                            <Hourglass size={48} className="text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Expired Outpasses</h3>
                            <p className="text-slate-500">No expired outpasses in the history.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {expiredOutpasses.map((outpass) => (
                                <div
                                    key={outpass.id}
                                    className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 opacity-75"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/30">
                                                <User size={24} className="text-slate-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-slate-300">
                                                        {outpass.student_name}
                                                    </p>
                                                    {outpass.student_register_number && (
                                                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                                                            {outpass.student_register_number}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                                                        EXPIRED
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {outpass.destination}
                                                </p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {formatDateTime(outpass.start_datetime)} → {formatDateTime(outpass.end_datetime)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-600">Ended</p>
                                            <p className="text-sm text-slate-500">
                                                {formatDateTime(outpass.end_datetime)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
                <div>
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Certificate size={20} className="text-purple-400" />
                        Pending Certificate Requests
                    </h2>

                    {pendingCertificates.length === 0 ? (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-8 text-center">
                            <Certificate size={48} className="text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Pending Certificates</h3>
                            <p className="text-slate-500">All certificate requests have been processed.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingCertificates.map((cert) => {
                                const status = statusColors[cert.status] || statusColors.SUBMITTED;
                                return (
                                    <div
                                        key={cert.id}
                                        className="bg-slate-800/40 border border-purple-700/30 rounded-lg p-4"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
                                                    <Certificate size={24} className={status.text} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <p className="font-semibold text-slate-200">
                                                            {cert.student_name || 'Unknown Student'}
                                                        </p>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>
                                                            {cert.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-400">
                                                        {cert.student_register_number} • {cert.student_department}
                                                    </p>
                                                    <div className="mt-2 text-sm">
                                                        <p className="text-purple-400 font-medium">
                                                            {CERTIFICATE_TYPES[cert.certificate_type] || cert.certificate_type}
                                                        </p>
                                                        <p className="text-slate-500">
                                                            Purpose: {CERTIFICATE_PURPOSES[cert.purpose] || cert.purpose}
                                                        </p>
                                                        {cert.purpose_details && (
                                                            <p className="text-slate-500 text-xs mt-1">
                                                                Details: {cert.purpose_details}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        Requested: {formatDateTime(cert.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => handleApproveCert(cert.id)}
                                                    disabled={certProcessingId === cert.id}
                                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                                >
                                                    {certProcessingId === cert.id ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <CheckCircle size={16} />
                                                    )}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setCertRejectModalId(cert.id)}
                                                    disabled={certProcessingId === cert.id}
                                                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                                >
                                                    <XCircle size={16} />
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Certificate Reject Modal */}
            {certRejectModalId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Reject Certificate Request</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Please provide a reason for rejecting this certificate request.
                        </p>
                        <textarea
                            value={certRejectReason}
                            onChange={(e) => setCertRejectReason(e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-red-500 mb-4"
                            rows={3}
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setCertRejectModalId(null);
                                    setCertRejectReason('');
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRejectCert(certRejectModalId)}
                                disabled={!certRejectReason.trim() || certProcessingId === certRejectModalId}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                {certProcessingId === certRejectModalId ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <XCircle size={18} />
                                )}
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModalId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Reject Outpass Request</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Please provide a reason for rejecting this outpass request. The student will be notified.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-red-500 mb-4"
                            rows={3}
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setRejectModalId(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(rejectModalId)}
                                disabled={!rejectReason.trim() || processingId === rejectModalId}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                {processingId === rejectModalId ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <XCircle size={18} />
                                )}
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
