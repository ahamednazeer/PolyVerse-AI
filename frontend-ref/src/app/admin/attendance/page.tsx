'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import GeofenceMap from '@/components/GeofenceMap';
import {
    CalendarCheck,
    Users,
    MapPin,
    Clock,
    Image,
    Crosshair,
    Warning as WarningIcon,
    Gear,
    Pulse,
    Sparkle,
    Calendar,
    CheckCircle,
    XCircle,
    Trash,
    Plus
} from '@phosphor-icons/react';

interface DashboardStats {
    date: string;
    total_students: number;
    present_count: number;
    absent_count: number;
    failed_attempts_count: number;
    attendance_percentage: number;
}

interface ProfilePhoto {
    id: number;
    student_id: number;
    filename: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejection_reason?: string;
    created_at: string;
}

interface Geofence {
    id: number;
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    accuracy_threshold: number;
    is_active: boolean;
    is_primary: boolean;
}

interface AttendanceWindow {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    days_of_week: number[];
    student_category?: string;
    is_active: boolean;
}

interface FailedAttempt {
    id: number;
    student_id: number;
    attempted_at: string;
    failure_reason: string;
    failure_details?: string;
    location_latitude?: number;
    location_longitude?: number;
}

interface StudentAttendance {
    student_id: number;
    student_name: string;
    register_number?: string;
    department?: string;
    status: 'PRESENT' | 'ABSENT' | 'PENDING';
    marked_at?: string;
    face_match_confidence?: number;
}

interface DetailedAttendance {
    date: string;
    students: StudentAttendance[];
    present_count: number;
    absent_count: number;
    pending_count: number;
    total_students: number;
}

interface Holiday {
    id: number;
    date: string;
    name: string;
    description?: string;
    holiday_type: string;
    is_recurring: boolean;
    is_active: boolean;
    created_at: string;
}

interface AcademicYearSettings {
    start_date: string;
    end_date: string;
}

type Tab = 'dashboard' | 'students' | 'calendar' | 'settings' | 'photos' | 'geofences' | 'windows' | 'failures';

