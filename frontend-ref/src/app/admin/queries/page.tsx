'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    ChatCircle,
    CheckCircle,
    Clock,
    Pulse,
    Robot,
    PaperPlaneTilt,
    User,
    Tag,
    Student,
    CaretRight,
    X,
    ClockCounterClockwise,
    Eye,
    Sparkle
} from '@phosphor-icons/react';

interface Query {
    id: number;
    student_id: number;
    student_type: string;
    category: string;
    description: string;
    status: string;
    response: string | null;
    created_at: string;
    responded_at: string | null;
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

const CATEGORY_COLORS: Record<string, string> = {
    RULES: 'bg-blue-900/50 text-blue-300',
    TIMINGS: 'bg-green-900/50 text-green-300',
    POLICY: 'bg-orange-900/50 text-orange-300',
    OTHERS: 'bg-purple-900/50 text-purple-300',
};

export default function AdminQueriesPage() {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [pendingQueries, setPendingQueries] = useState<Query[]>([]);
    const [resolvedQueries, setResolvedQueries] = useState<Query[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
    const [viewingQuery, setViewingQuery] = useState<Query | null>(null);
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchQueries();
    }, []);

    const fetchQueries = async () => {
        try {
            const [pending, resolved] = await Promise.all([
                api.getPendingQueries(),
                api.getAdminResolvedQueries()
            ]);
            setPendingQueries(Array.isArray(pending) ? pending : []);
            setResolvedQueries(Array.isArray(resolved) ? resolved : []);
        } catch (err) {
            console.error('Failed to load queries', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateResponse = async (query: Query) => {
        setGenerating(true);
        try {
            const data = await api.getQuerySuggestion(query.id);
            setResponse(data.suggestion);
        } catch (err: any) {
            setResponse('Thank you for your query. We will review this and respond shortly.');
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmitResponse = async () => {
        if (!selectedQuery || !response.trim()) {
            alert('Please enter a response');
            return;
        }

        setSubmitting(true);
        try {
            await api.respondToQuery(selectedQuery.id, response.trim());
            setSelectedQuery(null);
            setResponse('');
            fetchQueries();
        } catch (err: any) {
            alert(err.message || 'Failed to send response');
        } finally {
            setSubmitting(false);
        }
    };

    const queries = activeTab === 'pending' ? pendingQueries : resolvedQueries;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Queries...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <ChatCircle size={28} weight="duotone" className="text-purple-400" />
                        Query Management
                    </h1>
                    <p className="text-slate-500 mt-1">Respond to queries from day scholar students</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/50 border border-yellow-700/50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <Clock size={20} weight="duotone" className="text-yellow-400" />
                        <span className="text-yellow-300 font-bold font-mono">{pendingQueries.length}</span>
                        <span className="text-yellow-400 text-sm uppercase tracking-wider">Pending</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/40 to-green-950/50 border border-green-700/50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <CheckCircle size={20} weight="duotone" className="text-green-400" />
                        <span className="text-green-300 font-bold font-mono">{resolvedQueries.length}</span>
                        <span className="text-green-400 text-sm uppercase tracking-wider">Resolved</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'pending'
                        ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/40'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:scale-[1.02]'
                        }`}
                >
                    <Clock size={18} weight="duotone" />
                    Pending ({pendingQueries.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'history'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:scale-[1.02]'
                        }`}
                >
                    <ClockCounterClockwise size={18} weight="duotone" />
                    History ({resolvedQueries.length})
                </button>
            </div>

            {queries.length === 0 ? (
                /* Empty State */
                <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-16 text-center">
                    {activeTab === 'pending' ? (
                        <>
                            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" weight="fill" />
                            <h3 className="text-xl font-bold text-green-400 mb-2">All Caught Up!</h3>
                            <p className="text-slate-500">No pending queries from day scholars</p>
                        </>
                    ) : (
                        <>
                            <ClockCounterClockwise size={64} className="text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">No History Yet</h3>
                            <p className="text-slate-500">Resolved queries will appear here</p>
                        </>
                    )}
                </div>
            ) : (
                /* Main Content */
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-800/50 border-b border-slate-700 text-sm font-medium text-slate-400">
                        <div className="col-span-4">Query</div>
                        <div className="col-span-2">Category</div>
                        <div className="col-span-3">Student</div>
                        <div className="col-span-2">{activeTab === 'pending' ? 'Submitted' : 'Resolved'}</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>

                    {/* Query Rows */}
                    <div className="divide-y divide-slate-700/50">
                        {queries.map((query) => (
                            <div
                                key={query.id}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all ${activeTab === 'pending' ? 'cursor-pointer hover:bg-slate-800/50' : ''
                                    } ${selectedQuery?.id === query.id ? 'bg-purple-900/20' : ''}`}
                                onClick={() => {
                                    if (activeTab === 'pending') {
                                        setSelectedQuery(query);
                                        setResponse('');
                                    }
                                }}
                            >
                                <div className="col-span-4">
                                    <p className="text-slate-200 line-clamp-2">{query.description}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${CATEGORY_COLORS[query.category] || 'bg-slate-700 text-slate-300'}`}>
                                        {query.category}
                                    </span>
                                </div>
                                <div className="col-span-3 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                                        {(query.student_name?.[0] || 'S').toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-300">{query.student_name || `Student #${query.student_id}`}</p>
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <Student size={10} /> Day Scholar
                                        </p>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-400">
                                        {formatDate(activeTab === 'pending' ? query.created_at : (query.responded_at || query.created_at))}
                                    </p>
                                </div>
                                <div className="col-span-1 text-right">
                                    {activeTab === 'pending' ? (
                                        <button className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-purple-400 transition-colors">
                                            <CaretRight size={20} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setViewingQuery(query); }}
                                            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-green-400 transition-colors"
                                        >
                                            <Eye size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Response Modal (Pending) */}
            {selectedQuery && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <ChatCircle size={24} className="text-purple-400" weight="duotone" />
                                <h3 className="text-lg font-bold">Respond to Query</h3>
                            </div>
                            <button
                                onClick={() => { setSelectedQuery(null); setResponse(''); }}
                                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Query Info */}
                            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${CATEGORY_COLORS[selectedQuery.category]}`}>
                                        {selectedQuery.category}
                                    </span>
                                    <span className="px-2 py-1 text-xs font-medium rounded bg-green-900/50 text-green-300 flex items-center gap-1">
                                        <Student size={10} /> Day Scholar
                                    </span>
                                    <span className="text-xs text-slate-500">{formatDate(selectedQuery.created_at)}</span>
                                </div>
                                <p className="text-slate-200">{selectedQuery.description}</p>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <User size={14} />
                                    <span>{selectedQuery.student_name || `Student #${selectedQuery.student_id}`}</span>
                                </div>
                            </div>

                            {/* Response Input */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-400">Your Response</label>
                                    <button
                                        onClick={() => handleGenerateResponse(selectedQuery)}
                                        disabled={generating}
                                        className="flex items-center gap-2 text-sm bg-purple-900/50 hover:bg-purple-900/70 text-purple-300 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        {generating ? (
                                            <>
                                                <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-700 border-t-purple-300 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Robot size={14} weight="duotone" />
                                                Generate with AI
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    value={response}
                                    onChange={(e) => setResponse(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                                    placeholder="Type your response here..."
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
                            <button
                                onClick={() => { setSelectedQuery(null); setResponse(''); }}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitResponse}
                                disabled={submitting || !response.trim()}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors font-bold text-sm uppercase tracking-wider"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-green-300/40 border-t-white animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} weight="duotone" />
                                        Send & Resolve
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Response Modal (History) */}
            {viewingQuery && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <CheckCircle size={24} className="text-green-400" weight="fill" />
                                <h3 className="text-lg font-bold">Resolved Query</h3>
                            </div>
                            <button
                                onClick={() => setViewingQuery(null)}
                                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Original Query */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Student Query</p>
                                <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${CATEGORY_COLORS[viewingQuery.category]}`}>
                                            {viewingQuery.category}
                                        </span>
                                        <span className="text-xs text-slate-500">{formatDate(viewingQuery.created_at)}</span>
                                    </div>
                                    <p className="text-slate-200">{viewingQuery.description}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <User size={14} />
                                        <span>{viewingQuery.student_name || `Student #${viewingQuery.student_id}`}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Response */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Response</p>
                                <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
                                    <p className="text-green-200">{viewingQuery.response}</p>
                                    {viewingQuery.responded_at && (
                                        <p className="text-xs text-green-400 mt-3">
                                            Resolved on {formatDate(viewingQuery.responded_at)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-700">
                            <button
                                onClick={() => setViewingQuery(null)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
