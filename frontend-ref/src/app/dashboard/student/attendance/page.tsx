'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Pulse, CheckCircle, XCircle, MapPin, Camera, User, Clock, CalendarBlank, Warning, Sparkle } from '@phosphor-icons/react';

interface PreCheckResult {
    can_mark: boolean;
    blockers: string[];
    profile_approved: boolean;
    within_time_window: boolean;
    already_marked_today: boolean;
}

interface ProfilePhoto {
    id: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejection_reason?: string;
    created_at: string;
}

interface AttendanceRecord {
    id: number;
    attendance_date: string;
    status: 'PRESENT' | 'ABSENT' | 'PENDING';
    marked_at?: string;
    face_match_confidence?: number;
}

interface AttendanceAttempt {
    id: number;
    attempted_at: string;
    success: boolean;
    failure_reason?: string;
    failure_details?: string;
}

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
}

interface Holiday {
    id: number;
    date: string;
    name: string;
    holiday_type: string;
}

interface AttendanceStats {
    student_id: number;
    student_name: string;
    register_number?: string;
    start_date: string;
    end_date: string;
    total_working_days: number;
    holidays_count: number;
    present_days: number;
    absent_days: number;
    attendance_percentage: number;
    recent_records: AttendanceRecord[];
    holidays: Holiday[];
}

type Step = 'idle' | 'location' | 'camera' | 'processing' | 'result';

