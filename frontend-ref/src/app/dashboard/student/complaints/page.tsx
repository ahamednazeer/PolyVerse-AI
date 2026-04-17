'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Wrench,
    CheckCircle,
    Clock,
    Plus,
    X,
    Lightning,
    Drop,
    Broom,
    Chair,
    Desktop,
    DotsThree,
    MapPin,
    Warning,
    XCircle,
    CaretRight,
    ChatCircle,
    ArrowRight,
    Pulse,
    Sparkle
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface Complaint {
    id: number;
    category: string;
    priority: string;
    location: string;
    description: string;
    image_url: string | null;
    status: string;
    assigned_to: string | null;
    resolution_notes: string | null;
    rejection_reason: string | null;
    created_at: string;
    closed_at: string | null;
}

const formatDate = (dateStr: string) => {
    // Database stores UTC - ensure we parse it as UTC by adding Z if missing
    const utcDateStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(utcDateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const CATEGORY_OPTIONS = [
    { value: 'ELECTRICAL', label: 'Electrical', icon: Lightning, color: 'text-yellow-400' },
    { value: 'PLUMBING', label: 'Plumbing', icon: Drop, color: 'text-blue-400' },
    { value: 'CLEANING', label: 'Cleaning', icon: Broom, color: 'text-green-400' },
    { value: 'FURNITURE', label: 'Furniture', icon: Chair, color: 'text-orange-400' },
    { value: 'EQUIPMENT', label: 'Equipment', icon: Desktop, color: 'text-purple-400' },
    { value: 'OTHER', label: 'Other', icon: DotsThree, color: 'text-slate-400' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    SUBMITTED: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', label: 'Submitted' },
    IN_PROGRESS: { bg: 'bg-blue-900/50', text: 'text-blue-300', label: 'In Progress' },
    CLOSED: { bg: 'bg-green-900/50', text: 'text-green-300', label: 'Closed' },
    REJECTED: { bg: 'bg-red-900/50', text: 'text-red-300', label: 'Rejected' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
    LOW: { bg: 'bg-slate-700', text: 'text-slate-300' },
    MEDIUM: { bg: 'bg-blue-900/50', text: 'text-blue-300' },
    HIGH: { bg: 'bg-orange-900/50', text: 'text-orange-300' },
    URGENT: { bg: 'bg-red-900/50', text: 'text-red-300' },
};

export default function StudentComplaintsPage() {
    const router = useRouter();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [redirectModal, setRedirectModal] = useState<{ show: boolean; message: string; to: string } | null>(null);

    // Form state
    const [category, setCategory] = useState<string>('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const data = await api.getMyComplaints();
            setComplaints(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load complaints', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!location.trim() || !description.trim()) {
            alert('Please fill in location and description');
            return;
        }

        setSubmitting(true);
        try {
            await api.createComplaint({
                location: location.trim(),
                description: description.trim(),
                category: category || null
            });
            setShowForm(false);
            setCategory('');
            setLocation('');
            setDescription('');
            fetchComplaints();
        } catch (err: any) {
            const msg = err.message || 'Failed to submit complaint';
            // Check if this is a redirect suggestion from AI
            if (msg.includes('Queries')) {
                setRedirectModal({
                    show: true,
                    message: msg,
                    to: '/dashboard/student/queries'
                });
            } else {
                // Regular error - show simple modal
                setRedirectModal({
                    show: true,
                    message: msg,
                    to: ''
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryIcon = (cat: string) => {
        const found = CATEGORY_OPTIONS.find(c => c.value === cat);
        if (found) {
            const Icon = found.icon;
            return <Icon size={16} className={found.color} />;
        }
        return <DotsThree size={16} className="text-slate-400" />;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-orange-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Complaints...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                        <Wrench size={28} weight="duotone" className="text-orange-400" />
                        Maintenance
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">Report facility issues for repair</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                    {showForm ? <X size={20} weight="bold" /> : <Plus size={20} weight="bold" />}
                    {showForm ? 'Cancel' : 'New Complaint'}
                </button>
            </div>

            {/* New Complaint Form */}
            {showForm && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Wrench size={20} weight="duotone" className="text-orange-400" />
                        Raise New Complaint
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Category Selection */}
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">
                                Category <span className="text-slate-600">(AI will auto-detect if not selected)</span>
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {CATEGORY_OPTIONS.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${category === cat.value
                                                ? 'border-orange-500 bg-orange-900/20'
                                                : 'border-slate-700 hover:border-slate-600'
                                                }`}
                                        >
                                            <Icon size={24} className={cat.color} />
                                            <span className="text-xs">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">
                                Location <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg focus:border-orange-500 focus:outline-none"
                                    placeholder="e.g., Room 205, Block A / Lab 3 / Corridor 2nd Floor"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">
                                Problem Description <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                                placeholder="Describe the issue in detail..."
                                rows={3}
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !location.trim() || !description.trim()}
                                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Wrench size={18} />
                                        Submit Complaint
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-gradient-to-r from-orange-950/30 to-orange-900/20 border border-orange-800/30 rounded-xl p-5 flex items-start gap-4">
                <div className="p-2.5 bg-orange-900/40 rounded-xl flex-shrink-0">
                    <Warning size={22} weight="duotone" className="text-orange-400" />
                </div>
                <div>
                    <p className="text-orange-300 font-semibold mb-1">For maintenance issues only</p>
                    <p className="text-sm text-orange-400/80 leading-relaxed">
                        Report repairs, cleaning, equipment issues. For questions about rules or policies, use the Queries section.
                    </p>
                </div>
            </div>

            {/* Complaints List */}
            <div>
                <h3 className="text-lg font-chivo font-bold mb-5 flex items-center gap-2 uppercase tracking-wider">
                    <Clock size={22} weight="duotone" className="text-slate-400" />
                    My Complaints ({complaints.length})
                </h3>

                {complaints.length > 0 ? (
                    <div className="space-y-4">
                        {complaints.map((complaint) => {
                            const statusStyle = STATUS_STYLES[complaint.status] || STATUS_STYLES.SUBMITTED;
                            const priorityStyle = PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.MEDIUM;

                            return (
                                <div
                                    key={complaint.id}
                                    onClick={() => setSelectedComplaint(complaint)}
                                    className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 cursor-pointer hover:border-orange-500/50 transition-all duration-300 group hover:scale-[1.01]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {getCategoryIcon(complaint.category)}
                                            <span className="text-sm font-medium">{complaint.category}</span>
                                            <span className={`px-2 py-0.5 text-xs rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
                                                {complaint.priority}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${statusStyle.bg} ${statusStyle.text}`}>
                                            {statusStyle.label}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                        <MapPin size={14} />
                                        <span>{complaint.location}</span>
                                    </div>

                                    <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                                        {complaint.description}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>{formatDate(complaint.created_at)}</span>
                                        <CaretRight size={16} className="text-slate-600" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-xl p-16 text-center relative overflow-hidden">
                        <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                        <Wrench size={56} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 font-semibold uppercase tracking-wider">No complaints yet</p>
                        <p className="text-sm text-slate-600 mt-2">Click "New Complaint" to report an issue</p>
                    </div>
                )}
            </div>

            {/* Complaint Detail Modal */}
            {selectedComplaint && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {getCategoryIcon(selectedComplaint.category)}
                                Complaint Details
                            </h3>
                            <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Status */}
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const style = STATUS_STYLES[selectedComplaint.status];
                                    return (
                                        <span className={`px-3 py-1 text-sm font-medium rounded ${style.bg} ${style.text}`}>
                                            {style.label}
                                        </span>
                                    );
                                })()}
                                {(() => {
                                    const style = PRIORITY_STYLES[selectedComplaint.priority];
                                    return (
                                        <span className={`px-2 py-1 text-xs rounded ${style.bg} ${style.text}`}>
                                            {selectedComplaint.priority} Priority
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Location */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">Location</p>
                                <p className="text-slate-200 flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400" />
                                    {selectedComplaint.location}
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">Description</p>
                                <p className="text-slate-200">{selectedComplaint.description}</p>
                            </div>

                            {/* Assigned To */}
                            {selectedComplaint.assigned_to && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Assigned To</p>
                                    <p className="text-slate-200">{selectedComplaint.assigned_to}</p>
                                </div>
                            )}

                            {/* Resolution Notes */}
                            {selectedComplaint.resolution_notes && (
                                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                                    <p className="text-xs text-green-400 uppercase mb-1">Resolution Notes</p>
                                    <p className="text-green-200">{selectedComplaint.resolution_notes}</p>
                                </div>
                            )}

                            {/* Rejection Reason */}
                            {selectedComplaint.rejection_reason && (
                                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                                    <p className="text-xs text-red-400 uppercase mb-1">Rejection Reason</p>
                                    <p className="text-red-200">{selectedComplaint.rejection_reason}</p>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                                <p>Submitted: {formatDate(selectedComplaint.created_at)}</p>
                                {selectedComplaint.closed_at && (
                                    <p>Closed: {formatDate(selectedComplaint.closed_at)}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end px-6 py-4 border-t border-slate-700">
                            <button
                                onClick={() => setSelectedComplaint(null)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Redirect / Error Modal */}
            {redirectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className={`px-6 py-4 ${redirectModal.to ? 'bg-blue-600' : 'bg-red-600'}`}>
                            <div className="flex items-center gap-3">
                                {redirectModal.to ? (
                                    <ChatCircle size={28} weight="fill" className="text-white" />
                                ) : (
                                    <XCircle size={28} weight="fill" className="text-white" />
                                )}
                                <h3 className="text-lg font-bold text-white">
                                    {redirectModal.to ? 'Wrong Section' : 'Error'}
                                </h3>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <p className="text-slate-200 leading-relaxed">{redirectModal.message}</p>

                            {redirectModal.to && (
                                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                                    <p className="text-sm text-blue-300 flex items-center gap-2">
                                        <ChatCircle size={18} />
                                        Queries section is for informational questions
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
                            <button
                                onClick={() => setRedirectModal(null)}
                                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg"
                            >
                                {redirectModal.to ? 'Stay Here' : 'OK'}
                            </button>
                            {redirectModal.to && (
                                <button
                                    onClick={() => router.push(redirectModal.to)}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-2"
                                >
                                    Go to Queries
                                    <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

