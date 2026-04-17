'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import ImageCropper from '@/components/ImageCropper';
import {
    User,
    Camera,
    CheckCircle,
    Clock,
    XCircle,
    Warning,
    Upload,
    Pulse,
    Envelope,
    IdentificationBadge,
    BookOpen,
    Buildings,
    Sparkle
} from '@phosphor-icons/react';

interface ProfilePhoto {
    id: number;
    filename: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejection_reason?: string;
    created_at: string;
}

interface UserData {
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

export default function ProfilePage() {
    const [user, setUser] = useState<UserData | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<ProfilePhoto | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [cropImage, setCropImage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [userData, photoData] = await Promise.all([
                api.getMe(),
                api.getProfilePhotoStatus().catch(() => null),
            ]);
            setUser(userData);
            setProfilePhoto(photoData);
        } catch (err) {
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be smaller than 5MB');
            return;
        }

        // Create a URL for the image and open the cropper
        const imageUrl = URL.createObjectURL(file);
        setCropImage(imageUrl);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setCropImage(null);
        try {
            setUploadingPhoto(true);
            setError(null);

            // Convert blob to file
            const file = new File([croppedBlob], 'profile-photo.jpg', { type: 'image/jpeg' });
            await api.uploadProfilePhoto(file);

            setSuccess('Profile photo uploaded! Waiting for admin approval.');
            await loadData();
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleCropCancel = () => {
        if (cropImage) {
            URL.revokeObjectURL(cropImage);
        }
        setCropImage(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Profile...
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Image Cropper Modal */}
            {cropImage && (
                <ImageCropper
                    image={cropImage}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                        <User size={28} weight="duotone" className="text-blue-400" />
                        My Profile
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">Manage your account and identity verification</p>
                </div>

                {/* Notifications */}
                {error && (
                    <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-4 flex items-center gap-3">
                        <XCircle size={22} weight="fill" className="text-red-400 flex-shrink-0" />
                        <span className="text-red-300 flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                            <XCircle size={18} />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="bg-green-950/30 border border-green-700/50 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle size={22} weight="fill" className="text-green-400 flex-shrink-0" />
                        <span className="text-green-300 flex-1">{success}</span>
                        <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
                            <XCircle size={18} />
                        </button>
                    </div>
                )}

                {/* Profile Photo Section */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={100} weight="duotone" className="absolute -right-4 -top-4 text-slate-800/30" />
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Camera size={20} weight="duotone" className="text-blue-400" />
                        Profile Photo
                    </h2>

                    <div className="flex items-start gap-6 relative z-10">
                        {/* Photo Preview */}
                        <div className="flex-shrink-0">
                            <div className="w-28 h-28 bg-slate-700/50 rounded-xl flex items-center justify-center overflow-hidden border-2 border-slate-600">
                                {profilePhoto ? (
                                    <img
                                        src={`http://localhost:8000/static/profile_photos/${profilePhoto.filename}`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.innerHTML = '<span class="text-4xl">👤</span>';
                                        }}
                                    />
                                ) : (
                                    <User size={48} weight="duotone" className="text-slate-500" />
                                )}
                            </div>
                        </div>

                        {/* Photo Status & Upload */}
                        <div className="flex-1 space-y-4">
                            {profilePhoto ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        {profilePhoto.status === 'APPROVED' && (
                                            <span className="px-3 py-1.5 bg-green-950/50 text-green-400 rounded-lg text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                                <CheckCircle size={16} weight="fill" /> Approved
                                            </span>
                                        )}
                                        {profilePhoto.status === 'PENDING' && (
                                            <span className="px-3 py-1.5 bg-amber-950/50 text-amber-400 rounded-lg text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                                <Clock size={16} weight="duotone" /> Pending
                                            </span>
                                        )}
                                        {profilePhoto.status === 'REJECTED' && (
                                            <span className="px-3 py-1.5 bg-red-950/50 text-red-400 rounded-lg text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                                <XCircle size={16} weight="fill" /> Rejected
                                            </span>
                                        )}
                                    </div>

                                    {profilePhoto.status === 'REJECTED' && profilePhoto.rejection_reason && (
                                        <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-3">
                                            <p className="text-sm text-red-300">
                                                <Warning size={16} className="inline mr-1" />
                                                <strong>Reason:</strong> {profilePhoto.rejection_reason}
                                            </p>
                                        </div>
                                    )}

                                    {profilePhoto.status !== 'PENDING' && (
                                        <div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept="image/*"
                                                onChange={handlePhotoSelect}
                                                className="hidden"
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingPhoto}
                                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 font-bold text-sm uppercase tracking-wider hover:scale-105 active:scale-95"
                                            >
                                                {uploadingPhoto ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={18} />
                                                        Upload New Photo
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {profilePhoto.status === 'PENDING' && (
                                        <p className="text-sm text-slate-500">
                                            Your photo is being reviewed by an admin. This usually takes 1-2 hours.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-slate-400">
                                        Upload a clear face photo for identity verification during attendance.
                                    </p>
                                    <div className="space-y-2 text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            Face should be clearly visible
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            Good lighting, no shadows
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            No sunglasses or face coverings
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            Maximum file size: 5MB
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        onChange={handlePhotoSelect}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingPhoto}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 font-bold text-sm uppercase tracking-wider hover:scale-105 active:scale-95"
                                    >
                                        {uploadingPhoto ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Camera size={18} />
                                                Upload Profile Photo
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Account Info Section */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                    <h2 className="text-lg font-chivo font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                        <IdentificationBadge size={20} weight="duotone" className="text-purple-400" />
                        Account Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Full Name</label>
                            <p className="text-slate-100 font-semibold text-lg">
                                {user?.first_name} {user?.last_name || ''}
                            </p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1 flex items-center gap-1">
                                <Envelope size={12} /> Email
                            </label>
                            <p className="text-slate-100 font-semibold truncate">{user?.email}</p>
                        </div>

                        {user?.student_id && (
                            <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Student ID</label>
                                <p className="text-slate-100 font-mono font-bold text-lg">{user.student_id}</p>
                            </div>
                        )}

                        {user?.batch && (
                            <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1 flex items-center gap-1">
                                    <BookOpen size={12} /> Batch
                                </label>
                                <p className="text-slate-100 font-semibold">{user.batch}</p>
                            </div>
                        )}

                        {user?.department && (
                            <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1 flex items-center gap-1">
                                    <Buildings size={12} /> Department
                                </label>
                                <p className="text-slate-100 font-semibold">{user.department}</p>
                            </div>
                        )}

                        {user?.student_category && (
                            <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Category</label>
                                <p className="text-slate-100 font-semibold capitalize">
                                    {user.student_category.replace('_', ' ')}
                                </p>
                            </div>
                        )}

                        <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
                            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Role</label>
                            <p className="text-blue-400 font-bold capitalize uppercase tracking-wider">
                                {user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
