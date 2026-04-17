'use client';

import React from 'react';
import { useOffline } from '@/components/OfflineContext';
import { OfflineIndicator } from '@/components/OfflineBanner';
import { StreakDisplay } from '@/components/StreakDisplay';
import {
    Fire,
    CloudSlash,
    Sparkle,
    Info
} from '@phosphor-icons/react';

export function OfflineStreakView() {
    const { offlineData, lastSyncTimes } = useOffline();
    const streaks = offlineData.readingStreaks;
    const lastSync = lastSyncTimes.readingStreaks;

    if (!streaks || streaks.length === 0) {
        return (
            <div className="space-y-4">
                <OfflineIndicator dataKey="READING_STREAK" className="mx-auto" />
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center">
                    <CloudSlash size={48} className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No Cached Streak Data</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        Your reading streak data was not cached. Visit the Streak page while online to cache this data.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <Fire size={28} weight="fill" className="text-orange-400" />
                    My Streak
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Cached reading streak information</p>
            </div>

            {/* Offline Indicator */}
            <div className="flex justify-center">
                <OfflineIndicator dataKey="READING_STREAK" />
            </div>

            {/* Warning Notice */}
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-start gap-3">
                <Info size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-amber-300 font-medium text-sm">Read-Only Mode</p>
                    <p className="text-amber-400/70 text-xs mt-1">
                        Streak tracking and timer are disabled in offline mode.
                        {lastSync && ` Data from: ${lastSync.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                    </p>
                </div>
            </div>

            {/* Streak Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {streaks.map((streak, index) => {
                    const isBroken = streak.is_broken;
                    return (
                        <div
                            key={index}
                            className={`bg-slate-800/40 border rounded-xl p-6 ${isBroken ? 'border-red-700/40' : 'border-slate-700/60'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-200 truncate">
                                    {streak.pdf_title || `PDF #${index + 1}`}
                                </h3>
                                {isBroken ? (
                                    <span className="text-xs bg-red-950/50 text-red-400 px-2 py-1 rounded-lg font-bold uppercase">
                                        Broken
                                    </span>
                                ) : (
                                    <span className="text-xs bg-green-950/50 text-green-400 px-2 py-1 rounded-lg font-bold uppercase">
                                        Active
                                    </span>
                                )}
                            </div>
                            <StreakDisplay
                                currentStreak={streak.current_streak}
                                maxStreak={streak.max_streak}
                                isBroken={streak.is_broken}
                                size="lg"
                            />

                            {/* Offline indicator */}
                            <div className="mt-4 text-center text-[10px] text-amber-500 uppercase tracking-wider font-mono">
                                <CloudSlash size={12} className="inline mr-1" />
                                Cached View
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty state for no active streaks */}
            {streaks.length === 0 && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-16 text-center relative overflow-hidden">
                    <Sparkle size={120} weight="duotone" className="absolute -right-6 -bottom-6 text-slate-800/30" />
                    <Fire size={64} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wider">No Available Streaks</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        Your streak data will appear here when you're back online.
                    </p>
                </div>
            )}

            {/* Cache timestamp */}
            {lastSync && (
                <div className="text-center text-xs text-slate-500">
                    Data cached at {lastSync.toLocaleString()}
                </div>
            )}
        </div>
    );
}

export default OfflineStreakView;
