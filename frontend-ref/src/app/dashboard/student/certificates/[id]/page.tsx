'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    Buildings,
    Clock,
    CheckCircle,
    XCircle,
    Spinner,
    User,
    IdentificationCard,
    Shield,
    Certificate,
    Seal,
    Download,
    GraduationCap,
    MapPin
} from '@phosphor-icons/react';

interface CertificateDetails {
    id: number;
    student_id: number;
    hostel_id: number | null;
    room_number: string | null;
    certificate_type: string;
    purpose: string;
    purpose_details: string | null;
    status: string;
    rejection_reason: string | null;
    certificate_number: string | null;
    reviewed_by: number | null;
    reviewed_at: string | null;
    download_count: number;
    created_at: string;
    updated_at: string;
}

interface StudentInfo {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    register_number: string;
    department: string;
    student_category: string;
}

interface HostelInfo {
    is_assigned: boolean;
    hostel_name: string | null;
    room_number: string | null;
    floor: number | null;
    warden_name: string | null;
}

const CERTIFICATE_TYPES: Record<string, string> = {
    'HOSTEL_BONAFIDE': 'Hostel Bonafide Certificate',
    'GENERAL_BONAFIDE': 'General Bonafide Certificate',
    'STAY_CERTIFICATE': 'Stay Certificate',
    'CHARACTER_CERTIFICATE': 'Character Certificate',
};

