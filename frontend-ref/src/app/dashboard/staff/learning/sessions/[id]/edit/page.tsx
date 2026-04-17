'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, Calendar, Clock, Video, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

interface DoubtSession {
    id: number;
    title: string;
    description?: string;
    course_id?: number;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
}

interface Course {
    id: number;
    code: string;
    name: string;
}

export default function EditDoubtSessionPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = parseInt(params.id as string);

    const [session, setSession] = useState<DoubtSession | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        course_id: '',
        scheduled_at: '',
        duration_minutes: 60,
    });

    useEffect(() => {
        loadData();
    }, [sessionId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [sessionData, coursesData] = await Promise.all([
                api.getDoubtSession(sessionId),
                api.getCourses(),
            ]);
            setSession(sessionData);
            setCourses(coursesData);

            // Populate form
            const scheduledDate = new Date(sessionData.scheduled_at);
            setForm({
                title: sessionData.title,
                description: sessionData.description || '',
                course_id: sessionData.course_id?.toString() || '',
                scheduled_at: scheduledDate.toISOString().slice(0, 16),
                duration_minutes: sessionData.duration_minutes,
            });
        } catch (error) {
            console.error('Error loading session:', error);
            alert('Failed to load session');
            router.push('/dashboard/staff/learning');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.scheduled_at) {
            alert('Please fill in required fields');
            return;
        }

        try {
            setSaving(true);
            await api.updateDoubtSession(sessionId, {
                title: form.title,
                description: form.description || undefined,
                course_id: form.course_id ? parseInt(form.course_id) : undefined,
                scheduled_at: new Date(form.scheduled_at).toISOString(),
                duration_minutes: form.duration_minutes,
            });
            alert('Session updated successfully!');
            router.push('/dashboard/staff/learning');
        } catch (error) {
            console.error('Error updating session:', error);
            alert('Failed to update session');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this session?')) return;

        try {
            await api.deleteDoubtSession(sessionId);
            alert('Session deleted');
            router.push('/dashboard/staff/learning');
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Failed to delete session');
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Link href="/dashboard/staff/learning" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
                <ArrowLeft className="w-5 h-5" />
                Back to Learning Management
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Video className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Doubt Session</h1>
                            <p className="text-sm text-gray-500">
                                Status: <span className={`font-medium ${session?.status === 'LIVE' ? 'text-green-600' : 'text-blue-600'}`}>
                                    {session?.status}
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete Session"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Session Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g., Data Structures Q&A Session"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Course (Optional)
                        </label>
                        <select
                            value={form.course_id}
                            onChange={e => setForm({ ...form, course_id: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Students (No specific course)</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Scheduled Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={form.scheduled_at}
                                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Duration (minutes)
                            </label>
                            <select
                                value={form.duration_minutes}
                                onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                                <option value="120">2 hours</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            placeholder="What topics will be covered in this session?"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
