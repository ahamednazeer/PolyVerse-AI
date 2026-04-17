'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, Video, Calendar, Clock, Users, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface DoubtSession {
    id: number;
    title: string;
    description?: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    course_id?: number;
}

interface SessionSummary {
    summary_text: string;
    key_topics?: string;
    created_at: string;
}

interface Question {
    id: number;
    question_text: string;
    status: string;
    answer_text?: string;
    created_at: string;
}

export default function SessionSummaryPage() {
    const params = useParams();
    const sessionId = parseInt(params.id as string);

    const [session, setSession] = useState<DoubtSession | null>(null);
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [sessionId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const sessionData = await api.getDoubtSession(sessionId);
            setSession(sessionData);

            // Try to load summary (might not exist)
            try {
                const summaryData = await api.getSessionSummary(sessionId);
                setSummary(summaryData);
            } catch {
                // Summary might not exist
            }

            // Load questions if API is available
            // This would require an endpoint like /doubt-sessions/{id}/questions
        } catch (error) {
            console.error('Error loading session:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500">Session not found</p>
                <Link href="/dashboard/staff/learning" className="text-blue-500 hover:underline mt-2 inline-block">
                    Back to Learning Management
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Link href="/dashboard/staff/learning" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
                <ArrowLeft className="w-5 h-5" />
                Back to Learning Management
            </Link>

            {/* Session Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Video className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{session.title}</h1>
                            <p className="text-gray-500">Session Summary</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${session.status === 'ENDED' ? 'bg-gray-100 text-gray-600' :
                            session.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                                'bg-green-100 text-green-600'
                        }`}>
                        {session.status}
                    </span>
                </div>

                {session.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{session.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                            {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                            })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                            {new Date(session.scheduled_at).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{session.duration_minutes} minutes</span>
                    </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    Session Summary
                </h2>

                {summary ? (
                    <div className="space-y-4">
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary.summary_text}</p>
                        </div>
                        {summary.key_topics && (
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Topics Covered:</h3>
                                <div className="flex flex-wrap gap-2">
                                    {summary.key_topics.split(',').map((topic, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
                                            {topic.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No summary has been added for this session yet.</p>
                        <p className="text-sm mt-1">You can add a summary from the session management panel.</p>
                    </div>
                )}
            </div>

            {/* Questions Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Questions Asked
                </h2>

                {questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No questions were recorded for this session.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {questions.map(q => (
                            <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    {q.status === 'ANSWERED' ? (
                                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <p className="text-gray-900 dark:text-white">{q.question_text}</p>
                                        {q.answer_text && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                                <span className="font-medium">Answer:</span> {q.answer_text}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
