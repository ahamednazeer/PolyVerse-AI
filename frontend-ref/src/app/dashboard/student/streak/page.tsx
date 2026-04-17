'use client';

import React, { useEffect, useState } from 'react';

import { StreakDisplay } from '@/components/StreakDisplay';
import { api } from '@/lib/api';
import { Fire, Pulse, Sparkle, Trophy, Lightning, ShieldCheck } from '@phosphor-icons/react';

export default function StreakPage() {
    const [user, setUser] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [userData, assignmentsData] = await Promise.all([
                    api.getMe(),
                    api.getMyAssignments(),
                ]);
                setUser(userData);
                setAssignments(assignmentsData);
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
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-orange-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Streak Data...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <Fire size={28} weight="fill" className="text-orange-400" />
                    My Streak
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Track your reading progress and maintain your streak</p>
            </div>

            {assignments.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-16 text-center relative overflow-hidden">
                    <Sparkle size={120} weight="duotone" className="absolute -right-6 -bottom-6 text-slate-800/30" />
                    <Fire size={64} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wider">No Active Streaks</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">You don't have any PDFs assigned yet. Check back later!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {assignments.map((assignment) => (
                        <StreakCard key={assignment.id} pdfId={assignment.pdf_id} assignmentId={assignment.id} />
                    ))}
                </div>
            )}

            {/* Category Info */}
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-6">
                <h3 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Trophy size={22} weight="duotone" className="text-amber-400" />
                    Streak Rules for {user?.student_category?.replace('_', ' ') || 'Students'}
                </h3>
                {user?.student_category === 'HOSTELLER' ? (
                    <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                            <p className="text-slate-400"><span className="text-red-400 font-bold">Strict rules</span> - Missing even one day permanently breaks your streak</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />
                            <p className="text-slate-400">You can request streak recovery by contacting admin</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                            <p className="text-slate-400">Admin will review your request and may restore your streak</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                            <p className="text-slate-400"><span className="text-green-400 font-bold">Flexible rules</span> - You have one automatic recovery per assignment cycle</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />
                            <p className="text-slate-400">Read for 20 minutes in a single day to auto-recover your streak</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                            <p className="text-slate-400">Once used, no more recoveries until the next assignment</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StreakCard({ pdfId, assignmentId }: { pdfId: number; assignmentId: number }) {
    const [streak, setStreak] = useState<any>(null);
    const [pdfDetails, setPdfDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            // TODO: Uncomment when API method is available
            // api.getStreak(pdfId),
            Promise.resolve({ current_streak: 0, max_streak: 0, is_broken: false }), // Placeholder
            api.getPDF(pdfId).catch(() => null)
        ])
            .then(([streakData, pdfData]) => {
                setStreak(streakData);
                setPdfDetails(pdfData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [pdfId]);

    if (loading) {
        return (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                <div className="h-24 bg-slate-700/40 rounded-xl animate-pulse" />
            </div>
        );
    }

    const isBroken = streak?.is_broken;

    return (
        <div className={`bg-slate-800/40 border rounded-xl p-6 transition-all hover:scale-[1.01] ${isBroken ? 'border-red-700/40' : 'border-slate-700/60 hover:border-orange-500/50'
            }`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-200 truncate">{pdfDetails?.title || `PDF #${pdfId}`}</h3>
                {isBroken ? (
                    <span className="text-xs bg-red-950/50 text-red-400 px-2 py-1 rounded-lg font-bold uppercase">Broken</span>
                ) : (
                    <span className="text-xs bg-green-950/50 text-green-400 px-2 py-1 rounded-lg font-bold uppercase">Active</span>
                )}
            </div>
            <StreakDisplay
                currentStreak={streak?.current_streak || 0}
                maxStreak={streak?.max_streak || 0}
                isBroken={streak?.is_broken || false}
                size="lg"
            />
        </div>
    );
}
