'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Question,
    PaperPlaneTilt,
    CheckCircle,
    Clock,
    ChatCircle,
    Info,
    ListBullets,
    Wrench,
    ArrowRight,
    XCircle,
    Pulse,
    Sparkle
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface Query {
    id: number;
    category: string;
    description: string;
    status: string;
    response: string | null;
    created_at: string;
    responded_at: string | null;
}

const CATEGORIES = [
    { value: 'RULES', label: 'Rules', icon: '📋' },
    { value: 'TIMINGS', label: 'Timings', icon: '🕐' },
    { value: 'POLICY', label: 'Policies', icon: '📜' },
    { value: 'OTHERS', label: 'Others', icon: '❓' },
];

const formatDate = (dateStr: string) => {
    const utcDateStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(utcDateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function StudentQueriesPage() {
    const router = useRouter();
    const [queries, setQueries] = useState<Query[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [redirectModal, setRedirectModal] = useState<{ show: boolean; message: string; to: string } | null>(null);

    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        fetchQueries();
    }, []);

    const fetchQueries = async () => {
        try {
            const data = await api.getMyQueries();
            setQueries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load queries', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim() || description.length < 10) {
            alert('Please enter a detailed query (at least 10 characters)');
            return;
        }

        setSubmitting(true);
        try {
            await api.createQuery({
                description: description.trim(),
                category: category || null
            });

            setDescription('');
            setCategory('');
            setShowForm(false);
            fetchQueries();
            setRedirectModal({ show: true, message: 'Query submitted successfully! You will be notified when answered.', to: '' });
        } catch (err: any) {
            const msg = err.message || 'Failed to submit query';
            if (msg.includes('Complaints')) {
                setRedirectModal({
                    show: true,
                    message: msg,
                    to: '/dashboard/student/complaints'
                });
            } else {
                setRedirectModal({ show: true, message: msg, to: '' });
            }
        } finally {
            setSubmitting(false);
        }
    };

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
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                        <ChatCircle size={28} weight="duotone" className="text-purple-400" />
                        Campus Queries
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">Ask questions about rules, timings, and policies</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                    <Question size={20} weight="bold" />
                    {showForm ? 'Cancel' : 'New Query'}
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-950/30 to-blue-900/20 border border-blue-800/30 rounded-xl p-5 flex items-start gap-4">
                <div className="p-2.5 bg-blue-900/40 rounded-xl flex-shrink-0">
                    <Info size={22} weight="duotone" className="text-blue-400" />
                </div>
                <div>
                    <p className="text-blue-300 font-semibold mb-1">What are Queries?</p>
                    <p className="text-sm text-blue-400/80 leading-relaxed">
                        Queries are for informational questions only — not complaints or maintenance requests.
                        For example: hostel rules, mess timings, library policies.
                    </p>
                </div>
            </div>

            {/* Query Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                        <PaperPlaneTilt size={22} weight="duotone" className="text-purple-400" />
                        Raise New Query
                    </h3>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Your Query *
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-900 border border-slate-600 rounded-xl focus:border-purple-500 focus:outline-none resize-none text-slate-200 placeholder-slate-600"
                                placeholder="Describe your query in detail..."
                                rows={4}
                                required
                            />
                            <p className="text-xs text-slate-500 mt-2 font-mono">{description.length} characters (minimum 10)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-3">
                                Category (optional - AI will auto-detect)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`p-4 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${category === cat.value
                                            ? 'bg-purple-600 text-white border-2 border-purple-400 ring-2 ring-purple-500/20'
                                            : 'bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-500'
                                            }`}
                                    >
                                        <span className="text-2xl block mb-2">{cat.icon}</span>
                                        <span className="block">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || description.length < 10}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 font-bold uppercase tracking-wider text-sm transition-all hover:scale-105 active:scale-95"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <PaperPlaneTilt size={18} />
                                        Submit
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Query History */}
            <div>
                <h3 className="text-lg font-chivo font-bold mb-5 flex items-center gap-2 uppercase tracking-wider">
                    <ListBullets size={22} weight="duotone" className="text-slate-400" />
                    Your Queries ({queries.length})
                </h3>

                {queries.length > 0 ? (
                    <div className="space-y-4">
                        {queries.map((query) => (
                            <div
                                key={query.id}
                                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 text-xs font-bold bg-purple-900/50 text-purple-300 rounded-lg uppercase tracking-wider">
                                            {query.category}
                                        </span>
                                        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${query.status === 'RESOLVED' ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {query.status === 'RESOLVED' ? (
                                                <CheckCircle size={14} weight="fill" />
                                            ) : (
                                                <Clock size={14} weight="duotone" />
                                            )}
                                            {query.status}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">
                                        {formatDate(query.created_at)}
                                    </span>
                                </div>

                                <p className="text-slate-300 mb-4 leading-relaxed">{query.description}</p>

                                {query.response && (
                                    <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 mt-4">
                                        <p className="text-xs text-green-400 font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                                            <CheckCircle size={14} weight="fill" />
                                            Admin Response
                                            {query.responded_at && (
                                                <span className="text-green-500 ml-2 font-normal">
                                                    • {formatDate(query.responded_at)}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-green-200">{query.response}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-xl p-16 text-center relative overflow-hidden">
                        <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                        <Question size={56} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 font-semibold uppercase tracking-wider">No queries yet</p>
                        <p className="text-sm text-slate-600 mt-2">Click "New Query" to get started</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {redirectModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className={`px-6 py-5 ${redirectModal.to ? 'bg-orange-600' : redirectModal.message.includes('success') ? 'bg-green-600' : 'bg-red-600'}`}>
                            <div className="flex items-center gap-3">
                                {redirectModal.to ? (
                                    <Wrench size={28} weight="fill" className="text-white" />
                                ) : redirectModal.message.includes('success') ? (
                                    <CheckCircle size={28} weight="fill" className="text-white" />
                                ) : (
                                    <XCircle size={28} weight="fill" className="text-white" />
                                )}
                                <h3 className="text-lg font-bold text-white">
                                    {redirectModal.to ? 'Wrong Section' : redirectModal.message.includes('success') ? 'Success!' : 'Error'}
                                </h3>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-200 leading-relaxed">{redirectModal.message}</p>

                            {redirectModal.to && (
                                <div className="mt-4 p-4 bg-orange-900/20 border border-orange-700/50 rounded-xl">
                                    <p className="text-sm text-orange-300 flex items-center gap-2">
                                        <Wrench size={18} weight="duotone" />
                                        Complaints section is for maintenance issues
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
                            <button
                                onClick={() => setRedirectModal(null)}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-all"
                            >
                                {redirectModal.to ? 'Stay Here' : 'OK'}
                            </button>
                            {redirectModal.to && (
                                <button
                                    onClick={() => router.push(redirectModal.to)}
                                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all"
                                >
                                    Go to Complaints
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
