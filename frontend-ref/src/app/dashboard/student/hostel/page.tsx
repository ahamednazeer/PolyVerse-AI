'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useOffline } from '@/components/OfflineContext';
import { OfflineActionBlocked, OfflineIndicator } from '@/components/OfflineBanner';
import { OfflineOutpassView } from '@/components/offline';
import {
    Buildings,
    DoorOpen,
    Clock,
    CheckCircle,
    XCircle,
    Warning,
    Plus,
    ArrowRight,
    Phone,
    MapPin,
    CalendarBlank,
    User,
    CaretDown,
    CaretUp,
    Certificate,
    DownloadSimple,
    FileText,
    Pulse,
    Sparkle,
    WifiSlash
} from '@phosphor-icons/react';

interface HostelInfo {
    is_assigned: boolean;
    hostel_name: string | null;
    hostel_address: string | null;
    room_number: string | null;
    floor: number | null;
    warden_name: string | null;
    assigned_at: string | null;
}

interface OutpassSummary {
    total_requests: number;
    approved_count: number;
    rejected_count: number;
    pending_count: number;
    current_month_count: number;
    monthly_limit: number;
}

interface Outpass {
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
}

interface OutpassListResponse {
    outpasses: Outpass[];
    total: number;
    page: number;
    page_size: number;
}

interface CertificateRequest {
    id: number;
    certificate_type: string;
    purpose: string;
    purpose_details: string | null;
    status: string;
    rejection_reason: string | null;
    certificate_number: string | null;
    download_count: number;
    created_at: string;
    reviewed_at: string | null;
}

const CERTIFICATE_TYPES = [
    { value: 'HOSTEL_BONAFIDE', label: 'Hostel Bonafide Certificate' },
    { value: 'STAY_CERTIFICATE', label: 'Stay Certificate' },
    { value: 'CHARACTER_CERTIFICATE', label: 'Character Certificate' },
];

