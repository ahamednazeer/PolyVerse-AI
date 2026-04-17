'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Wrench,
    CheckCircle,
    Clock,
    Pulse,
    User,
    MapPin,
    CaretRight,
    X,
    ClockCounterClockwise,
    Eye,
    Lightning,
    Drop,
    Broom,
    Chair,
    Desktop,
    DotsThree,
    XCircle,
    UserCirclePlus,
    Buildings,
    MagicWand,
    Sparkle
} from '@phosphor-icons/react';

interface Complaint {
    id: number;
    student_id: number;
    student_type: string;
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
    student_name: string | null;
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

const CATEGORY_ICONS: Record<string, { icon: any; color: string }> = {
    ELECTRICAL: { icon: Lightning, color: 'text-yellow-400' },
    PLUMBING: { icon: Drop, color: 'text-blue-400' },
    CLEANING: { icon: Broom, color: 'text-green-400' },
    FURNITURE: { icon: Chair, color: 'text-orange-400' },
    EQUIPMENT: { icon: Desktop, color: 'text-purple-400' },
    OTHER: { icon: DotsThree, color: 'text-slate-400' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
    LOW: { bg: 'bg-slate-700', text: 'text-slate-300' },
    MEDIUM: { bg: 'bg-blue-900/50', text: 'text-blue-300' },
    HIGH: { bg: 'bg-orange-900/50', text: 'text-orange-300' },
    URGENT: { bg: 'bg-red-900/50', text: 'text-red-300' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    SUBMITTED: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', label: 'New' },
    IN_PROGRESS: { bg: 'bg-blue-900/50', text: 'text-blue-300', label: 'In Progress' },
    CLOSED: { bg: 'bg-green-900/50', text: 'text-green-300', label: 'Closed' },
    REJECTED: { bg: 'bg-red-900/50', text: 'text-red-300', label: 'Rejected' },
};

export default function WardenComplaintsPage() {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [pendingComplaints, setPendingComplaints] = useState<Complaint[]>([]);
    const [resolvedComplaints, setResolvedComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [viewingComplaint, setViewingComplaint] = useState<Complaint | null>(null);
    const [actionType, setActionType] = useState<'verify' | 'reject' | 'assign' | 'close' | null>(null);
    const [staffName, setStaffName] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [suggestingNotes, setSuggestingNotes] = useState(false);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const [pending, resolved] = await Promise.all([
                api.getWardenPendingComplaints(),
                api.getWardenResolvedComplaints()
            ]);
            setPendingComplaints(Array.isArray(pending) ? pending : []);
            setResolvedComplaints(Array.isArray(resolved) ? resolved : []);
        } catch (err) {
            console.error('Failed to load complaints', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!selectedComplaint) return;
        setSubmitting(true);
        try {
            await api.verifyComplaint(selectedComplaint.id, staffName || undefined);
            closeModal();
            fetchComplaints();
        } catch (err: any) {
            alert(err.message || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedComplaint || !reason.trim()) {
            alert('Please provide rejection reason');
            return;
        }
        setSubmitting(true);
        try {
            await api.rejectComplaint(selectedComplaint.id, reason.trim());
            closeModal();
            fetchComplaints();
        } catch (err: any) {
            alert(err.message || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedComplaint || !staffName.trim()) {
            alert('Please enter staff name');
            return;
        }
        setSubmitting(true);
        try {
            await api.assignComplaintStaff(selectedComplaint.id, staffName.trim());
            closeModal();
            fetchComplaints();
        } catch (err: any) {
            alert(err.message || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = async () => {
        if (!selectedComplaint) return;
        setSubmitting(true);
        try {
            await api.closeComplaint(selectedComplaint.id, notes || undefined);
            closeModal();
            fetchComplaints();
        } catch (err: any) {
            alert(err.message || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    const closeModal = () => {
        setSelectedComplaint(null);
        setActionType(null);
        setStaffName('');
        setReason('');
        setNotes('');
    };

    const getCategoryIcon = (cat: string) => {
        const found = CATEGORY_ICONS[cat];
        if (found) {
            const Icon = found.icon;
            return <Icon size={16} className={found.color} />;
        }
        return <DotsThree size={16} className="text-slate-400" />;
    };

    const complaints = activeTab === 'pending' ? pendingComplaints : resolvedComplaints;

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
        <div className="min-h-screen space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Wrench size={28} weight="duotone" className="text-orange-400" />
                        Hostel Complaints
                    </h1>
                    <p className="text-slate-500 mt-1">Manage maintenance requests from hostellers</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border border-yellow-700/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <Clock size={20} weight="duotone" className="text-yellow-400" />
                        <span className="text-yellow-300 font-bold font-mono">{pendingComplaints.length}</span>
                        <span className="text-yellow-400 text-xs uppercase tracking-wider">Pending</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-3">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] ${activeTab === 'pending'
                        ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/30'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-slate-700/50'
                        }`}
                >
                    <Clock size={18} weight="duotone" />
                    Pending ({pendingComplaints.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] ${activeTab === 'history'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-slate-700/50'
                        }`}
                >
                    <ClockCounterClockwise size={18} weight="duotone" />
                    History ({resolvedComplaints.length})
                </button>
            </div>

            {/* Table */}
            {complaints.length === 0 ? (
                <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-16 text-center relative overflow-hidden">
                    <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                    <CheckCircle size={64} weight="duotone" className="text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-400 mb-2 uppercase tracking-wider">
                        {activeTab === 'pending' ? 'All Caught Up!' : 'No History'}
                    </h3>
                    <p className="text-slate-500">
                        {activeTab === 'pending' ? 'No pending hostel complaints' : 'Resolved complaints will appear here'}
                    </p>
                </div>
            ) : (
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-800/50 border-b border-slate-700 text-[10px] font-mono font-medium text-slate-500 uppercase tracking-widest">
                        <div className="col-span-3">Issue</div>
                        <div className="col-span-2">Category</div>
                        <div className="col-span-2">Location</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Priority</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>
                    <div className="divide-y divide-slate-700/50">
                        {complaints.map((c) => {
                            const priority = PRIORITY_STYLES[c.priority] || PRIORITY_STYLES.MEDIUM;
                            const status = STATUS_STYLES[c.status] || STATUS_STYLES.SUBMITTED;
                            return (
                                <div
                                    key={c.id}
                                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-800/50 transition-colors ${activeTab === 'pending' ? 'cursor-pointer' : ''
                                        }`}
                                    onClick={() => activeTab === 'pending' && setSelectedComplaint(c)}
                                >
                                    <div className="col-span-3">
                                        <p className="text-slate-200 line-clamp-1 font-medium">{c.description}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                            <Buildings size={10} weight="duotone" /> {c.student_name || `#${c.student_id}`}
                                        </p>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        {getCategoryIcon(c.category)}
                                        <span className="text-sm text-slate-300">{c.category}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1 text-sm text-slate-400">
                                        <MapPin size={14} weight="duotone" />
                                        <span className="truncate">{c.location}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${status.bg} ${status.text}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${priority.bg} ${priority.text}`}>
                                            {c.priority}
                                        </span>
                                    </div>
                                    <div className="col-span-1 text-right">
                                        {activeTab === 'pending' ? (
                                            <CaretRight size={20} className="text-slate-400 inline" />
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setViewingComplaint(c); }}
                                                className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-green-400 transition-colors"
                                            >
                                                <Eye size={20} weight="duotone" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action Modal */}
            {selectedComplaint && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h3 className="text-lg font-chivo font-bold uppercase tracking-wider">Manage Complaint</h3>
                            <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Current Status Banner */}
                            {(() => {
                                const status = STATUS_STYLES[selectedComplaint.status] || STATUS_STYLES.SUBMITTED;
                                return (
                                    <div className={`px-4 py-3 rounded-xl ${status.bg} flex items-center justify-between`}>
                                        <span className={`font-bold uppercase tracking-wider text-sm ${status.text}`}>Status: {status.label}</span>
                                        {selectedComplaint.assigned_to && (
                                            <span className="text-sm text-slate-300">Assigned to: {selectedComplaint.assigned_to}</span>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Complaint Info */}
                            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    {getCategoryIcon(selectedComplaint.category)}
                                    <span className="font-bold text-slate-200">{selectedComplaint.category}</span>
                                    <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-lg ${PRIORITY_STYLES[selectedComplaint.priority]?.bg} ${PRIORITY_STYLES[selectedComplaint.priority]?.text}`}>
                                        {selectedComplaint.priority}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 flex items-center gap-1">
                                    <MapPin size={14} weight="duotone" /> {selectedComplaint.location}
                                </p>
                                <p className="text-slate-200">{selectedComplaint.description}</p>
                                <p className="text-xs text-slate-500">From: {selectedComplaint.student_name}</p>
                            </div>

                            {/* Context-Aware Action Buttons */}
                            {!actionType && (
                                <div className="space-y-3">
                                    {/* NEW (SUBMITTED) complaints */}
                                    {selectedComplaint.status === 'SUBMITTED' && (
                                        <>
                                            <p className="text-sm text-slate-400 font-medium">This is a new complaint. You can:</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setActionType('verify')}
                                                    className="flex items-center justify-center gap-2 p-3 bg-green-900/30 border border-green-700/50 rounded-lg hover:bg-green-900/50 text-green-300"
                                                >
                                                    <CheckCircle size={20} /> Accept & Assign
                                                </button>
                                                <button
                                                    onClick={() => setActionType('reject')}
                                                    className="flex items-center justify-center gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg hover:bg-red-900/50 text-red-300"
                                                >
                                                    <XCircle size={20} /> Reject
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* IN_PROGRESS complaints */}
                                    {selectedComplaint.status === 'IN_PROGRESS' && (
                                        <>
                                            <p className="text-sm text-slate-400 font-medium">This complaint is being worked on. You can:</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setActionType('assign')}
                                                    className="flex items-center justify-center gap-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg hover:bg-blue-900/50 text-blue-300"
                                                >
                                                    <UserCirclePlus size={20} /> Reassign Staff
                                                </button>
                                                <button
                                                    onClick={() => setActionType('close')}
                                                    className="flex items-center justify-center gap-2 p-3 bg-green-900/30 border border-green-700/50 rounded-lg hover:bg-green-900/50 text-green-300"
                                                >
                                                    <CheckCircle size={20} /> Mark Resolved
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {actionType === 'verify' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-400">Accept and optionally assign to staff:</p>
                                    <input
                                        type="text"
                                        value={staffName}
                                        onChange={(e) => setStaffName(e.target.value)}
                                        placeholder="Staff name (optional)"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg"
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={() => setActionType(null)} className="flex-1 py-2 bg-slate-700 rounded-lg">Back</button>
                                        <button onClick={handleVerify} disabled={submitting} className="flex-1 py-2 bg-green-600 rounded-lg disabled:opacity-50">
                                            {submitting ? 'Processing...' : 'Accept'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {actionType === 'reject' && (
                                <div className="space-y-3">
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Rejection reason..."
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg resize-none"
                                        rows={3}
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={() => setActionType(null)} className="flex-1 py-2 bg-slate-700 rounded-lg">Back</button>
                                        <button onClick={handleReject} disabled={submitting} className="flex-1 py-2 bg-red-600 rounded-lg disabled:opacity-50">
                                            {submitting ? 'Processing...' : 'Reject'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {actionType === 'assign' && (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={staffName}
                                        onChange={(e) => setStaffName(e.target.value)}
                                        placeholder="Staff name"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg"
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={() => setActionType(null)} className="flex-1 py-2 bg-slate-700 rounded-lg">Back</button>
                                        <button onClick={handleAssign} disabled={submitting} className="flex-1 py-2 bg-blue-600 rounded-lg disabled:opacity-50">
                                            {submitting ? 'Processing...' : 'Assign'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {actionType === 'close' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm text-slate-400">Resolution Notes</label>
                                        <button
                                            onClick={async () => {
                                                if (!selectedComplaint) return;
                                                setSuggestingNotes(true);
                                                try {
                                                    const result = await api.suggestResolutionNotes(selectedComplaint.id);
                                                    setNotes(result.suggested_notes);
                                                } catch (err) {
                                                    console.error('Failed to get AI suggestion', err);
                                                }
                                                setSuggestingNotes(false);
                                            }}
                                            disabled={suggestingNotes}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg hover:bg-purple-900/50 text-purple-300 text-sm disabled:opacity-50"
                                        >
                                            {suggestingNotes ? (
                                                <><div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" /> Generating...</>
                                            ) : (
                                                <><MagicWand size={14} /> AI Suggest</>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Resolution notes (optional)"
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg resize-none"
                                        rows={3}
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={() => setActionType(null)} className="flex-1 py-2 bg-slate-700 rounded-lg">Back</button>
                                        <button onClick={handleClose} disabled={submitting} className="flex-1 py-2 bg-green-600 rounded-lg disabled:opacity-50">
                                            {submitting ? 'Processing...' : 'Mark Resolved'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* View History Modal */}
            {viewingComplaint && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h3 className="text-lg font-bold">Complaint Details</h3>
                            <button onClick={() => setViewingComplaint(null)} className="p-2 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                                <p className="text-slate-200">{viewingComplaint.description}</p>
                                <p className="text-sm text-slate-400 flex items-center gap-1">
                                    <MapPin size={14} /> {viewingComplaint.location}
                                </p>
                            </div>
                            {viewingComplaint.resolution_notes && (
                                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                                    <p className="text-xs text-green-400 uppercase mb-1">Resolution</p>
                                    <p className="text-green-200">{viewingComplaint.resolution_notes}</p>
                                </div>
                            )}
                            {viewingComplaint.rejection_reason && (
                                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                                    <p className="text-xs text-red-400 uppercase mb-1">Rejected</p>
                                    <p className="text-red-200">{viewingComplaint.rejection_reason}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end px-6 py-4 border-t border-slate-700">
                            <button onClick={() => setViewingComplaint(null)} className="px-6 py-2 bg-slate-700 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
