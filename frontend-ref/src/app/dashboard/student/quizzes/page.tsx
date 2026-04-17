'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { Question, Clock, CheckCircle, Pulse, Sparkle, ArrowRight, Trophy, Target } from '@phosphor-icons/react';

interface Quiz {
    id: number;
    title: string;
    pdf_id: number;
    total_questions: number;
    duration_minutes: number;
    day_unlock: number;
    is_published: boolean;
    is_attempted?: boolean;
    score?: number;
}

export default function StudentQuizzesPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const assignments = await api.getMyAssignments();

                const allQuizzes: Quiz[] = [];
                for (const assignment of assignments) {
                    try {
                        const pdfQuizzes = await api.getQuizzes(assignment.pdf_id);
                        allQuizzes.push(...pdfQuizzes.filter((q: Quiz) => q.is_published));
                    } catch (e) {
                        console.error(e);
                    }
                }

                const attempts = await api.getMyAttempts();
                const attemptMap = new Map(attempts.map((a: any) => [a.quiz_id, a]));

                const quizzesWithStatus = allQuizzes.map(q => {
                    const attempt: any = attemptMap.get(q.id);
                    return {
                        ...q,
                        is_attempted: !!attempt?.is_completed,
                        score: attempt?.score
                    };
                });

                setQuizzes(quizzesWithStatus);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Quizzes...
                </p>
            </div>
        );
    }

    const completedCount = quizzes.filter(q => q.is_attempted).length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                        <Trophy size={28} weight="duotone" className="text-amber-400" />
                        My Quizzes
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">Test your knowledge and earn achievements</p>
                </div>
                {quizzes.length > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-700/40">
                        <Target size={18} weight="duotone" className="text-green-400" />
                        <span className="text-slate-400">Completed:</span>
                        <span className="font-bold text-slate-100">{completedCount}/{quizzes.length}</span>
                    </div>
                )}
            </div>

            {quizzes.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-16 text-center relative overflow-hidden">
                    <Sparkle size={120} weight="duotone" className="absolute -right-6 -bottom-6 text-slate-800/30" />
                    <Question size={64} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wider">No Quizzes Available</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">You don't have any quizzes assigned yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quizzes.map((quiz) => (
                        <div
                            key={quiz.id}
                            className={`bg-slate-800/40 border rounded-xl p-6 transition-all duration-300 ${quiz.is_attempted
                                    ? 'border-green-700/50 opacity-80'
                                    : 'border-slate-700/60 hover:border-blue-500/50 hover:scale-[1.02] cursor-pointer'
                                }`}
                            onClick={() => !quiz.is_attempted && router.push(`/dashboard/student/quizzes/${quiz.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${quiz.is_attempted ? 'bg-green-950/50' : 'bg-blue-950/50'}`}>
                                    <Question size={26} weight="duotone" className={quiz.is_attempted ? "text-green-400" : "text-blue-400"} />
                                </div>
                                {quiz.is_attempted ? (
                                    <div className="text-green-400 text-xs font-bold flex items-center gap-1.5 bg-green-950/40 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                        <CheckCircle size={14} weight="fill" /> Completed
                                    </div>
                                ) : (
                                    <div className="text-blue-400 text-xs font-bold flex items-center gap-1.5 bg-blue-950/40 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                        <Clock size={14} weight="duotone" /> Available
                                    </div>
                                )}
                            </div>

                            <h3 className="font-bold text-lg text-slate-100 mb-3">{quiz.title}</h3>
                            <div className="flex items-center gap-4 text-xs text-slate-400 font-mono mb-4">
                                <span className="flex items-center gap-1.5">
                                    <Clock size={14} weight="duotone" /> {quiz.duration_minutes}m
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Question size={14} weight="duotone" /> {quiz.total_questions} Qs
                                </span>
                            </div>

                            {quiz.is_attempted && (
                                <div className="pt-4 border-t border-slate-700/40 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">Score</span>
                                    <span className="text-xl font-black font-mono text-white">
                                        {quiz.score} <span className="text-slate-500 text-sm font-normal">/ {quiz.total_questions}</span>
                                    </span>
                                </div>
                            )}

                            {!quiz.is_attempted && (
                                <div className="pt-4 border-t border-slate-700/40 flex justify-end">
                                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        Start Quiz <ArrowRight size={14} />
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
