'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Certificate,
    Clock,
    CheckCircle,
    XCircle,
    Pulse,
    User,
    Buildings,
    Sparkle
} from '@phosphor-icons/react';

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
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export default function AdminCertificatesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingCertificates, setPendingCertificates] = useState<CertificateRequest[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [rejectModalId, setRejectModalId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getAdminPendingCertificates();
            setPendingCertificates(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load certificates');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(certId: number) {
        setProcessingId(certId);
        try {
            await api.adminApproveCertificate(certId);
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve certificate');
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(certId: number) {
        if (!rejectReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        setProcessingId(certId);
        try {
            await api.adminRejectCertificate(certId, rejectReason);
            setRejectModalId(null);
            setRejectReason('');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to reject certificate');
        } finally {
            setProcessingId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Certificates...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-8 text-center">
                <XCircle size={56} weight="duotone" className="text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-300 mb-2">Error Loading Certificates</h3>
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Certificate size={32} weight="duotone" className="text-purple-400" />
                        Certificate Requests
                    </h1>
                    <p className="text-slate-500 text-sm">Manage general bonafide certificate requests</p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-950/50 border border-purple-700/40 rounded-xl px-4 py-2.5">
                    <span className="text-purple-400 text-sm font-mono font-bold">{pendingCertificates.length} Pending</span>
                </div>
            </div>

            {/* Pending Certificates */}
            {pendingCertificates.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700/60 rounded-xl p-12 text-center relative overflow-hidden">
                    <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                    <CheckCircle size={56} weight="duotone" className="text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-400 mb-2 uppercase tracking-wider">All Caught Up!</h3>
                    <p className="text-slate-500">No pending certificate requests to review.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingCertificates.map((cert) => (
                        <div
                            key={cert.id}
                            className="bg-slate-800/40 border border-purple-700/30 rounded-lg p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-2 rounded-lg bg-purple-900/40 border border-purple-700/30">
                                        <Certificate size={24} className="text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="font-semibold text-slate-200 flex items-center gap-2">
                                                <User size={16} className="text-slate-500" />
                                                {cert.student_name || 'Unknown Student'}
                                            </p>
                                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-400">
                                                {cert.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {cert.student_register_number} • {cert.student_department}
                                        </p>
                                        <div className="mt-2 text-sm">
                                            <p className="text-purple-400 font-medium">
                                                General Bonafide Certificate
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
                                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                            <Clock size={12} />
                                            Requested: {formatDateTime(cert.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                        onClick={() => handleApprove(cert.id)}
                                        disabled={processingId === cert.id}
                                        className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                                    >
                                        {processingId === cert.id ? (
                                            <div className="w-4 h-4 rounded-full border-2 border-green-300/40 border-t-white animate-spin" />
                                        ) : (
                                            <CheckCircle size={16} weight="duotone" />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => setRejectModalId(cert.id)}
                                        disabled={processingId === cert.id}
                                        className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                                    >
                                        <XCircle size={16} weight="duotone" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModalId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
                            <XCircle size={20} weight="duotone" className="text-red-400" />
                            Reject Certificate Request
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Please provide a reason for rejecting this certificate request.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-500 mb-4"
                            rows={3}
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setRejectModalId(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(rejectModalId)}
                                disabled={!rejectReason.trim() || processingId === rejectModalId}
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                {processingId === rejectModalId ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-red-300/40 border-t-white animate-spin" />
                                ) : (
                                    <XCircle size={18} weight="duotone" />
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