export default function AttendancePage() {
    const router = useRouter();
    const [preCheck, setPreCheck] = useState<PreCheckResult | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<ProfilePhoto | null>(null);
    const [todayStatus, setTodayStatus] = useState<AttendanceRecord | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [attempts, setAttempts] = useState<AttendanceAttempt[]>([]);
    const [stats, setStats] = useState<AttendanceStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Attendance capture state
    const [step, setStep] = useState<Step>('idle');
    const [location, setLocation] = useState<LocationData | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<File | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [resultSuccess, setResultSuccess] = useState<boolean>(false);

    // Camera refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [preCheckData, photoData, todayData, historyData, attemptsData, statsData] = await Promise.all([
                api.getAttendancePreCheck().catch(() => null),
                api.getProfilePhotoStatus().catch(() => null),
                api.getTodayAttendance().catch(() => null),
                api.getAttendanceHistory().catch(() => ({ records: [] })),
                api.getAttendanceAttempts().catch(() => ({ attempts: [] })),
                api.getMyAttendanceStats().catch(() => null),
            ]);

            setPreCheck(preCheckData);
            setProfilePhoto(photoData);
            setTodayStatus(todayData);
            setHistory(historyData?.records || []);
            setAttempts(attemptsData?.attempts || []);
            setStats(statsData);
        } catch (err) {
            setError('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startAttendanceFlow = async () => {
        setStep('location');
        setLocationError(null);
        setError(null);

        // Request GPS location
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                // Automatically proceed to camera step
                startCamera();
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setLocationError('Location permission denied. Please enable location access.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setLocationError('Location unavailable. Please try again.');
                        break;
                    case err.TIMEOUT:
                        setLocationError('Location request timed out. Please try again.');
                        break;
                    default:
                        setLocationError('Failed to get location. Please try again.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const startCamera = async () => {
        setStep('camera');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError('Failed to access camera. Please allow camera access.');
            setStep('idle');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `attendance_${Date.now()}.jpg`, { type: 'image/jpeg' });
                setCapturedImage(file);

                // Stop camera
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                // Submit attendance
                submitAttendance(file);
            }
        }, 'image/jpeg', 0.9);
    };

    const submitAttendance = async (imageFile: File) => {
        if (!location) {
            setError('Location not available');
            setStep('idle');
            return;
        }

        setStep('processing');

        try {
            const result = await api.markAttendance(
                imageFile,
                location.latitude,
                location.longitude,
                location.accuracy
            );

            setResultSuccess(result.success);
            setResultMessage(result.message);
            setStep('result');

            // Reload data after successful marking
            if (result.success) {
                await loadData();
            }
        } catch (err: any) {
            setResultSuccess(false);
            setResultMessage(err.message || 'Attendance marking failed');
            setStep('result');
        }
    };

    const resetFlow = () => {
        setStep('idle');
        setLocation(null);
        setLocationError(null);
        setCapturedImage(null);
        setResultMessage(null);
        setResultSuccess(false);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatFailureReason = (reason: string) => {
        const reasonMap: Record<string, string> = {
            'OUTSIDE_CAMPUS': 'Outside campus boundary',
            'GPS_DISABLED': 'GPS disabled',
            'LOW_GPS_ACCURACY': 'Low GPS accuracy',
            'FACE_MISMATCH': 'Face mismatch',
            'MULTIPLE_FACES': 'Multiple faces detected',
            'NO_FACE_DETECTED': 'No face detected',
            'PROFILE_NOT_APPROVED': 'Profile not approved',
            'OUTSIDE_TIME_WINDOW': 'Outside attendance window',
            'ALREADY_MARKED': 'Already marked',
            'IMAGE_QUALITY_POOR': 'Poor image quality',
            'FACE_OBSTRUCTED': 'Face obstructed',
        };
        return reasonMap[reason] || reason;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Attendance...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <CalendarBlank size={28} weight="duotone" className="text-emerald-400" />
                    Attendance
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Mark your daily attendance with face verification</p>
            </div>

            {error && (
                <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-4 flex items-center gap-3">
                    <XCircle size={22} weight="fill" className="text-red-400 flex-shrink-0" />
                    <span className="text-red-300 flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                        <XCircle size={18} />
                    </button>
                </div>
            )}

            {/* Profile Photo Section */}
            {!profilePhoto || profilePhoto.status !== 'APPROVED' ? (
                <div className="bg-gradient-to-r from-amber-950/30 to-orange-950/20 border border-amber-800/30 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-amber-800/30" />
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-amber-300 mb-4 flex items-center gap-2 relative z-10">
                        <Camera size={20} weight="duotone" />
                        Profile Photo Required
                    </h2>

                    {!profilePhoto && (
                        <div className="relative z-10">
                            <p className="text-amber-400/80 mb-4">
                                Upload a clear face photo for identity verification. This will be used during attendance.
                            </p>
                            <button
                                onClick={() => router.push('/dashboard/student/profile')}
                                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                            >
                                Go to Profile
                            </button>
                        </div>
                    )}

                    {profilePhoto?.status === 'PENDING' && (
                        <div className="flex items-center gap-3 text-amber-400 relative z-10">
                            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                            <span>Your photo is pending admin approval</span>
                        </div>
                    )}

                    {profilePhoto?.status === 'REJECTED' && (
                        <div className="relative z-10">
                            <p className="text-red-400 mb-3 flex items-center gap-2">
                                <Warning size={18} weight="fill" />
                                Rejected: {profilePhoto.rejection_reason || 'No reason provided'}
                            </p>
                            <button
                                onClick={() => router.push('/dashboard/student/profile')}
                                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                            >
                                Upload New Photo
                            </button>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Today's Status Card */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Clock size={20} weight="duotone" className="text-emerald-400" />
                    Today's Attendance
                </h2>

                {todayStatus?.status === 'PRESENT' ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-green-950/50 border border-green-700/40 rounded-xl flex items-center justify-center">
                                <CheckCircle size={32} weight="fill" className="text-green-400" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-green-400 uppercase tracking-wider">Present</p>
                                <p className="text-sm text-slate-500 font-mono">
                                    Marked at {todayStatus.marked_at ? formatTime(todayStatus.marked_at) : 'N/A'}
                                </p>
                            </div>
                        </div>
                        {todayStatus.face_match_confidence && (
                            <div className="text-right bg-slate-900/50 border border-slate-700/40 rounded-xl px-4 py-3">
                                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Confidence</p>
                                <p className="font-black text-xl text-slate-100">
                                    {(todayStatus.face_match_confidence * 100).toFixed(1)}%
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-700/50 rounded-xl flex items-center justify-center">
                                <User size={32} weight="duotone" className="text-slate-500" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-300">Not Marked Yet</p>
                                <p className="text-sm text-slate-500">Mark your attendance now</p>
                            </div>
                        </div>

                        {/* Pre-check blockers */}
                        {preCheck && !preCheck.can_mark && preCheck.blockers.length > 0 && (
                            <div className="bg-red-950/30 border border-red-700/40 rounded-xl p-4">
                                <p className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                                    <Warning size={18} weight="fill" />
                                    Cannot mark attendance:
                                </p>
                                <ul className="text-sm text-red-300 space-y-1">
                                    {preCheck.blockers.map((blocker, i) => (
                                        <li key={i}>• {blocker}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Mark Attendance Button */}
                        {preCheck?.can_mark && step === 'idle' && (
                            <button
                                onClick={startAttendanceFlow}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-lg uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Camera size={24} weight="duotone" className="inline mr-2" />
                                Mark Attendance
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Attendance Capture Modal/Flow */}
            {step !== 'idle' && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">

                        {/* Location Step */}
                        {step === 'location' && (
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-5 bg-blue-950/50 border border-blue-700/40 rounded-xl flex items-center justify-center">
                                    <MapPin size={32} weight="duotone" className="text-blue-400 animate-pulse" />
                                </div>
                                <h3 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-100 mb-2">
                                    Getting Location
                                </h3>
                                <p className="text-slate-500 mb-5">
                                    Please wait while we verify your location...
                                </p>

                                {locationError && (
                                    <div className="bg-red-950/30 border border-red-700/40 text-red-300 p-4 rounded-xl mb-5 flex items-center gap-3">
                                        <Warning size={20} weight="fill" className="text-red-400 flex-shrink-0" />
                                        {locationError}
                                    </div>
                                )}

                                <button
                                    onClick={resetFlow}
                                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Camera Step */}
                        {step === 'camera' && (
                            <div>
                                <h3 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-100 mb-4 text-center flex items-center justify-center gap-2">
                                    <Camera size={22} weight="duotone" className="text-emerald-400" />
                                    Take Your Photo
                                </h3>

                                {location && (
                                    <div className="text-center text-sm text-green-400 mb-4 flex items-center justify-center gap-2">
                                        <CheckCircle size={18} weight="fill" />
                                        Location verified (accuracy: {location.accuracy.toFixed(0)}m)
                                    </div>
                                )}

                                <div className="relative bg-black rounded-xl overflow-hidden mb-5 border-2 border-slate-700">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full aspect-[4/3] object-cover"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={resetFlow}
                                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={capturePhoto}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Camera size={20} weight="duotone" />
                                        Capture
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Processing Step */}
                        {step === 'processing' && (
                            <div className="text-center py-8">
                                <div className="relative w-16 h-16 mx-auto mb-5">
                                    <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
                                    <Pulse size={28} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
                                </div>
                                <h3 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-100 mb-2">
                                    Verifying...
                                </h3>
                                <p className="text-slate-500">
                                    Please wait while we verify your identity
                                </p>
                            </div>
                        )}

                        {/* Result Step */}
                        {step === 'result' && (
                            <div className="text-center">
                                <div className={`w-20 h-20 mx-auto mb-5 rounded-xl flex items-center justify-center ${resultSuccess
                                    ? 'bg-green-950/50 border border-green-700/40'
                                    : 'bg-red-950/50 border border-red-700/40'
                                    }`}>
                                    {resultSuccess
                                        ? <CheckCircle size={48} weight="fill" className="text-green-400" />
                                        : <XCircle size={48} weight="fill" className="text-red-400" />
                                    }
                                </div>
                                <h3 className={`text-lg font-chivo font-bold uppercase tracking-wider mb-2 ${resultSuccess
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                    }`}>
                                    {resultSuccess ? 'Attendance Marked!' : 'Verification Failed'}
                                </h3>
                                <p className="text-slate-400 mb-6">
                                    {resultMessage}
                                </p>
                                <button
                                    onClick={resetFlow}
                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Attempts */}
            {attempts.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Clock size={20} weight="duotone" className="text-slate-400" />
                        Recent Attempts
                    </h2>
                    <div className="space-y-3">
                        {attempts.slice(0, 5).map((attempt) => (
                            <div
                                key={attempt.id}
                                className={`flex items-center justify-between p-4 rounded-xl transition-all ${attempt.success
                                    ? 'bg-green-950/30 border border-green-700/30 hover:border-green-600/50'
                                    : 'bg-red-950/30 border border-red-700/30 hover:border-red-600/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${attempt.success
                                        ? 'bg-green-950/50'
                                        : 'bg-red-950/50'
                                        }`}>
                                        {attempt.success
                                            ? <CheckCircle size={24} weight="fill" className="text-green-400" />
                                            : <XCircle size={24} weight="fill" className="text-red-400" />
                                        }
                                    </div>
                                    <div>
                                        <p className={`font-bold ${attempt.success
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                            }`}>
                                            {attempt.success ? 'Success' : formatFailureReason(attempt.failure_reason || 'Unknown')}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">
                                            {formatTime(attempt.attempted_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attendance Statistics - Premium Design */}
            {stats && (
                <div className="space-y-4">
                    {/* Header Card */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6 text-white overflow-hidden relative">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                        My Attendance Statistics
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {new Date(stats.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(stats.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className={`text-4xl font-black ${stats.attendance_percentage >= 75 ? 'text-emerald-400' :
                                    stats.attendance_percentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                                    }`}>
                                    {stats.attendance_percentage.toFixed(1)}%
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="w-full bg-slate-700/50 rounded-full h-4 backdrop-blur-sm overflow-hidden">
                                    <div
                                        className={`h-4 rounded-full transition-all duration-700 ease-out ${stats.attendance_percentage >= 75
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                            : stats.attendance_percentage >= 50
                                                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                                : 'bg-gradient-to-r from-rose-500 to-rose-400'
                                            }`}
                                        style={{ width: `${Math.min(stats.attendance_percentage, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>0%</span>
                                    <span className={`font-medium ${stats.attendance_percentage >= 75 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                        75% (Required)
                                    </span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Working Days */}
                                <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl"></span>
                                        <span className="text-xs text-gray-400 uppercase tracking-wide">Working Days</span>
                                    </div>
                                    <p className="text-3xl font-bold text-white">{stats.total_working_days}</p>
                                </div>

                                {/* Present */}
                                <div className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl"></span>
                                        <span className="text-xs text-emerald-400 uppercase tracking-wide">Present</span>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-400">{stats.present_days}</p>
                                </div>

                                {/* Absent */}
                                <div className="bg-rose-500/10 backdrop-blur-sm rounded-xl p-4 border border-rose-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl"></span>
                                        <span className="text-xs text-rose-400 uppercase tracking-wide">Absent</span>
                                    </div>
                                    <p className="text-3xl font-bold text-rose-400">{stats.absent_days}</p>
                                </div>

                                {/* Holidays */}
                                <div className="bg-violet-500/10 backdrop-blur-sm rounded-xl p-4 border border-violet-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl"></span>
                                        <span className="text-xs text-violet-400 uppercase tracking-wide">Holidays</span>
                                    </div>
                                    <p className="text-3xl font-bold text-violet-400">{stats.holidays_count || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Holidays Card - Only if holidays exist */}
                    {stats.holidays && stats.holidays.length > 0 && (
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarBlank size={20} weight="duotone" className="text-violet-400" />
                                <h3 className="text-md font-chivo font-bold uppercase tracking-wider text-slate-100">
                                    Holidays
                                </h3>
                                <span className="bg-violet-950/50 text-violet-400 text-xs px-2 py-0.5 rounded-lg font-mono">
                                    {stats.holidays.length} days
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {stats.holidays.map((holiday) => (
                                    <div
                                        key={holiday.id}
                                        className="flex items-center gap-2 bg-violet-950/30 border border-violet-700/30 px-3 py-2 rounded-lg"
                                    >
                                        <span className="text-sm font-bold text-violet-400">
                                            {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-sm text-slate-300">{holiday.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Attendance History Table */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                    <CalendarBlank size={20} weight="duotone" className="text-blue-400" />
                    Attendance History
                </h2>
                {history.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        No attendance records yet
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-700">
                                    <th className="pb-3 text-[10px] text-slate-500 font-mono uppercase tracking-widest">#</th>
                                    <th className="pb-3 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Date</th>
                                    <th className="pb-3 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Day</th>
                                    <th className="pb-3 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Status</th>
                                    <th className="pb-3 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Marked At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((record, index) => (
                                    <tr key={record.id || `${record.attendance_date}-${index}`} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 text-slate-500 font-mono text-sm">
                                            {index + 1}
                                        </td>
                                        <td className="py-3 text-slate-100 font-medium">
                                            {new Date(record.attendance_date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="py-3 text-slate-400 text-sm">
                                            {new Date(record.attendance_date).toLocaleDateString('en-US', {
                                                weekday: 'short'
                                            })}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${record.status === 'PRESENT'
                                                ? 'bg-green-950/50 text-green-400 border border-green-700/30'
                                                : record.status === 'PENDING'
                                                    ? 'bg-amber-950/50 text-amber-400 border border-amber-700/30'
                                                    : 'bg-red-950/50 text-red-400 border border-red-700/30'
                                                }`}>
                                                {record.status === 'PRESENT' ? 'Present' : record.status === 'PENDING' ? 'Not Marked' : 'Absent'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-500 text-sm font-mono">
                                            {record.marked_at
                                                ? new Date(record.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
