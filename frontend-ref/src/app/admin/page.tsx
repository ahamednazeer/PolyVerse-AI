'use client';

import React, { useEffect, useState } from 'react';

import { DataCard } from '@/components/DataCard';
import { api } from '@/lib/api';
import { Users, FileText, Pulse, Sparkle, Gauge, ArrowSquareOut } from '@phosphor-icons/react';

interface Stats {
    users: {
        total: number;
        byRole: Record<string, number>;
    };
    // COMMENTED OUT - Reading Streak feature disabled
    // streaks: {
    //     active: number;
    //     broken: number;
    //     avgLength: number;
    //     pendingRecovery: number;
    // };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [userData, statsData] = await Promise.all([
                    api.getMe(),
                    api.getSystemStats(),
                ]);
                setUser(userData);
                setStats(statsData);
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
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Admin Dashboard...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Gauge size={28} weight="duotone" className="text-indigo-400" />
                    Administration
                </h1>
                <p className="text-slate-500 mt-1">System overview and management</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                    title="Total Users"
                    value={stats?.users.total || 0}
                    icon={Users}
                />
                {/* COMMENTED OUT - Reading Streak feature disabled
                <DataCard
                    title="Active Streaks"
                    value={stats?.streaks.active || 0}
                    icon={Fire}
                />
                <DataCard
                    title="Broken Streaks"
                    value={stats?.streaks.broken || 0}
                    icon={Fire}
                />
                <DataCard
                    title="Avg Streak Length"
                    value={stats?.streaks.avgLength.toFixed(1) || '0'}
                    icon={ChartLineUp}
                />
                */}
            </div>

            {/* User Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <Users size={16} weight="duotone" />
                        Users by Role
                    </h3>
                    <div className="space-y-3 relative z-10">
                        {stats?.users.byRole && Object.entries(stats.users.byRole).map(([role, count]) => (
                            <div key={role} className="flex items-center justify-between bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 hover:bg-slate-800/50 transition-colors">
                                <span className="text-slate-400 text-sm font-mono uppercase tracking-wider">{role.replace('_', ' ')}</span>
                                <span className="text-slate-100 font-bold font-mono text-lg">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <ArrowSquareOut size={16} weight="duotone" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button
                            onClick={() => window.location.href = '/admin/users'}
                            className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-700/30 hover:border-blue-600/50 rounded-xl px-4 py-3 text-blue-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            Manage Users
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/pdfs'}
                            className="bg-gradient-to-br from-purple-900/40 to-purple-950/60 border border-purple-700/30 hover:border-purple-600/50 rounded-xl px-4 py-3 text-purple-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            Upload PDF
                        </button>
                        <button
                            onClick={() => window.location.href = '/admin/quizzes'}
                            className="bg-gradient-to-br from-green-900/40 to-green-950/60 border border-green-700/30 hover:border-green-600/50 rounded-xl px-4 py-3 text-green-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            Create Quiz
                        </button>
                        {/* COMMENTED OUT - Reading Streak feature disabled
                        <button
                            onClick={() => window.location.href = '/admin/streaks'}
                            className="bg-gradient-to-br from-orange-900/40 to-orange-950/60 border border-orange-700/30 hover:border-orange-600/50 rounded-xl px-4 py-3 text-orange-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            View Streaks
                        </button>
                        */}
                    </div>
                    {/* COMMENTED OUT - Reading Streak feature disabled
                    {stats?.streaks.pendingRecovery && stats.streaks.pendingRecovery > 0 && (
                        <div className="mt-4 p-4 bg-yellow-950/50 border border-yellow-800/50 rounded-xl flex items-center gap-3">
                            <Fire size={20} weight="duotone" className="text-yellow-400" />
                            <p className="text-yellow-400 text-sm font-mono uppercase tracking-wider">
                                {stats.streaks.pendingRecovery} pending recovery requests
                            </p>
                        </div>
                    )}
                    */}
                </div>
            </div>
        </div>
    );
}

