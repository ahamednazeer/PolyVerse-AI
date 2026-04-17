'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FilePdf, UploadSimple, Trash, Eye, ShareNetwork, Pulse, Sparkle } from '@phosphor-icons/react';

interface PDF {
    id: number;
    title: string;
    description: string;
    file_url: string;
    created_at: string;
    subject?: string;
    target_batch?: string;
}

export default function AdminPDFsPage() {
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPDFs();
    }, []);

    const fetchPDFs = async () => {
        try {
            const data = await api.getPDFs();
            if (Array.isArray(data)) {
                setPdfs(data);
            } else if (data && Array.isArray(data.items)) {
                setPdfs(data.items);
            } else if (data && Array.isArray(data.pdfs)) {
                setPdfs(data.pdfs);
            } else {
                console.error('Unexpected PDF data format:', data);
                setPdfs([]);
            }
        } catch (err) {
            setError('Failed to load PDFs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this PDF?')) return;
        try {
            await api.deletePDF(id);
            setPdfs(pdfs.filter(p => p.id !== id));
        } catch (err) {
            alert('Failed to delete PDF');
        }
    };

    const [showModal, setShowModal] = useState(false);
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        subject: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        file: null as File | null
    });

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!uploadData.file) {
                alert('Please select a file');
                return;
            }
            const formData = new FormData();
            formData.append('file', uploadData.file);
            formData.append('title', uploadData.title);
            formData.append('description', uploadData.description);
            formData.append('subject', uploadData.subject);
            formData.append('start_date', uploadData.start_date);
            formData.append('end_date', uploadData.end_date);

            await api.uploadPDF(formData);
            setShowModal(false);
            setUploadData({
                title: '',
                description: '',
                subject: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                file: null
            });
            fetchPDFs();
            alert('PDF uploaded successfully');
        } catch (err: any) {
            alert(err.message || 'Failed to upload PDF');
        }
    };


    const [assignModal, setAssignModal] = useState<number | null>(null);
    const [assignBatch, setAssignBatch] = useState('');
    const [assignType, setAssignType] = useState<'batch' | 'individual'>('batch');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const data = await api.getUsers();
            // Filter only students if possible, or just show all
            if (data.users) {
                setStudents(data.users.filter((u: any) => u.role === 'STUDENT'));
            } else if (Array.isArray(data)) {
                setStudents(data.filter((u: any) => u.role === 'STUDENT'));
            }
        } catch (err) {
            console.error('Failed to fetch students', err);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignModal) return;

        try {
            const payload: any = {};
            if (assignType === 'batch') {
                payload.batch = assignBatch;
            } else {
                payload.student_ids = selectedStudentIds;
            }

            await api.assignPDF(assignModal, payload);

            // Update local state to reflect assignment
            setPdfs(pdfs.map(p =>
                p.id === assignModal
                    ? { ...p, target_batch: assignType === 'batch' ? assignBatch : `${selectedStudentIds.length} Students` }
                    : p
            ));

            setAssignModal(null);
            setAssignBatch('');
            setSelectedStudentIds([]);
            setAssignType('batch');
            alert('PDF assigned successfully');
        } catch (err: any) {
            alert(err.message || 'Failed to assign PDF');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-red-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-red-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading PDFs...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <FilePdf size={28} weight="duotone" className="text-red-400" />
                        PDF Management
                    </h1>
                    <p className="text-slate-500 mt-1">Upload and manage course materials</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl px-5 py-2.5 flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]">
                    <UploadSimple size={20} weight="duotone" /> Upload PDF
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Upload Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-chivo font-bold text-slate-100 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <UploadSimple size={24} weight="duotone" className="text-blue-400" />
                            Upload PDF
                        </h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Title"
                                required
                                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
                                value={uploadData.title}
                                onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                            />
                            <textarea
                                placeholder="Description"
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 h-24"
                                value={uploadData.description}
                                onChange={e => setUploadData({ ...uploadData, description: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Subject (Optional)"
                                className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                value={uploadData.subject}
                                onChange={e => setUploadData({ ...uploadData, subject: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={uploadData.start_date}
                                        onChange={e => setUploadData({ ...uploadData, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={uploadData.end_date}
                                        onChange={e => setUploadData({ ...uploadData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-slate-700 rounded-sm p-6 text-center">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    required
                                    onChange={e => setUploadData({ ...uploadData, file: e.target.files ? e.target.files[0] : null })}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-blue-950 file:text-blue-400 hover:file:bg-blue-900"
                                />
                                {uploadData.file && (
                                    <p className="mt-2 text-sm text-slate-300">Selected: {uploadData.file.name}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    Upload
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {assignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Assign PDF</h2>

                        <div className="flex gap-4 mb-4 border-b border-slate-700/50 pb-2">
                            <button
                                type="button"
                                onClick={() => setAssignType('batch')}
                                className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${assignType === 'batch' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            >
                                Assign to Batch
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAssignType('individual');
                                    if (students.length === 0) fetchStudents();
                                }}
                                className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${assignType === 'individual' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            >
                                Assign Individuals
                            </button>
                        </div>

                        <form onSubmit={handleAssign} className="space-y-4">
                            {assignType === 'batch' ? (
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Target Batch</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2024-CSE-A"
                                        required={assignType === 'batch'}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={assignBatch}
                                        onChange={e => setAssignBatch(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">Assign to all students in this batch.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Select Students</label>
                                    <div className="border border-slate-700 rounded-sm max-h-48 overflow-y-auto bg-slate-800/50 p-2 space-y-1">
                                        {loadingStudents ? (
                                            <div className="text-xs text-slate-500 text-center py-4">Loading students...</div>
                                        ) : students.length === 0 ? (
                                            <div className="text-xs text-slate-500 text-center py-4">No students found</div>
                                        ) : (
                                            students.map(student => (
                                                <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-sm cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-slate-900"
                                                        checked={selectedStudentIds.includes(student.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                            } else {
                                                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                                            }
                                                        }}
                                                    />
                                                    <div>
                                                        <div className="text-sm text-slate-200 font-medium">{student.username}</div>
                                                        <div className="text-xs text-slate-500">{student.email}</div>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 text-right">
                                        {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssignModal(null);
                                        setAssignBatch('');
                                        setSelectedStudentIds([]);
                                        setAssignType('batch');
                                    }}
                                    className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={assignType === 'individual' && selectedStudentIds.length === 0}
                                >
                                    Assign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pdfs.map((pdf) => (
                    <div key={pdf.id} className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-red-950/30 rounded-sm text-red-400">
                                <FilePdf size={32} weight="fill" />
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => window.open(pdf.file_url, '_blank')}
                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-sm"
                                    title="View"
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    onClick={() => setAssignModal(pdf.id)}
                                    className="px-3 py-1 bg-green-900/40 text-green-400 hover:bg-green-900/60 border border-green-800/50 rounded-sm text-xs font-semibold flex items-center gap-2 transition-colors"
                                >
                                    <ShareNetwork size={16} />
                                    Assign
                                </button>
                                <button
                                    onClick={() => handleDelete(pdf.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-sm"
                                    title="Delete"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>

                        <h3 className="font-semibold text-slate-100 mb-2 truncate" title={pdf.title}>{pdf.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{pdf.description}</p>

                        {pdf.target_batch && (
                            <div className="mb-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-green-950/30 border border-green-900/50 text-green-400 text-xs font-mono">
                                    <ShareNetwork size={12} weight="fill" />
                                    Batch: {pdf.target_batch}
                                </span>
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-slate-700/50 text-xs text-slate-500 font-mono flex justify-between">
                            <span>{pdf.subject || 'General'}</span>
                            <span>{new Date(pdf.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>

            {pdfs.length === 0 && !loading && (
                <div className="p-16 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 relative overflow-hidden">
                    <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                    <FilePdf size={56} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                    <p>No PDFs found. Upload some to get started.</p>
                </div>
            )}
        </div>
    );
}
