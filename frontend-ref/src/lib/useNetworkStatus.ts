'use client';

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
    isOnline: boolean;
    isUnstable: boolean;
    lastOnlineAt: Date | null;
}

/**
 * Hook to monitor network connectivity status
 * Uses navigator.onLine which is reliable for most use cases
 */
export function useNetworkStatus(): NetworkStatus {
    const [isOnline, setIsOnline] = useState(true);
    const [isUnstable, setIsUnstable] = useState(false);
    const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);

    // Initialize on client side
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const online = navigator.onLine;
            setIsOnline(online);
            setIsUnstable(false); // Start with stable assumption
            if (online) {
                setLastOnlineAt(new Date());
            }
        }
    }, []);

    // Handle online event
    const handleOnline = useCallback(() => {
        setIsOnline(true);
        setIsUnstable(false);
        setLastOnlineAt(new Date());
    }, []);

    // Handle offline event
    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setIsUnstable(false);
    }, []);

    // Set up event listeners
    useEffect(() => {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);

    return { isOnline, isUnstable, lastOnlineAt };
}

/**
 * Simple hook for basic online/offline status without ping
 */
export function useSimpleNetworkStatus(): boolean {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