const CERTIFICATE_PURPOSES: Record<string, string> = {
    'BANK': 'Bank Account Opening',
    'SCHOLARSHIP': 'Scholarship Application',
    'TRAVEL': 'Travel Purpose',
    'PASSPORT': 'Passport Application',
    'VISA': 'Visa Application',
    'EMPLOYMENT': 'Employment Verification',
    'HIGHER_STUDIES': 'Higher Studies Application',
    'OTHER': 'Other Purpose',
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function CertificateViewPage() {
    const params = useParams();
    const router = useRouter();
    const certificateId = params?.id as string;
    const printRef = useRef<HTMLDivElement>(null);

    const [certificate, setCertificate] = useState<CertificateDetails | null>(null);
    const [student, setStudent] = useState<StudentInfo | null>(null);
    const [hostelInfo, setHostelInfo] = useState<HostelInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        async function fetchData() {
            if (!certificateId) return;

            setLoading(true);
            setError(null);
            try {
                const [certData, userData, hostelData] = await Promise.all([
                    api.downloadCertificate(parseInt(certificateId)),
                    api.getMe(),
                    api.getMyHostelInfo().catch(() => null)
                ]);

                setCertificate(certData.certificate);
                setStudent(userData);
                setHostelInfo(hostelData);
            } catch (err: any) {
                setError(err.message || 'Failed to load certificate');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [certificateId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-slate-400 flex items-center gap-3">
                    <Spinner size={24} className="animate-spin" />
                    Loading certificate...
                </div>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="min-h-screen bg-slate-900 p-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-300 mb-6"
                >
                    <ArrowLeft size={20} />
                    Go Back
                </button>
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-8 text-center max-w-md mx-auto">
                    <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-300 mb-2">Error Loading Certificate</h2>
                    <p className="text-red-400">{error || 'Certificate not found'}</p>
                </div>
            </div>
        );
    }

    const isApproved = certificate.status === 'APPROVED' || certificate.status === 'DOWNLOADED';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
            {/* Header Controls */}
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                    <ArrowLeft size={20} weight="bold" />
                    Back
                </button>

                {isApproved && (
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Download size={18} />
                        Print / Download
                    </button>
                )}
            </div>

            {/* Certificate Document */}
            <div
                ref={printRef}
                className="max-w-4xl mx-auto bg-gradient-to-b from-slate-50 to-white rounded-lg shadow-2xl overflow-hidden print:shadow-none"
            >
                {/* Decorative Top Border */}
                <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />

                {/* Certificate Content */}
                <div className="p-8 sm:p-12 relative">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                        <Certificate size={400} className="text-slate-900" weight="fill" />
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8 relative">
                        <div className="flex justify-center items-center gap-4 mb-4">
                            <GraduationCap size={48} className="text-indigo-700" weight="fill" />
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-wide">
                                    Institution Mangement System
                                </h1>
                                <p className="text-slate-600 text-sm">Excellence in Education</p>
                            </div>
                        </div>

                        <div className="w-32 h-1 bg-gradient-to-r from-transparent via-indigo-600 to-transparent mx-auto my-4" />

                        <h2 className="text-xl sm:text-2xl font-bold text-indigo-800 uppercase tracking-widest">
                            {CERTIFICATE_TYPES[certificate.certificate_type] || 'Bonafide Certificate'}
                        </h2>
                    </div>

                    {/* Certificate Number */}
                    <div className="flex justify-center items-center mb-8">
                        <div className="flex items-center gap-2">
                            <Shield size={20} className="text-indigo-600" />
                            <span className="font-mono text-sm text-slate-600">
                                {certificate.certificate_number || 'Pending'}
                            </span>
                        </div>
                    </div>

                    {/* Certificate Body */}
                    <div className="text-slate-700 leading-relaxed space-y-4 mb-8">
                        <p className="text-lg">
                            This is to certify that <strong className="text-slate-900">{student?.first_name} {student?.last_name}</strong>,
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-3">
                                <IdentificationCard size={20} className="text-indigo-600" />
                                <span>Register Number: <strong>{student?.register_number}</strong></span>
                            </div>
                            <div className="flex items-center gap-3">
                                <GraduationCap size={20} className="text-indigo-600" />
                                <span>Department: <strong>{student?.department}</strong></span>
                            </div>
                            {certificate.certificate_type === 'HOSTEL_BONAFIDE' && hostelInfo?.is_assigned && (
                                <>
                                    <div className="flex items-center gap-3">
                                        <Buildings size={20} className="text-indigo-600" />
                                        <span>Hostel: <strong>{hostelInfo.hostel_name}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin size={20} className="text-indigo-600" />
                                        <span>Room Number: <strong>{certificate.room_number || hostelInfo.room_number}</strong></span>
                                    </div>
                                </>
                            )}
                        </div>

                        <p className="text-lg">
                            is a bonafide student of this institution
                            {certificate.certificate_type === 'HOSTEL_BONAFIDE' && hostelInfo?.is_assigned && (
                                <> and is currently residing in the hostel as mentioned above</>
                            )}.
                        </p>

                        <p className="text-lg">
                            This certificate is issued for the purpose of <strong className="text-indigo-700">{CERTIFICATE_PURPOSES[certificate.purpose] || certificate.purpose}</strong>
                            {certificate.purpose_details && <> ({certificate.purpose_details})</>}.
                        </p>
                    </div>

                    {/* Dates & Signature */}
                    <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-slate-200">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Date of Issue</p>
                            <p className="font-semibold text-slate-800">
                                {certificate.reviewed_at ? formatDate(certificate.reviewed_at) : 'Pending'}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="inline-block text-center">
                                <div className="w-40 border-b-2 border-slate-400 mb-2" />
                                <p className="text-sm text-slate-600">Authorized Signature</p>
                                <p className="text-xs text-slate-500">
                                    {certificate.certificate_type === 'HOSTEL_BONAFIDE'
                                        ? (hostelInfo?.warden_name || 'Hostel Warden')
                                        : 'Administration Office'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                        <p>This is a digitally generated certificate.</p>
                        <p>Verification ID: {certificate.certificate_number || certificateId}</p>
                        <p className="mt-1">Generated on: {formatDateTime(new Date().toISOString())}</p>
                    </div>

                    {/* Official Seal Watermark */}
                    {isApproved && (
                        <div className="absolute bottom-24 right-12 opacity-30 print:opacity-20">
                            <div className="relative">
                                <Seal size={100} className="text-green-600" weight="fill" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <CheckCircle size={40} className="text-green-700" weight="bold" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Decorative Bottom Border */}
                <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
            </div>

            {/* Live Clock (screen only) */}
            <div className="max-w-4xl mx-auto mt-4 text-center print:hidden">
                <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
                    <Clock size={16} />
                    Current Time: {currentTime.toLocaleTimeString('en-IN')}
                </p>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    
                    /* Force print colors */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Hide Back button, Print button, clock */
                    .print\\:hidden {
                        display: none !important;
                    }
                    
                    /* Remove shadow */
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    
                    /* Make ALL dark backgrounds white */
                    html, body,
                    .bg-gradient-to-br,
                    .bg-slate-900,
                    .bg-slate-950,
                    .bg-slate-800,
                    .from-slate-900,
                    .via-slate-800,
                    .to-slate-900,
                    main,
                    .flex-1,
                    .min-h-screen,
                    #__next,
                    #__next > div {
                        background: white !important;
                        background-color: white !important;
                    }
                    
                    /* Remove padding from containers */
                    .min-h-screen,
                    .p-6,
                    .p-4 {
                        padding: 0 !important;
                    }
                    
                    /* Certificate takes full width */
                    .max-w-4xl {
                        max-width: 100% !important;
                        margin: 0 auto !important;
                    }
                    
                    /* Hide flex container's dark background */
                    .flex {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
