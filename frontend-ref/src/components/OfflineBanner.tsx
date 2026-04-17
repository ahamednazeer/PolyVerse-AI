'use client';

import React from 'react';
import { WifiSlash, CloudSlash, ArrowsClockwise, Warning } from '@phosphor-icons/react';
import { useOffline } from './OfflineContext';
import { formatLastSyncTime, OFFLINE_KEYS } from '@/lib/offlineStorage';

export function OfflineBanner() {
    const { isOfflineMode, isUnstableConnection, isSyncing, lastSyncTimes } = useOffline();

    // Don't show if not in offline mode or unstable
    if (!isOfflineMode && !isUnstableConnection) return null;

    // Get the most recent sync time
    const syncTimes = Object.values(lastSyncTimes).filter(Boolean) as Date[];
    const lastSync = syncTimes.length > 0
        ? new Date(Math.max(...syncTimes.map(d => d.getTime())))
        : null;

    if (isOfflineMode) {
        return (
            <div
                className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-900/95 to-orange-900/95 backdrop-blur-sm border-b border-amber-700/50 py-2.5 px-4 shadow-lg"
                role="alert"
                aria-live="polite"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-amber-800/50 rounded-lg">
                            <WifiSlash size={18} weight="bold" className="text-amber-300" />
                        </div>
                        <div>
                            <p className="text-amber-100 font-semibold text-sm">
                                You are in Offline Safe Mode
                            </p>
                            <p className="text-amber-300/80 text-xs">
                                Some features are limited. Showing cached data.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {lastSync && (
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-amber-400 uppercase font-mono tracking-wider">
                                    Last Synced
                                </p>
                                <p className="text-xs text-amber-200 font-medium">
                                    {lastSync.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </p>
                            </div>
                        )}
                        <div className="p-2 bg-amber-800/30 rounded-full">
                            <CloudSlash size={20} className="text-amber-400" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Unstable connection warning
    if (isUnstableConnection) {
        return (
            <div
                className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-yellow-900/90 to-amber-900/90 backdrop-blur-sm border-b border-yellow-700/50 py-2 px-4 shadow-lg"
                role="alert"
                aria-live="polite"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-yellow-800/50 rounded-lg animate-pulse">
                            <Warning size={16} weight="bold" className="text-yellow-300" />
                        </div>
                        <p className="text-yellow-100 font-medium text-sm">
                            Unstable connection detected. Data may be cached.
                        </p>
                    </div>
                    {isSyncing && (
                        <div className="flex items-center gap-2 text-yellow-300 text-xs">
                            <ArrowsClockwise size={14} className="animate-spin" />
                            <span>Syncing...</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

/**
 * Inline offline indicator for individual components
 */
export function OfflineIndicator({
    dataKey,
    className = ''
}: {
    dataKey?: keyof typeof OFFLINE_KEYS;
    className?: string;
}) {
    const { isOfflineMode, lastSyncTimes } = useOffline();

    if (!isOfflineMode) return null;

    const lastSync = dataKey && lastSyncTimes[dataKey.toLowerCase() as keyof typeof lastSyncTimes];

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-amber-900/40 border border-amber-700/40 rounded-lg text-xs ${className}`}>
            <CloudSlash size={14} className="text-amber-400" />
            <span className="text-amber-300 font-medium">Offline View</span>
            {lastSync && (
                <span className="text-amber-400/70">
                    • Synced {lastSync.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
            )}
        </div>
    );
}

/**
 * Message shown when user tries restricted action in offline mode
 */
export function OfflineActionBlocked({ action = 'This action' }: { action?: string }) {
    return (
        <div className="bg-slate-800/60 border border-amber-700/40 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-900/40 flex items-center justify-center mx-auto mb-4">
                <WifiSlash size={24} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Internet Connection Required
            </h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
                {action} requires an internet connection. Please reconnect to continue.
            </p>
        </div>
    );
}

export default OfflineBanner;
