'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, Calendar, Clock, Video, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Course {
    id: number;
    code: string;
    name: string;
}

export default function CreateDoubtSessionPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        course_id: '',
        scheduled_at: '',
        duration_minutes: 60,
    });

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const data = await api.getCourses();
            setCourses(data);
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.scheduled_at) {
            alert('Please fill in required fields');
            return;
        }

        try {
            setLoading(true);
            await api.createDoubtSession({
                title: form.title,
                description: form.description || undefined,
                course_id: form.course_id ? parseInt(form.course_id) : undefined,
                scheduled_at: new Date(form.scheduled_at).toISOString(),
                duration_minutes: form.duration_minutes,
            });
            alert('Doubt session scheduled successfully!');
            router.push('/dashboard/staff/learning');
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Failed to schedule session');
        } finally {
            setLoading(false);
        }
    };

    // Get minimum datetime (now + 5 minutes)
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        return now.toISOString().slice(0, 16);
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Link href="/dashboard/staff/learning" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
                <ArrowLeft className="w-5 h-5" />
                Back to Learning Management
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <Video className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Schedule Doubt Session</h1>
                        <p className="text-sm text-gray-500">Create a live doubt clearing session for students</p>
                    </div>
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
                                min={getMinDateTime()}
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

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            A Jitsi video room will be automatically created when you start the session. Students will be notified and can join from their Learning Hub.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Scheduling...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Schedule Session
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
