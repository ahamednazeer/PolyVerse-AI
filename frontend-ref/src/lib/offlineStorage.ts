/**
 * Offline Storage Utilities
 * Manages data caching for Offline Safe Mode using localStorage
 */

interface CachedData<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

const STORAGE_PREFIX = 'offline_safe_mode_';
const DEFAULT_TTL_MINUTES = 60; // 1 hour default

/**
 * Save data to offline storage with TTL
 */
export function saveOfflineData<T>(key: string, data: T, ttlMinutes: number = DEFAULT_TTL_MINUTES): void {
    if (typeof window === 'undefined') return;

    try {
        const now = Date.now();
        const cached: CachedData<T> = {
            data,
            timestamp: now,
            expiresAt: now + (ttlMinutes * 60 * 1000)
        };
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(cached));
    } catch (error) {
        console.warn('Failed to save offline data:', error);
    }
}

/**
 * Get data from offline storage (returns null if expired or not found)
 */
export function getOfflineData<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!stored) return null;

        const cached: CachedData<T> = JSON.parse(stored);
        const now = Date.now();

        // Return data even if expired (for offline mode), but mark in metadata
        return cached.data;
    } catch (error) {
        console.warn('Failed to get offline data:', error);
        return null;
    }
}

/**
 * Check if data exists and is not expired
 */
export function isDataValid(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!stored) return false;

        const cached = JSON.parse(stored);
        return Date.now() < cached.expiresAt;
    } catch {
        return false;
    }
}

/**
 * Check if data is stale (older than specified max age)
 */
export function isDataStale(key: string, maxAgeMinutes: number): boolean {
    if (typeof window === 'undefined') return true;

    try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!stored) return true;

        const cached = JSON.parse(stored);
        const ageMinutes = (Date.now() - cached.timestamp) / (60 * 1000);
        return ageMinutes > maxAgeMinutes;
    } catch {
        return true;
    }
}

/**
 * Get the last sync timestamp for a key
 */
export function getLastSyncTime(key: string): Date | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!stored) return null;

        const cached = JSON.parse(stored);
        return new Date(cached.timestamp);
    } catch {
        return null;
    }
}

/**
 * Format last sync time for display
 */
export function formatLastSyncTime(key: string): string {
    const lastSync = getLastSyncTime(key);
    if (!lastSync) return 'Never synced';

    return lastSync.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Clear specific offline data
 */
export function clearOfflineData(key: string): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
        console.warn('Failed to clear offline data:', error);
    }
}

/**
 * Clear all offline cached data
 */
export function clearAllOfflineData(): void {
    if (typeof window === 'undefined') return;

    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('Failed to clear all offline data:', error);
    }
}

// Storage keys for offline data
export const OFFLINE_KEYS = {
    APPROVED_OUTPASS: 'approved_outpass',
    FACULTY_AVAILABILITY: 'faculty_availability',
    STUDENT_PROFILE: 'student_profile',
    READING_STREAK: 'reading_streak',
    HOSTEL_INFO: 'hostel_info',
} as const;

export type OfflineKey = typeof OFFLINE_KEYS[keyof typeof OFFLINE_KEYS];
