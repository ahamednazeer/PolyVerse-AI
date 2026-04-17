'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import {
    saveOfflineData,
    getOfflineData,
    getLastSyncTime,
    isDataStale,
    OFFLINE_KEYS
} from '@/lib/offlineStorage';
import { api } from '@/lib/api';

// Types for cached data
interface CachedOutpass {
    id: number;
    student_id: number;
    reason: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    emergency_contact: string;
    status: string;
    rejection_reason: string | null;
    reviewed_by: number | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

interface CachedFacultyMember {
    faculty_id: number;
    faculty_name: string;
    department: string | null;
    availability_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    status_message: string | null;
    last_seen_building_name: string | null;
    last_seen_floor: number | null;
    last_seen_at: string | null;
}

interface CachedProfile {
    id: number;
    email: string;
    first_name: string;
    last_name?: string;
    role: string;
    student_id?: string;
    batch?: string;
    department?: string;
    student_category?: string;
}

interface CachedStreakInfo {
    current_streak: number;
    max_streak: number;
    is_broken: boolean;
    pdf_title?: string;
}

interface CachedHostelInfo {
    is_assigned: boolean;
    hostel_name: string | null;
    room_number: string | null;
    floor: number | null;
    warden_name: string | null;
}

interface OfflineData {
    approvedOutpass: CachedOutpass | null;
    facultyAvailability: CachedFacultyMember[];
    studentProfile: CachedProfile | null;
    readingStreaks: CachedStreakInfo[];
    hostelInfo: CachedHostelInfo | null;
}

interface LastSyncTimes {
    approvedOutpass: Date | null;
    facultyAvailability: Date | null;
    studentProfile: Date | null;
    readingStreaks: Date | null;
    hostelInfo: Date | null;
}

interface OfflineContextType {
    isOfflineMode: boolean;
    isUnstableConnection: boolean;
    offlineData: OfflineData;
    lastSyncTimes: LastSyncTimes;
    syncAllData: () => Promise<void>;
    isSyncing: boolean;
}

const defaultOfflineData: OfflineData = {
    approvedOutpass: null,
    facultyAvailability: [],
    studentProfile: null,
    readingStreaks: [],
    hostelInfo: null,
};

const defaultLastSyncTimes: LastSyncTimes = {
    approvedOutpass: null,
    facultyAvailability: null,
    studentProfile: null,
    readingStreaks: null,
    hostelInfo: null,
};

const OfflineContext = createContext<OfflineContextType>({
    isOfflineMode: false,
    isUnstableConnection: false,
    offlineData: defaultOfflineData,
    lastSyncTimes: defaultLastSyncTimes,
    syncAllData: async () => { },
    isSyncing: false,
});

export function useOffline() {
    return useContext(OfflineContext);
}

interface OfflineProviderProps {
    children: ReactNode;
    userRole?: string;
}

export function OfflineProvider({ children, userRole }: OfflineProviderProps) {
    const { isOnline, isUnstable } = useNetworkStatus();
    const [offlineData, setOfflineData] = useState<OfflineData>(defaultOfflineData);
    const [lastSyncTimes, setLastSyncTimes] = useState<LastSyncTimes>(defaultLastSyncTimes);
    const [isSyncing, setIsSyncing] = useState(false);

    // Only enable offline mode for students
    const isStudentRole = userRole === 'STUDENT' || userRole === 'student';
    const isOfflineMode = !isOnline && isStudentRole;

    // Load cached data from localStorage on mount
    useEffect(() => {
        if (!isStudentRole) return;

        const loadCachedData = () => {
            const cachedOutpass = getOfflineData<CachedOutpass>(OFFLINE_KEYS.APPROVED_OUTPASS);
            const cachedFaculty = getOfflineData<CachedFacultyMember[]>(OFFLINE_KEYS.FACULTY_AVAILABILITY);
            const cachedProfile = getOfflineData<CachedProfile>(OFFLINE_KEYS.STUDENT_PROFILE);
            const cachedStreaks = getOfflineData<CachedStreakInfo[]>(OFFLINE_KEYS.READING_STREAK);
            const cachedHostel = getOfflineData<CachedHostelInfo>(OFFLINE_KEYS.HOSTEL_INFO);

            setOfflineData({
                approvedOutpass: cachedOutpass,
                facultyAvailability: cachedFaculty || [],
                studentProfile: cachedProfile,
                readingStreaks: cachedStreaks || [],
                hostelInfo: cachedHostel,
            });

            setLastSyncTimes({
                approvedOutpass: getLastSyncTime(OFFLINE_KEYS.APPROVED_OUTPASS),
                facultyAvailability: getLastSyncTime(OFFLINE_KEYS.FACULTY_AVAILABILITY),
                studentProfile: getLastSyncTime(OFFLINE_KEYS.STUDENT_PROFILE),
                readingStreaks: getLastSyncTime(OFFLINE_KEYS.READING_STREAK),
                hostelInfo: getLastSyncTime(OFFLINE_KEYS.HOSTEL_INFO),
            });
        };

        loadCachedData();
    }, [isStudentRole]);

    // Sync all data for offline use
    const syncAllData = useCallback(async () => {
        if (!isOnline || !isStudentRole) return;

        setIsSyncing(true);
        try {
            // Sync profile
            try {
                const profile = await api.getMe();
                saveOfflineData(OFFLINE_KEYS.STUDENT_PROFILE, profile, 120); // 2 hours TTL
                setOfflineData(prev => ({ ...prev, studentProfile: profile }));
                setLastSyncTimes(prev => ({ ...prev, studentProfile: new Date() }));
            } catch (e) {
                console.warn('Failed to sync profile:', e);
            }

            // Sync hostel info
            try {
                const hostelInfo = await api.getMyHostelInfo();
                saveOfflineData(OFFLINE_KEYS.HOSTEL_INFO, hostelInfo, 120);
                setOfflineData(prev => ({ ...prev, hostelInfo }));
                setLastSyncTimes(prev => ({ ...prev, hostelInfo: new Date() }));
            } catch (e) {
                console.warn('Failed to sync hostel info:', e);
            }

            // Sync approved outpass (find the latest approved one)
            try {
                const outpassResponse = await api.getMyOutpasses();
                const approvedOutpass = outpassResponse.outpasses?.find(
                    (op: CachedOutpass) => op.status === 'APPROVED'
                ) || null;
                if (approvedOutpass) {
                    saveOfflineData(OFFLINE_KEYS.APPROVED_OUTPASS, approvedOutpass, 60);
                    setOfflineData(prev => ({ ...prev, approvedOutpass }));
                    setLastSyncTimes(prev => ({ ...prev, approvedOutpass: new Date() }));
                }
            } catch (e) {
                console.warn('Failed to sync outpass:', e);
            }

            // Sync faculty availability
            try {
                const facultyResponse = await api.getAvailableFaculty({ page_size: 50 });
                const faculty = facultyResponse.faculty || [];
                saveOfflineData(OFFLINE_KEYS.FACULTY_AVAILABILITY, faculty, 30); // 30 min TTL
                setOfflineData(prev => ({ ...prev, facultyAvailability: faculty }));
                setLastSyncTimes(prev => ({ ...prev, facultyAvailability: new Date() }));
            } catch (e) {
                console.warn('Failed to sync faculty:', e);
            }

            // Note: Reading streak sync is disabled since the feature is currently not active
            // When re-enabled, uncomment this block and the api.getStreak method
            /*
            try {
                const assignments = await api.getMyAssignments();
                const streaks: CachedStreakInfo[] = [];

                for (const assignment of assignments.slice(0, 5)) {
                    try {
                        const streak = await api.getStreak(assignment.pdf_id);
                        const pdf = await api.getPDF(assignment.pdf_id).catch(() => null);
                        streaks.push({
                            current_streak: streak.current_streak || 0,
                            max_streak: streak.max_streak || 0,
                            is_broken: streak.is_broken || false,
                            pdf_title: pdf?.title,
                        });
                    } catch { }
                }

                saveOfflineData(OFFLINE_KEYS.READING_STREAK, streaks, 60);
                setOfflineData(prev => ({ ...prev, readingStreaks: streaks }));
                setLastSyncTimes(prev => ({ ...prev, readingStreaks: new Date() }));
            } catch (e) {
                console.warn('Failed to sync streaks:', e);
            }
            */
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isStudentRole]);

    // Auto-sync when coming online
    useEffect(() => {
        if (isOnline && isStudentRole) {
            // Sync if data is stale
            if (isDataStale(OFFLINE_KEYS.STUDENT_PROFILE, 60)) {
                syncAllData();
            }
        }
    }, [isOnline, isStudentRole, syncAllData]);

    return (
        <OfflineContext.Provider
            value={{
                isOfflineMode,
                isUnstableConnection: isUnstable,
                offlineData,
                lastSyncTimes,
                syncAllData,
                isSyncing,
            }}
        >
            {children}
        </OfflineContext.Provider>
    );
}

export default OfflineContext;
