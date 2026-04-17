import React from 'react';
import { Fire } from '@phosphor-icons/react';

interface StreakDisplayProps {
    currentStreak: number;
    maxStreak: number;
    isBroken?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function StreakDisplay({
    currentStreak,
    maxStreak,
    isBroken = false,
    size = 'md',
}: StreakDisplayProps) {
    const sizeClasses = {
        sm: {
            container: 'p-3',
            icon: 24,
            streak: 'text-2xl',
            label: 'text-xs',
        },
        md: {
            container: 'p-4',
            icon: 36,
            streak: 'text-4xl',
            label: 'text-sm',
        },
        lg: {
            container: 'p-6',
            icon: 48,
            streak: 'text-6xl',
            label: 'text-base',
        },
    };

    const styles = sizeClasses[size];

    return (
        <div
            className={`bg-slate-800/40 border border-slate-700/60 rounded-sm ${styles.container} ${isBroken ? 'streak-broken' : 'streak-glow'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`${isBroken ? 'text-slate-500' : 'text-orange-500 animate-streak-fire'}`}>
                    <Fire size={styles.icon} weight="fill" />
                </div>
                <div>
                    <p className={`font-bold font-mono ${styles.streak} ${isBroken ? 'text-slate-500' : 'text-orange-400'}`}>
                        {currentStreak}
                    </p>
                    <p className={`text-slate-400 ${styles.label}`}>
                        {isBroken ? 'Streak Broken' : 'Day Streak'}
                    </p>
                </div>
            </div>
            {maxStreak > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500 font-mono">
                        Best Streak: <span className="text-slate-300">{maxStreak} days</span>
                    </p>
                </div>
            )}
        </div>
    );
}
