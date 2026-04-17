'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
    Users, MessageCircle, Video, Pencil, Brain, Star, Trophy,
    BookOpen, Clock, ArrowRight, Zap, Target, TrendingUp,
    Calendar, MessageSquare, Sparkles, ChevronRight
} from 'lucide-react';

interface StudyCircle {
    id: number;
    name: string;
    description?: string;
    subject_code?: string;
    has_voice_room: boolean;
}

interface DoubtSession {
    id: number;
    title: string;
    faculty_id: number;
    scheduled_at: string;
    status: string;
    room_url?: string;
}

interface FlashcardSet {
    id: number;
    title: string;
    topic?: string;
    total_cards: number;
    times_played: number;
}

interface BattleStats {
    total_battles: number;
    wins: number;
    win_rate: number;
    average_score: number;
}

interface Course {
    id: number;
    code: string;
    name: string;
    description?: string;
    department?: string;
    semester?: number;
    credits?: number;
}

export default function LearningHubPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [circles, setCircles] = useState<StudyCircle[]>([]);
    const [upcomingSessions, setUpcomingSessions] = useState<DoubtSession[]>([]);
    const [liveSessions, setLiveSessions] = useState<DoubtSession[]>([]);
    const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
    const [battleStats, setBattleStats] = useState<BattleStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'circles' | 'battles' | 'sessions'>('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [coursesRes, circlesRes, upcomingRes, liveRes, setsRes, statsRes] = await Promise.allSettled([
                api.getMyCourses(),
                api.getMyStudyCircles(),
                api.getUpcomingDoubtSessions(),
                api.getLiveDoubtSessions(),
                api.getFlashcardSets(),
                api.getMyFlashcardStats(),
            ]);

            if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value);
            if (circlesRes.status === 'fulfilled') setCircles(circlesRes.value);
            if (upcomingRes.status === 'fulfilled') setUpcomingSessions(upcomingRes.value);
            if (liveRes.status === 'fulfilled') setLiveSessions(liveRes.value);
            if (setsRes.status === 'fulfilled') setFlashcardSets(setsRes.value);
            if (statsRes.status === 'fulfilled') setBattleStats(statsRes.value);
        } catch (error) {
            console.error('Error loading learning hub data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-7 h-7 text-purple-500" />
                        Learning Hub
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Collaborate, compete, and learn together
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                {[
                    { id: 'overview', label: 'Overview', icon: Target },
                    { id: 'courses', label: 'My Courses', icon: BookOpen },
                    { id: 'circles', label: 'Study Circles', icon: Users },
                    { id: 'battles', label: 'Flashcard Battles', icon: Trophy },
                    { id: 'sessions', label: 'Doubt Sessions', icon: Video },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setActiveTab('courses')}
                            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white hover:scale-[1.02] transition-transform cursor-pointer text-left"
                        >
                            <BookOpen className="w-8 h-8 mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{courses.length}</div>
                            <div className="text-blue-100">Enrolled Courses</div>
                        </button>
                        <Link
                            href="/dashboard/student/learning/circles"
                            className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white hover:scale-[1.02] transition-transform cursor-pointer"
                        >
                            <Users className="w-8 h-8 mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{circles.length}</div>
                            <div className="text-purple-100">Study Circles</div>
                        </Link>
                        <Link
                            href="/dashboard/student/learning/battles"
                            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white hover:scale-[1.02] transition-transform cursor-pointer"
                        >
                            <Trophy className="w-8 h-8 mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{battleStats?.wins || 0}</div>
                            <div className="text-amber-100">Battle Wins</div>
                        </Link>
                        <button
                            onClick={() => setActiveTab('sessions')}
                            className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white hover:scale-[1.02] transition-transform cursor-pointer text-left"
                        >
                            <Video className="w-8 h-8 mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{liveSessions.length}</div>
                            <div className="text-emerald-100">Live Sessions</div>
                        </button>
                        <button
                            onClick={() => setActiveTab('battles')}
                            className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-5 text-white hover:scale-[1.02] transition-transform cursor-pointer text-left"
                        >
                            <BookOpen className="w-8 h-8 mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{flashcardSets.length}</div>
                            <div className="text-rose-100">Flashcard Sets</div>
                        </button>
                    </div>

                    {/* Live Sessions Alert */}
                    {liveSessions.length > 0 && (
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-5 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                    </span>
                                    <span className="font-semibold text-lg">LIVE NOW</span>
                                </div>
                            </div>
                            {liveSessions.map(session => (
                                <div key={session.id} className="flex items-center justify-between bg-white/10 rounded-lg p-3 mb-2">
                                    <div>
                                        <div className="font-medium">{session.title}</div>
                                        <div className="text-sm text-white/80">Click to join the session</div>
                                    </div>
                                    <Link
                                        href={`/dashboard/student/learning/sessions/${session.id}/room`}
                                        className="bg-white text-rose-600 px-4 py-2 rounded-lg font-medium hover:bg-rose-50 transition-colors inline-block text-center"
                                    >
                                        Join Now
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upcoming Sessions */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Upcoming Doubt Sessions
                            </h2>
                        </div>
                        {upcomingSessions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No upcoming sessions scheduled
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingSessions.slice(0, 3).map(session => (
                                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors cursor-pointer" onClick={() => setActiveTab('sessions')}>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{session.title}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(session.scheduled_at)}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Battle Stats */}
                    {battleStats && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                Your Battle Stats
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{battleStats.total_battles}</div>
                                    <div className="text-sm text-gray-500">Total Battles</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-2xl font-bold text-emerald-600">{battleStats.win_rate.toFixed(0)}%</div>
                                    <div className="text-sm text-gray-500">Win Rate</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-2xl font-bold text-amber-600">{battleStats.wins}</div>
                                    <div className="text-sm text-gray-500">Wins</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">{battleStats.average_score.toFixed(0)}</div>
                                    <div className="text-sm text-gray-500">Avg Score</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ordered Enrolled Courses</h2>
                    {courses.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Enrolled Courses</h3>
                            <p className="text-gray-500 dark:text-gray-400">You haven't been enrolled in any courses yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => (
                                <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all group">
                                    <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{course.code}</span>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">{course.name}</h3>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl">
                                                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            {course.department && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Users className="w-4 h-4 opacity-70" />
                                                    <span>{course.department} Department</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 opacity-70" />
                                                    <span>Sem {course.semester}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Star className="w-4 h-4 opacity-70" />
                                                    <span>{course.credits} Credits</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="flex-1 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all text-sm">
                                                Course Details
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('circles')}
                                                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                                title="Study Circles"
                                            >
                                                <Users className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Study Circles Tab */}
            {activeTab === 'circles' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Study Circles</h2>
                        <button
                            onClick={() => api.autoEnrollCircles().then(loadData)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" />
                            Auto-Join Circles
                        </button>
                    </div>

                    {circles.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Study Circles Yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Click "Auto-Join Circles" to join circles based on your courses</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {circles.map(circle => (
                                <Link
                                    key={circle.id}
                                    href="/dashboard/student/learning/circles"
                                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow block"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                                            {circle.name.charAt(0)}
                                        </div>
                                        {circle.has_voice_room && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                                <Video className="w-3 h-3" />
                                                Voice
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{circle.name}</h3>
                                    {circle.subject_code && (
                                        <span className="text-sm text-purple-600 dark:text-purple-400">{circle.subject_code}</span>
                                    )}
                                    {circle.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{circle.description}</p>
                                    )}
                                    <div className="mt-4 flex items-center gap-2 text-gray-500">
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="text-sm">Enter Circle</span>
                                        <ArrowRight className="w-4 h-4 ml-auto" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Flashcard Battles Tab */}
            {activeTab === 'battles' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flashcard Battle Arena</h2>
                        <Link
                            href="/dashboard/student/learning/battles"
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                        >
                            <Zap className="w-4 h-4" />
                            Find Battle
                        </Link>
                    </div>

                    {/* Quick Battle */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Trophy className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-1">Quick Battle</h3>
                                <p className="text-amber-100">Challenge a random opponent and test your knowledge!</p>
                            </div>
                            <Link
                                href="/dashboard/student/learning/battles"
                                className="bg-white text-amber-600 px-6 py-3 rounded-xl font-semibold hover:bg-amber-50 transition-colors"
                            >
                                Start Battle
                            </Link>
                        </div>
                    </div>

                    {/* Flashcard Sets */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Available Sets</h3>
                        {flashcardSets.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Flashcard Sets</h3>
                                <p className="text-gray-500 dark:text-gray-400">Check back later for new flashcard sets</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {flashcardSets.map(set => (
                                    <div key={set.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{set.title}</h4>
                                        {set.topic && (
                                            <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full mb-3">
                                                {set.topic}
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                            <span>{set.total_cards} cards</span>
                                            <span className="flex items-center gap-1">
                                                <Trophy className="w-3 h-3" />
                                                {set.times_played} plays
                                            </span>
                                        </div>
                                        <Link
                                            href="/dashboard/student/learning/battles"
                                            className="w-full mt-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all text-center block"
                                        >
                                            Start Battle
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Doubt Sessions Tab */}
            {activeTab === 'sessions' && (
                <div className="space-y-6">
                    {/* Live Sessions */}
                    {liveSessions.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                Live Now
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {liveSessions.map(session => (
                                    <div key={session.id} className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-5 text-white">
                                        <h3 className="font-semibold text-lg mb-2">{session.title}</h3>
                                        <Link
                                            href={`/dashboard/student/learning/sessions/${session.id}/room`}
                                            className="bg-white text-rose-600 px-4 py-2 rounded-lg font-medium hover:bg-rose-50 transition-colors inline-block text-center"
                                        >
                                            Join Session
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Sessions</h2>
                        {upcomingSessions.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Upcoming Sessions</h3>
                                <p className="text-gray-500 dark:text-gray-400">Check back for new doubt clearing sessions</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {upcomingSessions.map(session => (
                                    <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <Video className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">{session.title}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(session.scheduled_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                            Set Reminder
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
