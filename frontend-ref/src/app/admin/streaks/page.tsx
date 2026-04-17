'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Fire, CheckCircle, XCircle, ArrowClockwise, Pulse, Sparkle } from '@phosphor-icons/react';

interface RecoveryRequest {
    id: number;
    user_id: number;
    user_name: string;
    streak_length: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED'; // Use uppercase as per API
    created_at: string;
}

export default function AdminStreaksPage() {
    const [requests, setRequests] = useState<RecoveryRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            // TODO: Uncomment when API method is available
            // const data = await api.getPendingRecoveryRequests();
            const data: any = []; // Placeholder until API is re-enabled
            if (Array.isArray(data)) {
                setRequests(data);
            } else if (data && Array.isArray(data.items)) {
                setRequests(data.items);
            } else if (data && Array.isArray(data.requests)) {
                setRequests(data.requests);
            } else {
                setRequests([]);
            }
        } catch (err) {
            console.error('Failed to load recovery requests', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        try {
            // TODO: Uncomment when API method is available
            // await api.reviewRecoveryRequest(id, status);
            console.log('Review request:', id, status); // Placeholder
            setRequests(requests.filter(r => r.id !== id));
            // Show success toast or something (omitted for now)
        } catch (err) {
            alert('Failed to review request');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-orange-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Streak Requests...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Fire size={28} weight="duotone" className="text-orange-400" />
                    Streak Management
                </h1>
                <p className="text-slate-500 mt-1">Review broken streak recovery requests</p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-700/60 bg-slate-900/30 flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm flex items-center gap-2">
                        <ArrowClockwise size={18} weight="duotone" className="text-yellow-400" />
                        Pending Requests
                    </h3>
                    <span className="text-xs font-mono text-yellow-400 bg-yellow-950/50 border border-yellow-800/50 px-3 py-1.5 rounded-xl font-bold">
                        {requests.length} Pending
                    </span>
                </div>

                <div className="divide-y divide-slate-700/60">
                    {requests.length > 0 ? requests.map((request) => (
                        <div key={request.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-950/40 border border-orange-800/50 rounded-xl text-xs font-mono font-bold text-orange-400">
                                            <Fire weight="duotone" />
                                            Streak: {request.streak_length}
                                        </div>
                                        <span className="text-slate-400 text-sm">
                                            User: <span className="text-slate-200 font-bold">{request.user_name}</span>
                                        </span>
                                        <span className="text-slate-500 text-xs font-mono">
                                            • {new Date(request.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 text-sm italic">
                                        "{request.reason}"
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReview(request.id, 'APPROVED')}
                                        className="bg-gradient-to-br from-green-900/40 to-green-950/60 border border-green-700/40 hover:border-green-600/60 rounded-xl px-4 py-2.5 text-green-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-[1.02]"
                                    >
                                        <CheckCircle size={16} weight="duotone" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleReview(request.id, 'REJECTED')}
                                        className="bg-gradient-to-br from-red-900/40 to-red-950/60 border border-red-700/40 hover:border-red-600/60 rounded-xl px-4 py-2.5 text-red-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-[1.02]"
                                    >
                                        <XCircle size={16} weight="duotone" /> Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-16 text-center relative overflow-hidden">
                            <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                            <CheckCircle size={56} weight="duotone" className="mx-auto mb-4 text-green-500" />
                            <h3 className="text-xl font-bold text-green-400 uppercase tracking-wider mb-2">All Caught Up!</h3>
                            <p className="text-slate-500">No pending recovery requests.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