const CERTIFICATE_PURPOSES = [
    { value: 'BANK', label: 'Bank Account Opening' },
    { value: 'SCHOLARSHIP', label: 'Scholarship Application' },
    { value: 'TRAVEL', label: 'Travel/Transport' },
    { value: 'PASSPORT', label: 'Passport Application' },
    { value: 'VISA', label: 'Visa Application' },
    { value: 'EMPLOYMENT', label: 'Employment Verification' },
    { value: 'HIGHER_STUDIES', label: 'Higher Studies' },
    { value: 'OTHER', label: 'Other' },
];

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    SUBMITTED: { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-700/30' },
    UNDER_REVIEW: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-700/30' },
    APPROVED: { bg: 'bg-green-900/40', text: 'text-green-400', border: 'border-green-700/30' },
    REJECTED: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-700/30' },
    EXPIRED: { bg: 'bg-slate-900/40', text: 'text-slate-400', border: 'border-slate-700/30' },
    CLOSED: { bg: 'bg-slate-900/40', text: 'text-slate-500', border: 'border-slate-700/30' },
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

export default function StudentHostelPage() {
    const { isOfflineMode, offlineData } = useOffline();
    const [hostelInfo, setHostelInfo] = useState<HostelInfo | null>(null);
    const [summary, setSummary] = useState<OutpassSummary | null>(null);
    const [outpasses, setOutpasses] = useState<Outpass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        reason: '',
        destination: '',
        start_datetime: '',
        end_datetime: '',
        emergency_contact: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Expanded outpass
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Certificate state
    const [certificates, setCertificates] = useState<CertificateRequest[]>([]);
    const [showCertForm, setShowCertForm] = useState(false);
    const [certFormData, setCertFormData] = useState({
        certificate_type: 'HOSTEL_BONAFIDE',
        purpose: 'BANK',
        purpose_details: ''
    });
    const [certSubmitting, setCertSubmitting] = useState(false);
    const [certFormError, setCertFormError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'outpass' | 'certificate'>('outpass');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const [hostelData, summaryData, outpassData, certData] = await Promise.all([
                api.getMyHostelInfo(),
                api.getOutpassSummary().catch(() => null),
                api.getMyOutpasses().catch(() => ({ outpasses: [], total: 0 })),
                api.getMyCertificates().catch(() => ({ certificates: [], total: 0 }))
            ]);
            setHostelInfo(hostelData);
            setSummary(summaryData);
            setOutpasses(outpassData.outpasses || []);
            setCertificates(certData.certificates || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load hostel information');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);

        try {
            await api.createOutpass(formData);
            setShowForm(false);
            setFormData({
                reason: '',
                destination: '',
                start_datetime: '',
                end_datetime: '',
                emergency_contact: ''
            });
            await fetchData();
        } catch (err: any) {
            setFormError(err.message || 'Failed to submit outpass request');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCertSubmit(e: React.FormEvent) {
        e.preventDefault();
        setCertSubmitting(true);
        setCertFormError(null);

        try {
            await api.requestCertificate(certFormData);
            setShowCertForm(false);
            setCertFormData({
                certificate_type: 'HOSTEL_BONAFIDE',
                purpose: 'BANK',
                purpose_details: ''
            });
            await fetchData();
        } catch (err: any) {
            setCertFormError(err.message || 'Failed to submit certificate request');
        } finally {
            setCertSubmitting(false);
        }
    }

    async function handleDownloadCert(certId: number) {
        try {
            const data = await api.downloadCertificate(certId);
            // For now, alert the certificate details (PDF generation can be added later)
            alert(`Certificate ${data.certificate.certificate_number} downloaded!\n\nStudent: ${data.student.name}\nHostel: ${data.hostel.name}\nRoom: ${data.hostel.room_number}`);
            await fetchData(); // Refresh to update download count
        } catch (err: any) {
            alert(err.message || 'Failed to download certificate');
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
                    Loading Hostel Services...
                </p>
            </div>
        );
    }

    if (error || !hostelInfo?.is_assigned) {
        return (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center relative overflow-hidden">
                <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                <Buildings size={56} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wider">Hostel Not Assigned</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                    {error || "You are not assigned to any hostel. Contact administration."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <Buildings size={28} weight="duotone" className="text-indigo-400" />
                    Hostel Services
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Outpass & Room Management</p>
            </div>

            {/* Hostel Info Card */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-950/60 border border-indigo-700/30 rounded-xl p-6 relative overflow-hidden">
                <Sparkle size={100} weight="duotone" className="absolute -right-4 -top-4 text-indigo-800/30" />
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-indigo-300 mb-4 flex items-center gap-2">
                            <DoorOpen size={20} weight="duotone" />
                            Your Assignment
                        </h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-900/30 border border-indigo-700/20 rounded-lg p-3">
                                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-1">Hostel</p>
                                <p className="text-slate-100 font-semibold">{hostelInfo.hostel_name}</p>
                            </div>
                            <div className="bg-slate-900/30 border border-indigo-700/20 rounded-lg p-3">
                                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-1">Room</p>
                                <p className="text-slate-100 font-semibold">{hostelInfo.room_number}</p>
                            </div>
                            <div className="bg-slate-900/30 border border-indigo-700/20 rounded-lg p-3">
                                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-1">Floor</p>
                                <p className="text-slate-100 font-semibold">{hostelInfo.floor ?? 'Ground'}</p>
                            </div>
                            <div className="bg-slate-900/30 border border-indigo-700/20 rounded-lg p-3">
                                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-1">Warden</p>
                                <p className="text-slate-100 font-semibold">{hostelInfo.warden_name || 'Not Assigned'}</p>
                            </div>
                        </div>
                    </div>
                    <Buildings size={64} weight="duotone" className="text-indigo-400/30 hidden sm:block" />
                </div>
            </div>

            {/* Stats Overview */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-700/30 rounded-xl p-5 hover:border-blue-500/50 transition-all group">
                        <div className="flex items-center gap-2 text-blue-400 mb-3">
                            <DoorOpen size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-mono uppercase tracking-widest">This Month</span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-mono font-black text-slate-100">
                            {summary.current_month_count}<span className="text-lg text-slate-500">/{summary.monthly_limit}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-2 font-mono uppercase">Outpasses used</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border border-yellow-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-400 mb-2">
                            <Clock size={18} />
                            <span className="text-xs font-mono uppercase">Pending</span>
                        </div>
                        <p className="text-2xl font-mono font-bold text-slate-100">
                            {summary.pending_count}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">awaiting approval</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-900/40 to-green-950/60 border border-green-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                            <CheckCircle size={18} />
                            <span className="text-xs font-mono uppercase">Approved</span>
                        </div>
                        <p className="text-2xl font-mono font-bold text-slate-100">
                            {summary.approved_count}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">total approved</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-900/40 to-red-950/60 border border-red-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                            <XCircle size={18} />
                            <span className="text-xs font-mono uppercase">Rejected</span>
                        </div>
                        <p className="text-2xl font-mono font-bold text-slate-100">
                            {summary.rejected_count}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">total rejected</p>
                    </div>
                </div>
            )}

            {/* Apply Outpass Button - disabled when offline */}
            {!showForm && !isOfflineMode && (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                    <Plus size={20} weight="bold" />
                    Apply for Outpass
                </button>
            )}

            {/* Offline warning for outpass application */}
            {!showForm && isOfflineMode && (
                <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-amber-400 text-sm flex items-center gap-3">
                    <WifiSlash size={20} />
                    <span>Outpass applications require an internet connection</span>
                </div>
            )}

            {/* Outpass Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-5 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-slate-200">New Outpass Request</h3>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="text-slate-500 hover:text-slate-300"
                        >
                            <XCircle size={24} />
                        </button>
                    </div>

                    {formError && (
                        <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                            <Warning size={18} />
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Reason *</label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                rows={3}
                                required
                                minLength={10}
                                placeholder="Enter the reason for your outpass (minimum 10 characters)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Destination *</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.destination}
                                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                    placeholder="Where are you going?"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Emergency Contact *</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="tel"
                                    value={formData.emergency_contact}
                                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                    minLength={10}
                                    placeholder="10-digit phone number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Start Date & Time *</label>
                            <div className="relative">
                                <CalendarBlank size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="datetime-local"
                                    value={formData.start_datetime}
                                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">End Date & Time *</label>
                            <div className="relative">
                                <CalendarBlank size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="datetime-local"
                                    value={formData.end_datetime}
                                    onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                    min={formData.start_datetime || undefined}
                                />
                            </div>
                            {formData.start_datetime && !formData.end_datetime && (
                                <p className="text-xs text-slate-500 mt-1">Must be after start date</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    Submit Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-700/60 mb-4">
                <button
                    onClick={() => setActiveTab('outpass')}
                    className={`px-4 py-2 font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'outpass'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <DoorOpen size={18} />
                    Outpass
                </button>
                <button
                    onClick={() => setActiveTab('certificate')}
                    className={`px-4 py-2 font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'certificate'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Certificate size={18} />
                    Certificates
                </button>
            </div>

            {/* Outpass History - Tab */}
            {activeTab === 'outpass' && (
                <div>
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-4">Your Outpass History</h2>

                    {outpasses.length === 0 ? (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-8 text-center">
                            <DoorOpen size={48} className="text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Outpass Requests</h3>
                            <p className="text-slate-500">You haven't submitted any outpass requests yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {outpasses.map((outpass) => {
                                const status = statusColors[outpass.status] || statusColors.SUBMITTED;
                                const isExpanded = expandedId === outpass.id;

                                return (
                                    <div
                                        key={outpass.id}
                                        className={`bg-slate-800/40 border border-slate-700/60 rounded-lg overflow-hidden`}
                                    >
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : outpass.id)}
                                            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/60 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
                                                    <DoorOpen size={20} className={status.text} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium text-slate-200">{outpass.destination}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {formatDateTime(outpass.start_datetime)} - {formatDateTime(outpass.end_datetime)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-mono px-2 py-1 rounded ${status.bg} ${status.text} ${status.border}`}>
                                                    {outpass.status}
                                                </span>
                                                {isExpanded ? <CaretUp size={18} className="text-slate-400" /> : <CaretDown size={18} className="text-slate-400" />}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-slate-700/30">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-sm">
                                                    <div>
                                                        <p className="text-slate-500 mb-1">Reason</p>
                                                        <p className="text-slate-300">{outpass.reason}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 mb-1">Emergency Contact</p>
                                                        <p className="text-slate-300 flex items-center gap-1">
                                                            <Phone size={14} />
                                                            {outpass.emergency_contact}
                                                        </p>
                                                    </div>
                                                    {outpass.rejection_reason && (
                                                        <div className="col-span-2">
                                                            <p className="text-red-400">Rejection Reason</p>
                                                            <p className="text-red-300">{outpass.rejection_reason}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {outpass.status === 'APPROVED' && (() => {
                                                    const now = new Date();
                                                    const start = new Date(outpass.start_datetime);
                                                    const end = new Date(outpass.end_datetime);
                                                    const isActive = now >= start && now <= end;
                                                    const isUpcoming = now < start;
                                                    const isExpiredTime = now > end;

                                                    if (isActive) {
                                                        return (
                                                            <button
                                                                onClick={() => window.location.href = `/dashboard/student/hostel/outpass/${outpass.id}`}
                                                                className="mt-2 w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
                                                            >
                                                                <DoorOpen size={20} weight="bold" />
                                                                View Digital Outpass
                                                            </button>
                                                        );
                                                    } else if (isUpcoming) {
                                                        return (
                                                            <div className="mt-2 w-full bg-slate-700/50 text-slate-400 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                                                                <Clock size={20} />
                                                                <span>Unlocks at {formatDateTime(outpass.start_datetime)}</span>
                                                            </div>
                                                        );
                                                    } else if (isExpiredTime) {
                                                        return (
                                                            <div className="mt-2 w-full bg-slate-700/50 text-slate-500 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                                                                <XCircle size={20} />
                                                                <span>Outpass Expired</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Certificate Section - Tab */}
            {activeTab === 'certificate' && (
                <div className="space-y-4">
                    {/* Request Certificate Button */}
                    {!showCertForm && (
                        <button
                            onClick={() => setShowCertForm(true)}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                            <Plus size={20} weight="bold" />
                            Request Bonafide Certificate
                        </button>
                    )}

                    {/* Certificate Request Form */}
                    {showCertForm && (
                        <form onSubmit={handleCertSubmit} className="bg-slate-800/60 border border-purple-700/30 rounded-lg p-5 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                                    <Certificate size={20} className="text-purple-400" />
                                    Request Certificate
                                </h3>
                                <button type="button" onClick={() => setShowCertForm(false)} className="text-slate-500 hover:text-slate-300">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {certFormError && (
                                <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                                    <Warning size={18} />
                                    {certFormError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Certificate Type *</label>
                                    <select
                                        value={certFormData.certificate_type}
                                        onChange={(e) => setCertFormData({ ...certFormData, certificate_type: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                                        required
                                    >
                                        {CERTIFICATE_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Purpose *</label>
                                    <select
                                        value={certFormData.purpose}
                                        onChange={(e) => setCertFormData({ ...certFormData, purpose: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                                        required
                                    >
                                        {CERTIFICATE_PURPOSES.map((purpose) => (
                                            <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {certFormData.purpose === 'OTHER' && (
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Purpose Details *</label>
                                        <textarea
                                            value={certFormData.purpose_details}
                                            onChange={(e) => setCertFormData({ ...certFormData, purpose_details: e.target.value })}
                                            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                                            rows={2}
                                            required
                                            placeholder="Please specify the purpose"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCertForm(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={certSubmitting}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {certSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : <><CheckCircle size={18} /> Submit Request</>}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Certificate History */}
                    <div>
                        <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-4">Your Certificate Requests</h2>

                        {certificates.length === 0 ? (
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-8 text-center">
                                <Certificate size={48} className="text-slate-600 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-300 mb-2">No Certificate Requests</h3>
                                <p className="text-slate-500">You haven't requested any certificates yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {certificates.map((cert) => {
                                    const status = statusColors[cert.status] || statusColors.SUBMITTED;
                                    const typeLabel = CERTIFICATE_TYPES.find(t => t.value === cert.certificate_type)?.label || cert.certificate_type;
                                    const purposeLabel = CERTIFICATE_PURPOSES.find(p => p.value === cert.purpose)?.label || cert.purpose;

                                    return (
                                        <div key={cert.id} className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
                                                        <Certificate size={24} className={status.text} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <p className="font-semibold text-slate-200">{typeLabel}</p>
                                                            <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>{cert.status}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-400">Purpose: {purposeLabel}</p>
                                                        <p className="text-xs text-slate-500 mt-1">Requested: {formatDateTime(cert.created_at)}</p>
                                                        {cert.certificate_number && (
                                                            <p className="text-xs text-purple-400 mt-1 font-mono">Cert #: {cert.certificate_number}</p>
                                                        )}
                                                        {cert.rejection_reason && (
                                                            <p className="text-xs text-red-400 mt-1">Reason: {cert.rejection_reason}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {(cert.status === 'APPROVED' || cert.status === 'DOWNLOADED') && (
                                                    <Link
                                                        href={`/dashboard/student/certificates/${cert.id}`}
                                                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                                                    >
                                                        <Certificate size={16} />
                                                        View Certificate
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
