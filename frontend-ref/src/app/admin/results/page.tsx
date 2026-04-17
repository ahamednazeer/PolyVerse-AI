'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Trophy, User, Clock, CheckCircle, XCircle, FilePdf, MagnifyingGlass, Pulse, Sparkle } from '@phosphor-icons/react';

interface QuizResult {
    id: number;
    student_id: number;
    quiz_id: number;
    score: number;
    total_questions: number;
    started_at: string;
    submitted_at: string;
    is_completed: boolean;
}

interface Quiz {
    id: number;
    title: string;
    pdf_id: number;
}

interface UserInfo {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

export default function AdminResultsPage() {
    const [results, setResults] = useState<QuizResult[]>([]);
    const [quizzes, setQuizzes] = useState<Record<number, Quiz>>({});
    const [users, setUsers] = useState<Record<number, UserInfo>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterQuiz, setFilterQuiz] = useState<number | 'all'>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [resultsData, usersData] = await Promise.all([
                api.getAllQuizResults(),
                api.getUsers(),
            ]);

            setResults(Array.isArray(resultsData) ? resultsData : []);

            // Build user map
            const userMap: Record<number, UserInfo> = {};
            const userList = Array.isArray(usersData) ? usersData : (usersData?.users || []);
            userList.forEach((u: UserInfo) => {
                userMap[u.id] = u;
            });
            setUsers(userMap);

            // Fetch quiz info for each unique quiz_id
            const quizIds = [...new Set(resultsData.map((r: QuizResult) => r.quiz_id))];
            const quizMap: Record<number, Quiz> = {};

            for (const quizId of quizIds) {
                try {
                    const quiz = await api.getQuiz(quizId as number);
                    quizMap[quizId as number] = quiz;
                } catch (e) {
                    console.error(`Failed to fetch quiz ${quizId}`, e);
                }
            }
            setQuizzes(quizMap);

        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number, total: number) => {
        const percent = (score / total) * 100;
        if (percent >= 80) return 'text-green-400';
        if (percent >= 60) return 'text-yellow-400';
        if (percent >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number, total: number) => {
        const percent = (score / total) * 100;
        if (percent >= 80) return 'bg-green-500/20';
        if (percent >= 60) return 'bg-yellow-500/20';
        if (percent >= 40) return 'bg-orange-500/20';
        return 'bg-red-500/20';
    };

    const filteredResults = results.filter(result => {
        const user = users[result.student_id];
        const quiz = quizzes[result.quiz_id];

        // Filter by quiz
        if (filterQuiz !== 'all' && result.quiz_id !== filterQuiz) {
            return false;
        }

        // Filter by search term
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.toLowerCase();
            const userEmail = user?.email?.toLowerCase() || '';
            const quizTitle = quiz?.title?.toLowerCase() || '';

            return userName.includes(searchLower) ||
                userEmail.includes(searchLower) ||
                quizTitle.includes(searchLower);
        }

        return true;
    });

    // Calculate stats
    const avgScore = filteredResults.length > 0
        ? (filteredResults.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / filteredResults.length).toFixed(1)
        : 0;
    const passCount = filteredResults.filter(r => (r.score / r.total_questions) >= 0.6).length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-purple-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Quiz Results...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Trophy size={28} weight="duotone" className="text-purple-400" />
                    Quiz Results
                </h1>
                <p className="text-slate-500 mt-1">View all student quiz scores and performance</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/60 rounded-xl p-5">
                    <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-1">Total Attempts</p>
                    <p className="text-2xl font-bold text-slate-100 font-mono">{filteredResults.length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/40 border border-blue-700/40 rounded-xl p-5">
                    <p className="text-[10px] text-blue-400 uppercase font-mono tracking-widest mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-blue-400 font-mono">{avgScore}%</p>
                </div>
                <div className="bg-gradient-to-br from-green-900/30 to-green-950/40 border border-green-700/40 rounded-xl p-5">
                    <p className="text-[10px] text-green-400 uppercase font-mono tracking-widest mb-1">Passed (≥60%)</p>
                    <p className="text-2xl font-bold text-green-400 font-mono">{passCount}</p>
                </div>
                <div className="bg-gradient-to-br from-red-900/30 to-red-950/40 border border-red-700/40 rounded-xl p-5">
                    <p className="text-[10px] text-red-400 uppercase font-mono tracking-widest mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-400 font-mono">{filteredResults.length - passCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlass size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by student name or quiz..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                    />
                </div>
                <select
                    value={filterQuiz}
                    onChange={(e) => setFilterQuiz(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="px-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                >
                    <option value="all">All Quizzes</option>
                    {Object.values(quizzes).map(quiz => (
                        <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                    ))}
                </select>
            </div>

            {/* Results Table */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700 text-left bg-slate-800/50">
                                <th className="px-5 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Student</th>
                                <th className="px-5 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Quiz</th>
                                <th className="px-5 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">Score</th>
                                <th className="px-5 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">%</th>
                                <th className="px-5 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Submitted</th>
                                <th className="px-5 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center relative overflow-hidden">
                                        <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                                        <Trophy size={56} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                                        <p className="text-slate-500">No quiz results found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredResults.map((result) => {
                                    const user = users[result.student_id];
                                    const quiz = quizzes[result.quiz_id];
                                    const percent = Math.round((result.score / result.total_questions) * 100);
                                    const passed = percent >= 60;

                                    return (
                                        <tr key={result.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                                                        <User size={16} className="text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-200">
                                                            {user ? `${user.first_name} ${user.last_name}` : `Student #${result.student_id}`}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{user?.email || ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-slate-300">{quiz?.title || `Quiz #${result.quiz_id}`}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-mono font-bold ${getScoreColor(result.score, result.total_questions)}`}>
                                                    {result.score}/{result.total_questions}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2 py-1 rounded font-mono text-sm ${getScoreBg(result.score, result.total_questions)} ${getScoreColor(result.score, result.total_questions)}`}>
                                                    {percent}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-400 font-mono">
                                                    {new Date(result.submitted_at).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {passed ? (
                                                    <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                                                        <CheckCircle size={16} weight="fill" /> Pass
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                                                        <XCircle size={16} weight="fill" /> Fail
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
