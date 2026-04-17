'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
    Certificate,
    Clock,
    CheckCircle,
    XCircle,
    Spinner,
    User,
    Plus,
    ArrowLeft,
    IdentificationCard,
    GraduationCap
} from '@phosphor-icons/react';

interface CertificateRequest {
    id: number;
    certificate_type: string;
    purpose: string;
    purpose_details: string | null;
    status: string;
    rejection_reason: string | null;
    certificate_number: string | null;
    created_at: string;
    reviewed_at: string | null;
}

interface UserInfo {
    first_name: string;
    last_name: string;
    email: string;
    register_number: string;
    department: string;
    student_category: string;
}

const CERTIFICATE_PURPOSES = [
    { value: 'BANK', label: 'Bank Account' },
    { value: 'SCHOLARSHIP', label: 'Scholarship' },
    { value: 'TRAVEL', label: 'Travel' },
    { value: 'PASSPORT', label: 'Passport' },
    { value: 'VISA', label: 'Visa' },
    { value: 'EMPLOYMENT', label: 'Employment' },
    { value: 'HIGHER_STUDIES', label: 'Higher Studies' },
    { value: 'OTHER', label: 'Other' },
];

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    SUBMITTED: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-700/30' },
    UNDER_REVIEW: { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-700/30' },
    APPROVED: { bg: 'bg-green-900/40', text: 'text-green-400', border: 'border-green-700/30' },
    DOWNLOADED: { bg: 'bg-green-900/40', text: 'text-green-400', border: 'border-green-700/30' },
    REJECTED: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-700/30' },
};

const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export default function DayScholarCertificatePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [certificates, setCertificates] = useState<CertificateRequest[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ purpose: '', purpose_details: '' });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [userData, certsData] = await Promise.all([
                api.getMe(),
                api.getMyCertificates()
            ]);
            setUser(userData);
            setCertificates(certsData.certificates || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setFormError('');
        try {
            await api.requestCertificate({
                certificate_type: 'GENERAL_BONAFIDE',
                purpose: formData.purpose,
                purpose_details: formData.purpose_details || undefined
            });
            setShowForm(false);
            setFormData({ purpose: '', purpose_details: '' });
            await fetchData();
        } catch (err: any) {
            setFormError(err.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500 animate-pulse font-mono flex items-center gap-2">
                    <Spinner size={20} className="animate-spin" />
                    Loading certificate services...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/student" className="text-slate-500 hover:text-slate-300 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Certificate size={32} className="text-purple-400" />
                        Certificate Services
                    </h1>
                    <p className="text-slate-500 text-sm">Request and manage your bonafide certificates</p>
                </div>
            </div>

            {/* Student Info Card */}
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-950/30 border border-purple-700/30 rounded-lg p-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-900/40 border border-purple-700/30 rounded-lg">
                        <User size={32} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-slate-200">{user?.first_name} {user?.last_name}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-400">
                                <IdentificationCard size={16} />
                                <span>{user?.register_number}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <GraduationCap size={16} />
                                <span>{user?.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-400">
                                    {user?.student_category?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Certificate Button */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-lg flex items-center justify-center gap-3 font-semibold transition-colors"
                >
                    <Plus size={24} weight="bold" />
                    Request New Certificate
                </button>
            )}

            {/* Certificate Request Form */}
            {showForm && (
                <div className="bg-slate-800/60 border border-purple-700/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <Certificate size={20} className="text-purple-400" />
                        Request General Bonafide Certificate
                    </h3>

                    {formError && (
                        <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-3 text-sm mb-4">
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Purpose *</label>
                                <select
                                    required
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                                >
                                    <option value="">Select purpose</option>
                                    {CERTIFICATE_PURPOSES.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.purpose === 'OTHER' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Purpose Details *</label>
                                    <textarea
                                        required
                                        value={formData.purpose_details}
                                        onChange={(e) => setFormData({ ...formData, purpose_details: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500"
                                        rows={3}
                                        placeholder="Please specify the purpose..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 px-4 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                {submitting ? (
                                    <><Spinner size={18} className="animate-spin" /> Submitting...</>
                                ) : (
                                    <><CheckCircle size={18} /> Submit Request</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
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
                                                    <p className="font-semibold text-slate-200">General Bonafide Certificate</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>
                                                        {cert.status}
                                                    </span>
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
                                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
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
    );
}
