'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, Brain, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Course {
    id: number;
    code: string;
    name: string;
}

interface Topic {
    id: number;
    name: string;
}

export default function CreateTopicPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [existingTopics, setExistingTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        subject_code: '',
        course_id: '',
        difficulty: 1,
        estimated_hours: 1,
    });
    const [prerequisites, setPrerequisites] = useState<number[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [coursesData, topicsData] = await Promise.all([
                api.getCourses(),
                api.getKnowledgeTopics(),
            ]);
            setCourses(coursesData);
            setExistingTopics(topicsData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) {
            alert('Please enter a topic name');
            return;
        }

        try {
            setLoading(true);
            await api.createKnowledgeTopic({
                ...form,
                course_id: form.course_id ? parseInt(form.course_id) : undefined,
                prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
            });
            alert('Topic created successfully!');
            router.push('/dashboard/staff/learning');
        } catch (error) {
            console.error('Error creating topic:', error);
            alert('Failed to create topic');
        } finally {
            setLoading(false);
        }
    };

    const addPrerequisite = (topicId: number) => {
        if (!prerequisites.includes(topicId)) {
            setPrerequisites([...prerequisites, topicId]);
        }
    };

    const removePrerequisite = (topicId: number) => {
        setPrerequisites(prerequisites.filter(id => id !== topicId));
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Link href="/dashboard/staff/learning" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
                <ArrowLeft className="w-5 h-5" />
                Back to Learning Management
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                        <Brain className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add Knowledge Topic</h1>
                        <p className="text-sm text-gray-500">Create a topic for the student knowledge graph</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Topic Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g., Binary Search Trees"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Subject Code
                            </label>
                            <input
                                type="text"
                                value={form.subject_code}
                                onChange={e => setForm({ ...form, subject_code: e.target.value })}
                                placeholder="CS201"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Course (Optional)
                            </label>
                            <select
                                value={form.course_id}
                                onChange={e => setForm({ ...form, course_id: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">No specific course</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Difficulty (1-5)
                            </label>
                            <select
                                value={form.difficulty}
                                onChange={e => setForm({ ...form, difficulty: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="1">1 - Beginner</option>
                                <option value="2">2 - Easy</option>
                                <option value="3">3 - Medium</option>
                                <option value="4">4 - Hard</option>
                                <option value="5">5 - Expert</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Estimated Hours
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={form.estimated_hours}
                                onChange={e => setForm({ ...form, estimated_hours: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            placeholder="Brief description of this topic..."
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Prerequisites */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Prerequisites
                        </label>
                        {prerequisites.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {prerequisites.map(id => {
                                    const topic = existingTopics.find(t => t.id === id);
                                    return topic ? (
                                        <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm">
                                            {topic.name}
                                            <button type="button" onClick={() => removePrerequisite(id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                        {existingTopics.length > 0 && (
                            <select
                                onChange={e => e.target.value && addPrerequisite(parseInt(e.target.value))}
                                value=""
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">+ Add prerequisite topic</option>
                                {existingTopics
                                    .filter(t => !prerequisites.includes(t.id))
                                    .map(topic => (
                                        <option key={topic.id} value={topic.id}>{topic.name}</option>
                                    ))}
                            </select>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Create Topic
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
