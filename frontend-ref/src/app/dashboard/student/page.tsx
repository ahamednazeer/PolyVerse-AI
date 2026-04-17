'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DataCard } from '@/components/DataCard';
import {
    Question,
    Trophy,
    CalendarCheck,
    Pulse,
    Sparkle,
    Gauge,
    Clock,
    ArrowRight,
    CheckCircle,
    Users,
    XCircle,
    ChartLineUp,
    Lightning,
    GraduationCap,
    Star,
    Brain
} from '@phosphor-icons/react';
import Link from 'next/link';

interface QuizAttempt {
    id: number;
    quiz_title: string;
    score: number;
    passed: boolean;
    attempted_at: string;
}

interface AttendanceStats {
    present_days: number;
    absent_days: number;
    attendance_percentage: number;
}

export default function StudentDashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
    const [todayAttendance, setTodayAttendance] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const userData = await api.getMe();
                setUser(userData);

                // Fetch quiz attempts
                try {
                    const attempts = await api.getMyAttempts();
                    setQuizAttempts(attempts || []);
                } catch { }

                // Fetch attendance stats
                try {
                    const stats = await api.getMyAttendanceStats();
                    setAttendanceStats(stats);
                } catch { }

                // Fetch today's attendance
                try {
                    const today = await api.getTodayAttendance();
                    setTodayAttendance(today);
                } catch { }

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
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
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Dashboard...
                </p>
            </div>
        );
    }

    const totalQuizzes = quizAttempts.length;
    const passedQuizzes = quizAttempts.filter(q => q.passed).length;
    const averageScore = totalQuizzes > 0
        ? quizAttempts.reduce((sum, q) => sum + q.score, 0) / totalQuizzes
        : 0;
    const recentAttempts = quizAttempts.slice(0, 5);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <GraduationCap size={28} weight="duotone" className="text-blue-400" />
                        Student Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1">Welcome back, <span className="text-slate-300 font-medium">{user?.first_name || 'Student'}</span>! Here's your overview.</p>
                </div>
                {todayAttendance?.is_present ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-green-950/40 to-green-900/20 border border-green-700/50 rounded-xl">
                        <CheckCircle size={20} weight="duotone" className="text-green-400" />
                        <span className="text-green-400 font-bold text-sm uppercase tracking-wider">Present Today</span>
                    </div>
                ) : (
                    <Link
                        href="/dashboard/student/attendance"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-amber-950/40 to-amber-900/20 border border-amber-700/50 rounded-xl hover:border-amber-500/70 transition-all"
                    >
                        <Clock size={20} weight="duotone" className="text-amber-400" />
                        <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">Mark Attendance</span>
                    </Link>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                    title="Quizzes Taken"
                    value={totalQuizzes}
                    icon={Question}
                />
                <DataCard
                    title="Quizzes Passed"
                    value={passedQuizzes}
                    icon={Trophy}
                />
                <DataCard
                    title="Average Score"
                    value={`${averageScore.toFixed(0)}%`}
                    icon={ChartLineUp}
                />
                <DataCard
                    title="Attendance Rate"
                    value={`${attendanceStats?.attendance_percentage?.toFixed(0) || 0}%`}
                    icon={CalendarCheck}
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Summary */}
                <div data-walkthrough="attendance" className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <CalendarCheck size={16} weight="duotone" />
                        Attendance Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-gradient-to-br from-green-950/40 to-green-900/20 border border-green-800/50 rounded-xl p-4">
                            <p className="text-green-400 text-[10px] uppercase tracking-widest font-mono mb-1">Present Days</p>
                            <p className="text-3xl font-bold text-green-400 font-mono">{attendanceStats?.present_days || 0}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-950/40 to-red-900/20 border border-red-800/50 rounded-xl p-4">
                            <p className="text-red-400 text-[10px] uppercase tracking-widest font-mono mb-1">Absent Days</p>
                            <p className="text-3xl font-bold text-red-400 font-mono">{attendanceStats?.absent_days || 0}</p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/student/attendance"
                        className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        View Full History <ArrowRight size={16} />
                    </Link>
                </div>

                {/* Recent Quiz Attempts */}
                <div data-walkthrough="quizzes" className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <Trophy size={16} weight="duotone" />
                        Recent Quiz Results
                    </h3>
                    {recentAttempts.length > 0 ? (
                        <div className="space-y-2 relative z-10">
                            {recentAttempts.map((attempt) => (
                                <div key={attempt.id} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        {attempt.passed ? (
                                            <CheckCircle size={18} weight="duotone" className="text-green-400" />
                                        ) : (
                                            <XCircle size={18} weight="duotone" className="text-red-400" />
                                        )}
                                        <span className="text-slate-300 text-sm truncate max-w-[150px]">{attempt.quiz_title}</span>
                                    </div>
                                    <div className={`font-mono font-bold text-sm ${attempt.passed ? 'text-green-400' : 'text-red-400'}`}>
                                        {attempt.score}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 relative z-10">
                            <Star size={48} weight="duotone" className="text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No quizzes attempted yet</p>
                        </div>
                    )}
                    <Link
                        href="/dashboard/student/quizzes"
                        className="mt-4 flex items-center justify-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        Take a Quiz <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <div data-walkthrough="quick-actions" className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Lightning size={16} weight="duotone" />
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                    <Link
                        href="/dashboard/student/learning"
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-950/30 to-indigo-900/10 border border-purple-700/30 rounded-xl hover:border-purple-500/50 transition-all group sm:col-span-2 lg:col-span-1"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-900/40 rounded-xl">
                                <Brain size={24} weight="duotone" className="text-purple-400" />
                            </div>
                            <div>
                                <span className="text-slate-200 font-bold block">Learning Hub</span>
                                <span className="text-xs text-slate-500">Circles, Battles & More</span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link
                        href="/dashboard/student/attendance"
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-950/30 to-blue-900/10 border border-blue-700/30 rounded-xl hover:border-blue-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-900/40 rounded-xl">
                                <CalendarCheck size={24} weight="duotone" className="text-blue-400" />
                            </div>
                            <div>
                                <span className="text-slate-200 font-bold block">Attendance</span>
                                <span className="text-xs text-slate-500">Mark & view history</span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link
                        href="/dashboard/student/quizzes"
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-950/30 to-purple-900/10 border border-purple-700/30 rounded-xl hover:border-purple-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-900/40 rounded-xl">
                                <Question size={24} weight="duotone" className="text-purple-400" />
                            </div>
                            <div>
                                <span className="text-slate-200 font-bold block">Quizzes</span>
                                <span className="text-xs text-slate-500">Test your knowledge</span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link
                        href="/dashboard/student/faculty"
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-cyan-950/30 to-cyan-900/10 border border-cyan-700/30 rounded-xl hover:border-cyan-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-cyan-900/40 rounded-xl">
                                <Users size={24} weight="duotone" className="text-cyan-400" />
                            </div>
                            <div>
                                <span className="text-slate-200 font-bold block">Faculty Locator</span>
                                <span className="text-xs text-slate-500">Find professors</span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link
                        href="/dashboard/student/queries"
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-green-950/30 to-green-900/10 border border-green-700/30 rounded-xl hover:border-green-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-900/40 rounded-xl">
                                <CheckCircle size={24} weight="duotone" className="text-green-400" />
                            </div>
                            <div>
                                <span className="text-slate-200 font-bold block">Queries</span>
                                <span className="text-xs text-slate-500">Ask questions</span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link
                        href="/dashboard/student/complaints"
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-950/30 to-orange-900/10 border border-orange-700/30 rounded-xl hover:border-orange-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-orange-900/40 rounded-xl">
                                <Gauge size={24} weight="duotone" className="text-orange-400" />
                            </div>
                            <div>
                                <span className="text-slate-200 font-bold block">Complaints</span>
                                <span className="text-xs text-slate-500">Report issues</span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link
                        href="/dashboard/student/profile"
                        className="flex items-center justify-between p-4 bg-gradient-to-br from-pink-950/30 to-pink-900/10 border border-pink-700/30 rounded-xl hover:border-pink-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-pink-900/40 rounded-xl">
                                <GraduationCap size={24} weight="duotone" className="text-pink-400" />
                            </div>
                            <div>
                                <span className="text-slate-200 font-bold block">My Profile</span>
                                <span className="text-xs text-slate-500">View & edit details</span>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