export default function AdminAttendancePage() {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dashboard data
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Profile photos
    const [pendingPhotos, setPendingPhotos] = useState<ProfilePhoto[]>([]);
    const [reviewingPhoto, setReviewingPhoto] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Geofences
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [showGeofenceForm, setShowGeofenceForm] = useState(false);
    const [geofenceForm, setGeofenceForm] = useState({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        radius_meters: '500',
        accuracy_threshold: '50',
        is_primary: false,
    });

    // Attendance windows
    const [windows, setWindows] = useState<AttendanceWindow[]>([]);
    const [showWindowForm, setShowWindowForm] = useState(false);
    const [windowForm, setWindowForm] = useState({
        name: '',
        start_time: '09:00',
        end_time: '10:00',
        days_of_week: [0, 1, 2, 3, 4, 5],
    });

    // Failed attempts
    const [failedAttempts, setFailedAttempts] = useState<FailedAttempt[]>([]);

    // Student details
    const [detailedAttendance, setDetailedAttendance] = useState<DetailedAttendance | null>(null);
    const [studentFilter, setStudentFilter] = useState<'all' | 'present' | 'absent' | 'pending'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Holidays/Calendar
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [showHolidayForm, setShowHolidayForm] = useState(false);
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [holidayForm, setHolidayForm] = useState({
        date: '',
        name: '',
        description: '',
        holiday_type: 'GENERAL',
        is_recurring: false,
    });
    const [bulkPasteText, setBulkPasteText] = useState('');
    const [bulkPasteYear, setBulkPasteYear] = useState(new Date().getFullYear());
    const [bulkResult, setBulkResult] = useState<{ created: any[]; errors: string[] } | null>(null);

    // Academic Year Settings
    const [academicYearSettings, setAcademicYearSettings] = useState<AcademicYearSettings | null>(null);
    const [settingsForm, setSettingsForm] = useState({
        start_date: '',
        end_date: '',
    });

    // Geolocation loading state
    const [gettingLocation, setGettingLocation] = useState(false);

    const loadDashboard = useCallback(async () => {
        try {
            const data = await api.getAttendanceDashboard(selectedDate);
            setStats(data);
        } catch (err) {
            console.error('Failed to load dashboard', err);
        }
    }, [selectedDate]);

    const loadPendingPhotos = async () => {
        try {
            const data = await api.getPendingProfilePhotos();
            setPendingPhotos(data.photos || []);
        } catch (err) {
            console.error('Failed to load photos', err);
        }
    };

    const loadGeofences = async () => {
        try {
            const data = await api.getGeofences();
            setGeofences(data.geofences || []);
        } catch (err) {
            console.error('Failed to load geofences', err);
        }
    };

    const loadWindows = async () => {
        try {
            const data = await api.getAttendanceWindows();
            setWindows(data.windows || []);
        } catch (err) {
            console.error('Failed to load windows', err);
        }
    };

    const loadFailedAttempts = async () => {
        try {
            const data = await api.getFailedAttempts();
            setFailedAttempts(data.attempts || []);
        } catch (err) {
            console.error('Failed to load failed attempts', err);
        }
    };

    const loadDetailedAttendance = useCallback(async () => {
        try {
            const data = await api.getDetailedAttendance(selectedDate);
            setDetailedAttendance(data);
        } catch (err) {
            console.error('Failed to load detailed attendance', err);
        }
    }, [selectedDate]);

    const loadHolidays = async () => {
        try {
            const data = await api.getHolidays();
            setHolidays(data.holidays || []);
        } catch (err) {
            console.error('Failed to load holidays', err);
        }
    };

    const loadSettings = async () => {
        try {
            const data = await api.getAcademicYearSettings();
            setAcademicYearSettings(data);
            setSettingsForm({
                start_date: data.start_date,
                end_date: data.end_date,
            });
        } catch (err) {
            console.error('Failed to load settings', err);
        }
    };

    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            loadDashboard(),
            loadDetailedAttendance(),
            loadPendingPhotos(),
            loadGeofences(),
            loadWindows(),
            loadFailedAttempts(),
            loadHolidays(),
            loadSettings(),
        ]);
        setLoading(false);
    }, [loadDashboard, loadDetailedAttendance]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        loadDashboard();
        loadDetailedAttendance();
    }, [loadDashboard, loadDetailedAttendance, selectedDate]);

    // Auto-dismiss errors after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleApprovePhoto = async (photoId: number) => {
        try {
            await api.reviewProfilePhoto(photoId, true);
            await loadPendingPhotos();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRejectPhoto = async (photoId: number) => {
        try {
            await api.reviewProfilePhoto(photoId, false, rejectionReason || 'Rejected by admin');
            setReviewingPhoto(null);
            setRejectionReason('');
            await loadPendingPhotos();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleCreateGeofence = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); // Clear any previous errors
        try {
            await api.createGeofence({
                name: geofenceForm.name,
                description: geofenceForm.description || undefined,
                latitude: parseFloat(geofenceForm.latitude),
                longitude: parseFloat(geofenceForm.longitude),
                radius_meters: parseFloat(geofenceForm.radius_meters),
                accuracy_threshold: parseFloat(geofenceForm.accuracy_threshold),
                is_primary: geofenceForm.is_primary,
            });
            setShowGeofenceForm(false);
            setGeofenceForm({
                name: '',
                description: '',
                latitude: '',
                longitude: '',
                radius_meters: '500',
                accuracy_threshold: '50',
                is_primary: false,
            });
            await loadGeofences();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteGeofence = async (id: number) => {
        if (!confirm('Are you sure you want to delete this geofence?')) return;
        try {
            await api.deleteGeofence(id);
            await loadGeofences();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleCreateWindow = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createAttendanceWindow({
                name: windowForm.name,
                start_time: windowForm.start_time,
                end_time: windowForm.end_time,
                days_of_week: windowForm.days_of_week,
            });
            setShowWindowForm(false);
            setWindowForm({
                name: '',
                start_time: '09:00',
                end_time: '10:00',
                days_of_week: [0, 1, 2, 3, 4, 5],
            });
            await loadWindows();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteWindow = async (id: number) => {
        if (!confirm('Are you sure you want to delete this attendance window?')) return;
        try {
            await api.deleteAttendanceWindow(id);
            await loadWindows();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!holidayForm.date || !holidayForm.name) {
            setError('Date and name are required');
            return;
        }
        try {
            await api.createHoliday({
                date: holidayForm.date,
                name: holidayForm.name,
                description: holidayForm.description || undefined,
                holiday_type: holidayForm.holiday_type,
                is_recurring: holidayForm.is_recurring,
            });
            setShowHolidayForm(false);
            setHolidayForm({
                date: '',
                name: '',
                description: '',
                holiday_type: 'GENERAL',
                is_recurring: false,
            });
            await loadHolidays();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteHoliday = async (id: number) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            await api.deleteHoliday(id);
            await loadHolidays();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleBulkPaste = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkPasteText.trim()) {
            setError('Please paste holiday text');
            return;
        }
        try {
            const result = await api.bulkCreateHolidays(bulkPasteText, bulkPasteYear);
            setBulkResult(result);
            if (result.created_count > 0) {
                await loadHolidays();
            }
            if (result.error_count === 0) {
                setBulkPasteText('');
                setShowBulkPaste(false);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settingsForm.start_date || !settingsForm.end_date) {
            setError('Both start and end dates are required');
            return;
        }
        try {
            const result = await api.updateAcademicYearSettings(
                settingsForm.start_date,
                settingsForm.end_date
            );
            setAcademicYearSettings(result);
            setError(null);
            alert('Academic year settings saved successfully!');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const formatFailureReason = (reason: string) => {
        const reasonMap: Record<string, string> = {
            'OUTSIDE_CAMPUS': 'Outside campus',
            'GPS_DISABLED': 'GPS disabled',
            'LOW_GPS_ACCURACY': 'Low GPS accuracy',
            'FACE_MISMATCH': 'Face mismatch',
            'MULTIPLE_FACES': 'Multiple faces',
            'NO_FACE_DETECTED': 'No face detected',
            'PROFILE_NOT_APPROVED': 'Profile not approved',
            'OUTSIDE_TIME_WINDOW': 'Outside time window',
        };
        return reasonMap[reason] || reason;
    };

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const tabs: { key: Tab; label: string; badge?: number }[] = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'students', label: 'Student Details', badge: detailedAttendance?.absent_count || 0 },
        { key: 'calendar', label: 'Working Calendar', badge: holidays.length },
        { key: 'settings', label: '⚙️ Settings' },
        { key: 'photos', label: 'Profile Photos', badge: pendingPhotos.length },
        { key: 'geofences', label: 'Geofences' },
        { key: 'windows', label: 'Time Windows' },
        { key: 'failures', label: 'Failed Attempts', badge: failedAttempts.length },
    ];

    // Filter students based on search and status filter
    const filteredStudents = detailedAttendance?.students.filter(student => {
        const matchesSearch = searchQuery === '' ||
            student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.register_number?.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = studentFilter === 'all' ||
            (studentFilter === 'present' && student.status === 'PRESENT') ||
            (studentFilter === 'absent' && student.status === 'ABSENT') ||
            (studentFilter === 'pending' && student.status === 'PENDING');
        return matchesSearch && matchesFilter;
    }) || [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Attendance Data...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <CalendarCheck size={28} weight="duotone" className="text-cyan-400" />
                        Attendance Management
                    </h1>
                    <p className="text-slate-500 mt-1">Track student attendance, manage geofences and time windows</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-950/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-xl flex justify-between items-center">
                    <span className="flex items-center gap-2"><WarningIcon size={18} weight="duotone" /> {error}</span>
                    <button onClick={() => setError(null)} className="ml-4 font-bold text-xl hover:text-red-100">&times;</button>
                </div>
            )}

            {/* Tabs - Faculty Locations Style */}
            <div className="flex gap-2 flex-wrap">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.key
                            ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                        {tab.badge && tab.badge > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-md font-bold min-w-[20px] text-center">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <label className="text-slate-400 text-sm uppercase tracking-wider font-mono">Date:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-800/60 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-mono mb-2">Total Students</p>
                                <p className="text-3xl font-bold text-slate-200 font-mono">
                                    {stats.total_students}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-green-950/40 to-green-900/20 border border-green-800/50 rounded-xl p-6">
                                <p className="text-green-400 text-[10px] uppercase tracking-widest font-mono mb-2">Present</p>
                                <p className="text-3xl font-bold text-green-400 font-mono">
                                    {stats.present_count}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-red-950/40 to-red-900/20 border border-red-800/50 rounded-xl p-6">
                                <p className="text-red-400 text-[10px] uppercase tracking-widest font-mono mb-2">Absent</p>
                                <p className="text-3xl font-bold text-red-400 font-mono">
                                    {stats.absent_count}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-cyan-950/40 to-cyan-900/20 border border-cyan-800/50 rounded-xl p-6">
                                <p className="text-cyan-400 text-[10px] uppercase tracking-widest font-mono mb-2">Attendance Rate</p>
                                <p className="text-3xl font-bold text-cyan-400 font-mono">
                                    {stats.attendance_percentage.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Student Details Tab */}
            {activeTab === 'students' && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                            <Users size={20} weight="duotone" className="text-cyan-400" />
                            Student Attendance Details
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Date Picker */}
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 focus:outline-none focus:border-cyan-500"
                            />
                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search by name or reg no..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                            />
                            {/* Filter */}
                            <select
                                value={studentFilter}
                                onChange={(e) => setStudentFilter(e.target.value as 'all' | 'present' | 'absent' | 'pending')}
                                className="px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 focus:outline-none focus:border-cyan-500"
                            >
                                <option value="all">All Students</option>
                                <option value="present">Present Only</option>
                                <option value="absent">Absent Only</option>
                                <option value="pending">Pending Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    {detailedAttendance && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-200 font-mono">{detailedAttendance.total_students}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Total</p>
                            </div>
                            <div className="bg-green-950/40 border border-green-800/40 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-green-400 font-mono">{detailedAttendance.present_count}</p>
                                <p className="text-[10px] text-green-500 uppercase tracking-widest font-mono">Present</p>
                            </div>
                            <div className="bg-yellow-950/40 border border-yellow-800/40 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-yellow-400 font-mono">{detailedAttendance.pending_count || 0}</p>
                                <p className="text-[10px] text-yellow-500 uppercase tracking-widest font-mono">Not Marked</p>
                            </div>
                            <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-red-400 font-mono">{detailedAttendance.absent_count}</p>
                                <p className="text-[10px] text-red-500 uppercase tracking-widest font-mono">Absent</p>
                            </div>
                        </div>
                    )}

                    {/* Students Table */}
                    {filteredStudents.length === 0 ? (
                        <div className="text-slate-500 text-center py-12 border-2 border-dashed border-slate-800 rounded-xl relative overflow-hidden">
                            <Sparkle size={80} weight="duotone" className="absolute -right-2 -bottom-2 text-slate-800/30" />
                            <Users size={48} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                            <p>{searchQuery || studentFilter !== 'all'
                                ? 'No students match your search/filter criteria'
                                : 'No student data available for this date'}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-slate-700/60">
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">#</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Name</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Register No.</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Department</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Status</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Marked At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredStudents.map((student, index) => (
                                        <tr key={student.student_id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 text-slate-500 font-mono">
                                                {index + 1}
                                            </td>
                                            <td className="py-3 text-slate-200 font-medium">
                                                {student.student_name}
                                            </td>
                                            <td className="py-3 text-slate-400 font-mono text-sm">
                                                {student.register_number || '-'}
                                            </td>
                                            <td className="py-3 text-slate-400">
                                                {student.department || '-'}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${student.status === 'PRESENT'
                                                    ? 'bg-green-950/40 text-green-400 border border-green-800/50'
                                                    : student.status === 'PENDING'
                                                        ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/50'
                                                        : 'bg-red-950/40 text-red-400 border border-red-800/50'
                                                    }`}>
                                                    {student.status === 'PENDING' ? 'Not Marked Yet' : student.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-500 text-sm font-mono">
                                                {student.marked_at
                                                    ? new Date(student.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                        <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                            <Calendar size={20} weight="duotone" className="text-orange-400" />
                            Working Day Calendar
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowHolidayForm(!showHolidayForm)}
                                className="px-4 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                            >
                                {showHolidayForm ? 'Cancel' : '+ Add Holiday'}
                            </button>
                            <button
                                onClick={() => { setShowBulkPaste(!showBulkPaste); setShowHolidayForm(false); setBulkResult(null); }}
                                className="px-4 py-2.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                            >
                                {showBulkPaste ? 'Cancel' : '📋 Bulk Paste'}
                            </button>
                        </div>
                    </div>

                    {/* Holiday Form */}
                    {showHolidayForm && (
                        <form onSubmit={handleCreateHoliday} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={holidayForm.date}
                                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-800/60 text-slate-200 focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                                        Holiday Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={holidayForm.name}
                                        onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                                        placeholder="e.g., Republic Day"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-800/60 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                                        Type
                                    </label>
                                    <select
                                        value={holidayForm.holiday_type}
                                        onChange={(e) => setHolidayForm({ ...holidayForm, holiday_type: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-800/60 text-slate-200 focus:outline-none focus:border-orange-500"
                                    >
                                        <option value="GENERAL">General</option>
                                        <option value="NATIONAL">National Holiday</option>
                                        <option value="EXAM">Exam Day</option>
                                        <option value="VACATION">Vacation</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={holidayForm.description}
                                        onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                                        placeholder="Optional description"
                                        className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-800/60 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center mt-4">
                                <input
                                    type="checkbox"
                                    id="is_recurring"
                                    checked={holidayForm.is_recurring}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, is_recurring: e.target.checked })}
                                    className="mr-2 accent-orange-500"
                                />
                                <label htmlFor="is_recurring" className="text-sm text-slate-400">
                                    Recurring annually
                                </label>
                            </div>
                            <div className="mt-4">
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                                >
                                    Save Holiday
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Bulk Paste Form */}
                    {showBulkPaste && (
                        <form onSubmit={handleBulkPaste} className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 mb-6">
                            <h3 className="text-sm font-chivo font-bold uppercase tracking-wider text-blue-300 mb-2">
                                📋 Bulk Import Holidays
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">
                                Paste holiday list with format: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs">Date, Day, Holiday Name</code> (one per line)
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                <div className="md:col-span-3">
                                    <textarea
                                        value={bulkPasteText}
                                        onChange={(e) => setBulkPasteText(e.target.value)}
                                        placeholder={`Example:\nJan 1\tMonday\tNew Year\nJan 26\tSunday\tRepublic Day\nAug 15\tFriday\tIndependence Day`}
                                        rows={6}
                                        className="w-full px-4 py-3 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                                        Year
                                    </label>
                                    <input
                                        type="number"
                                        value={bulkPasteYear}
                                        onChange={(e) => setBulkPasteYear(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="submit"
                                        className="mt-3 w-full px-4 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                                    >
                                        Import Holidays
                                    </button>
                                </div>
                            </div>
                            {bulkResult && (
                                <div className="mt-3 space-y-2">
                                    {bulkResult.created.length > 0 && (
                                        <div className="bg-green-950/40 border border-green-800/40 text-green-400 p-3 rounded-xl text-sm font-medium">
                                            <CheckCircle size={16} weight="duotone" className="inline mr-2" />
                                            Created {bulkResult.created.length} holidays
                                        </div>
                                    )}
                                    {bulkResult.errors.length > 0 && (
                                        <div className="bg-red-950/40 border border-red-800/40 text-red-400 p-3 rounded-xl text-sm">
                                            <WarningIcon size={16} weight="duotone" className="inline mr-2" />
                                            {bulkResult.errors.length} errors:
                                            <ul className="list-disc ml-6 mt-2">
                                                {bulkResult.errors.slice(0, 5).map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                                {bulkResult.errors.length > 5 && <li>...and {bulkResult.errors.length - 5} more</li>}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    )}

                    {/* Holidays List */}
                    {holidays.length === 0 ? (
                        <div className="text-slate-500 text-center py-12 border-2 border-dashed border-slate-800 rounded-xl relative overflow-hidden">
                            <Sparkle size={80} weight="duotone" className="absolute -right-2 -bottom-2 text-slate-800/30" />
                            <Calendar size={48} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                            <p>No holidays configured. Add holidays to mark non-working days.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-slate-700/60">
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Date</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Name</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Type</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Recurring</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {holidays.map((holiday) => (
                                        <tr key={holiday.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 text-slate-200 font-mono text-sm">
                                                {new Date(holiday.date).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="py-3 text-slate-200 font-medium">
                                                {holiday.name}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${holiday.holiday_type === 'NATIONAL'
                                                    ? 'bg-purple-950/40 text-purple-400 border border-purple-800/50'
                                                    : holiday.holiday_type === 'EXAM'
                                                        ? 'bg-orange-950/40 text-orange-400 border border-orange-800/50'
                                                        : holiday.holiday_type === 'VACATION'
                                                            ? 'bg-blue-950/40 text-blue-400 border border-blue-800/50'
                                                            : 'bg-slate-800/60 text-slate-400 border border-slate-700/50'
                                                    }`}>
                                                    {holiday.holiday_type}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-400 font-mono text-sm">
                                                {holiday.is_recurring ? '🔄 Yes' : 'No'}
                                            </td>
                                            <td className="py-3">
                                                <button
                                                    onClick={() => handleDeleteHoliday(holiday.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                                                >
                                                    <Trash size={16} weight="duotone" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 mb-6 flex items-center gap-2">
                        <Gear size={20} weight="duotone" className="text-purple-400" />
                        Attendance Settings
                    </h2>

                    {/* Academic Year Settings */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                            Academic Year Period
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Configure the start and end dates for the academic year. Student attendance statistics will be calculated for this period.
                        </p>

                        {academicYearSettings && (
                            <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-4 mb-4">
                                <p className="text-sm text-purple-300">
                                    <strong>Current Period:</strong>{' '}
                                    {new Date(academicYearSettings.start_date).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    })} → {new Date(academicYearSettings.end_date).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSaveSettings} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={settingsForm.start_date}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, start_date: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 focus:outline-none focus:border-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={settingsForm.end_date}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, end_date: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 focus:outline-none focus:border-purple-500"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                            >
                                Save Settings
                            </button>
                        </form>
                    </div>

                    {/* Quick Presets */}
                    <div className="border-t border-slate-700/40 pt-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                            Quick Presets
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    const year = new Date().getFullYear();
                                    setSettingsForm({
                                        start_date: `${year}-01-01`,
                                        end_date: `${year}-12-31`,
                                    });
                                }}
                                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-xs font-bold uppercase tracking-wider"
                            >
                                Calendar Year {new Date().getFullYear()}
                            </button>
                            <button
                                onClick={() => {
                                    const year = new Date().getFullYear();
                                    const month = new Date().getMonth();
                                    const startYear = month >= 6 ? year : year - 1;
                                    setSettingsForm({
                                        start_date: `${startYear}-07-01`,
                                        end_date: `${startYear + 1}-06-30`,
                                    });
                                }}
                                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-xs font-bold uppercase tracking-wider"
                            >
                                Academic Year (Jul - Jun)
                            </button>
                            <button
                                onClick={() => {
                                    const year = new Date().getFullYear();
                                    const month = new Date().getMonth();
                                    const startYear = month >= 5 ? year : year - 1;
                                    setSettingsForm({
                                        start_date: `${startYear}-06-01`,
                                        end_date: `${startYear + 1}-05-31`,
                                    });
                                }}
                                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-xs font-bold uppercase tracking-wider"
                            >
                                Academic Year (Jun - May)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Photos Tab */}
            {activeTab === 'photos' && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
                        <Image size={20} weight="duotone" className="text-pink-400" />
                        Pending Profile Photos
                    </h2>
                    {pendingPhotos.length === 0 ? (
                        <div className="text-slate-500 text-center py-12 border-2 border-dashed border-slate-800 rounded-xl relative overflow-hidden">
                            <Sparkle size={80} weight="duotone" className="absolute -right-2 -bottom-2 text-slate-800/30" />
                            <Image size={48} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                            <p>No pending photos to review</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingPhotos.map((photo) => (
                                <div key={photo.id} className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 hover:border-pink-500/50 transition-all">
                                    <div className="aspect-square bg-slate-800 rounded-xl mb-3 overflow-hidden relative group">
                                        <img
                                            src={`http://localhost:8000/static/profile_photos/${photo.filename}`}
                                            alt={`Student ${photo.student_id}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-800"><span class="text-4xl">👤</span></div>';
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
                                        Student ID: <span className="text-slate-300">{photo.student_id}</span>
                                    </p>

                                    {reviewingPhoto === photo.id ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                placeholder="Rejection reason"
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-slate-700/60 rounded-xl bg-slate-900/60 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                                            />
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleRejectPhoto(photo.id)}
                                                    className="flex-1 px-3 py-2 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setReviewingPhoto(null)}
                                                    className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-700 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleApprovePhoto(photo.id)}
                                                className="flex-1 px-3 py-2.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02]"
                                            >
                                                <CheckCircle size={14} weight="duotone" className="inline mr-1" /> Approve
                                            </button>
                                            <button
                                                onClick={() => setReviewingPhoto(photo.id)}
                                                className="flex-1 px-3 py-2.5 bg-red-950/40 border border-red-800/50 text-red-400 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-red-900/40 transition-colors"
                                            >
                                                <XCircle size={14} weight="duotone" className="inline mr-1" /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Geofences Tab */}
            {activeTab === 'geofences' && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                            <Crosshair size={20} weight="duotone" className="text-green-400" />
                            Campus Geofences
                        </h2>
                        <button
                            onClick={() => setShowGeofenceForm(!showGeofenceForm)}
                            className="px-4 py-2.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            <Plus size={16} weight="bold" className="inline mr-1" /> Add Geofence
                        </button>
                    </div>

                    {showGeofenceForm && (
                        <form onSubmit={handleCreateGeofence} className="mb-6 p-4 bg-slate-900/60 border border-slate-700/40 rounded-xl space-y-4">
                            {/* Use My Location Button */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition(
                                                (position) => {
                                                    setGeofenceForm({
                                                        ...geofenceForm,
                                                        latitude: position.coords.latitude.toFixed(6),
                                                        longitude: position.coords.longitude.toFixed(6)
                                                    });
                                                },
                                                (err) => {
                                                    setError('Could not get location: ' + err.message);
                                                },
                                                { enableHighAccuracy: true }
                                            );
                                        } else {
                                            setError('Geolocation is not supported by your browser');
                                        }
                                    }}
                                    className="px-4 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-[1.02]"
                                >
                                    <MapPin size={16} weight="duotone" /> Use My Current Location
                                </button>
                            </div>

                            {/* Interactive Map */}
                            <GeofenceMap
                                center={[
                                    parseFloat(geofenceForm.latitude) || 0,
                                    parseFloat(geofenceForm.longitude) || 0
                                ]}
                                radius={parseFloat(geofenceForm.radius_meters) || 500}
                                onLocationSelect={(lat, lng) => {
                                    setGeofenceForm({
                                        ...geofenceForm,
                                        latitude: lat.toFixed(6),
                                        longitude: lng.toFixed(6)
                                    });
                                }}
                                existingGeofences={geofences}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Name (e.g., Main Campus)"
                                    value={geofenceForm.name}
                                    onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                                    required
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <input
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={geofenceForm.description}
                                    onChange={(e) => setGeofenceForm({ ...geofenceForm, description: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Radius slider */}
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Radius: {geofenceForm.radius_meters} meters
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="2000"
                                    step="50"
                                    value={geofenceForm.radius_meters}
                                    onChange={(e) => setGeofenceForm({ ...geofenceForm, radius_meters: e.target.value })}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>50m</span>
                                    <span>500m</span>
                                    <span>1000m</span>
                                    <span>2000m</span>
                                </div>
                            </div>

                            {/* GPS Accuracy Threshold */}
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    GPS Accuracy Threshold: {geofenceForm.accuracy_threshold}m
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={geofenceForm.accuracy_threshold}
                                    onChange={(e) => setGeofenceForm({ ...geofenceForm, accuracy_threshold: e.target.value })}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Students with GPS accuracy worse than this will be rejected
                                </p>
                            </div>

                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={geofenceForm.is_primary}
                                    onChange={(e) => setGeofenceForm({ ...geofenceForm, is_primary: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Set as primary geofence</span>
                            </label>

                            <div className="flex space-x-2">
                                <button
                                    type="submit"
                                    disabled={!geofenceForm.latitude || !geofenceForm.longitude || !geofenceForm.name}
                                    className="px-5 py-2.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                                >
                                    Create Geofence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGeofenceForm(false)}
                                    className="px-5 py-2.5 bg-slate-800/60 border border-slate-700/60 text-slate-400 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {geofences.length === 0 ? (
                        <div className="text-slate-500 text-center py-12 border-2 border-dashed border-slate-800 rounded-xl relative overflow-hidden">
                            <Sparkle size={80} weight="duotone" className="absolute -right-2 -bottom-2 text-slate-800/30" />
                            <Crosshair size={48} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                            <p>No geofences configured. Add one to enable attendance.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {geofences.map((geofence) => (
                                <div
                                    key={geofence.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${geofence.is_primary
                                        ? 'border-green-500/50 bg-green-950/30'
                                        : 'border-slate-700/60 bg-slate-900/40 hover:border-green-500/30'
                                        }`}
                                >
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-slate-200">
                                                {geofence.name}
                                            </span>
                                            {geofence.is_primary && (
                                                <span className="px-2.5 py-0.5 text-xs bg-green-600 text-white rounded-lg font-bold uppercase tracking-wider">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-mono text-slate-500 mt-1">
                                            {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)} •
                                            Radius: {geofence.radius_meters}m
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteGeofence(geofence.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                                    >
                                        <Trash size={16} weight="duotone" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Attendance Windows Tab */}
            {activeTab === 'windows' && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                            <Clock size={20} weight="duotone" className="text-yellow-400" />
                            Attendance Time Windows
                        </h2>
                        <button
                            onClick={() => setShowWindowForm(!showWindowForm)}
                            className="px-4 py-2.5 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                        >
                            + Add Window
                        </button>
                    </div>

                    {showWindowForm && (
                        <form onSubmit={handleCreateWindow} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder="Window Name"
                                    value={windowForm.name}
                                    onChange={(e) => setWindowForm({ ...windowForm, name: e.target.value })}
                                    required
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <input
                                    type="time"
                                    value={windowForm.start_time}
                                    onChange={(e) => setWindowForm({ ...windowForm, start_time: e.target.value })}
                                    required
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <input
                                    type="time"
                                    value={windowForm.end_time}
                                    onChange={(e) => setWindowForm({ ...windowForm, end_time: e.target.value })}
                                    required
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Days of Week</label>
                                <div className="flex flex-wrap gap-2">
                                    {dayNames.map((day, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                const days = windowForm.days_of_week.includes(index)
                                                    ? windowForm.days_of_week.filter(d => d !== index)
                                                    : [...windowForm.days_of_week, index].sort();
                                                setWindowForm({ ...windowForm, days_of_week: days });
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${windowForm.days_of_week.includes(index)
                                                ? 'bg-yellow-600 text-white'
                                                : 'bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button type="submit" className="px-5 py-2.5 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]">
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowWindowForm(false)}
                                    className="px-5 py-2.5 bg-slate-800/60 border border-slate-700/60 text-slate-400 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {windows.length === 0 ? (
                        <div className="text-slate-500 text-center py-12 border-2 border-dashed border-slate-800 rounded-xl relative overflow-hidden">
                            <Sparkle size={80} weight="duotone" className="absolute -right-2 -bottom-2 text-slate-800/30" />
                            <Clock size={48} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                            <p>No time windows configured. Add one to enable attendance.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {windows.map((window) => (
                                <div
                                    key={window.id}
                                    className="flex items-center justify-between p-4 rounded-xl border border-slate-700/60 bg-slate-900/40 hover:border-yellow-500/30 transition-all"
                                >
                                    <div>
                                        <span className="font-medium text-slate-200">
                                            {window.name}
                                        </span>
                                        <p className="text-xs font-mono text-slate-500 mt-1">
                                            {window.start_time} - {window.end_time} •
                                            {window.days_of_week.map(d => dayNames[d]).join(', ')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteWindow(window.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                                    >
                                        <Trash size={16} weight="duotone" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Failed Attempts Tab */}
            {activeTab === 'failures' && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
                        <WarningIcon size={20} weight="duotone" className="text-red-400" />
                        Failed Attendance Attempts
                    </h2>
                    {failedAttempts.length === 0 ? (
                        <div className="text-slate-500 text-center py-12 border-2 border-dashed border-slate-800 rounded-xl relative overflow-hidden">
                            <Sparkle size={80} weight="duotone" className="absolute -right-2 -bottom-2 text-slate-800/30" />
                            <CheckCircle size={48} weight="duotone" className="mx-auto mb-4 text-green-600" />
                            <p>No failed attempts recorded</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-slate-700/60">
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Time</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Student ID</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Reason</th>
                                        <th className="pb-3 text-slate-500 text-[10px] uppercase tracking-widest font-mono">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {failedAttempts.map((attempt) => (
                                        <tr key={attempt.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 text-slate-200 font-mono text-sm">
                                                {new Date(attempt.attempted_at).toLocaleString()}
                                            </td>
                                            <td className="py-3 text-slate-300 font-mono">
                                                {attempt.student_id}
                                            </td>
                                            <td className="py-3">
                                                <span className="px-2.5 py-1 bg-red-950/40 border border-red-800/50 text-red-400 rounded-lg text-xs font-bold">
                                                    {formatFailureReason(attempt.failure_reason)}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-500 text-sm font-mono">
                                                {attempt.failure_details || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
