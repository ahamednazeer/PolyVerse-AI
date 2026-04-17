'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    BookOpen, Users, Trophy, Video, Plus, Trash2, Edit2,
    Save, X, ChevronRight, Layers, Brain, Star, Search, Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface Course {
    id: number;
    code: string;
    name: string;
    description?: string;
    department?: string;
    semester?: number;
    credits?: number;
    is_active: boolean;
}

interface FlashcardSet {
    id: number;
    title: string;
    topic?: string;
    total_cards: number;
    is_active: boolean;
}

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    register_number?: string;
    department?: string;
}

interface DoubtSession {
    id: number;
    title: string;
    description?: string;
    course_id?: number;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    host_id: number;
}

interface StudyCircle {
    id: number;
    name: string;
    description?: string;
    course_id?: number;
    subject_code?: string;
    has_voice_room: boolean;
    is_active: boolean;
}

export default function StaffLearningPage() {
    const [activeTab, setActiveTab] = useState<'courses' | 'flashcards' | 'sessions' | 'circles' | 'topics'>('courses');
    const [courses, setCourses] = useState<Course[]>([]);
    const [studyCircles, setStudyCircles] = useState<StudyCircle[]>([]);
    const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
    const [doubtSessions, setDoubtSessions] = useState<DoubtSession[]>([]);
    const [pastSessions, setPastSessions] = useState<DoubtSession[]>([]);
    const [knowledgeTopics, setKnowledgeTopics] = useState<any[]>([]);
    const [sessionView, setSessionView] = useState<'active' | 'history'>('active');
    const [loading, setLoading] = useState(true);

    // Course form
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [courseForm, setCourseForm] = useState({
        code: '',
        name: '',
        description: '',
        department: '',
        semester: 1,
        credits: 3,
    });

    // Flashcard form
    const [showFlashcardForm, setShowFlashcardForm] = useState(false);
    const [flashcardForm, setFlashcardForm] = useState({
        title: '',
        description: '',
        topic: '',
        subject_code: '',
    });

    // Circle form
    const [showCircleForm, setShowCircleForm] = useState(false);
    const [editingCircleId, setEditingCircleId] = useState<number | null>(null);
    const [circleForm, setCircleForm] = useState({
        name: '',
        description: '',
        course_id: undefined as number | undefined,
        subject_code: '',
        has_voice_room: false,
    });

    // AI Generation
    const [showAIModal, setShowAIModal] = useState(false);
    const [generateTopic, setGenerateTopic] = useState('');
    const [generateDifficulty, setGenerateDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [generateCount, setGenerateCount] = useState(10);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');

    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentsError, setStudentsError] = useState('');

    // Enroll modal
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'courses') {
                const data = await api.getCourses();
                setCourses(data);
            } else if (activeTab === 'flashcards') {
                const data = await api.getFlashcardSets();
                setFlashcardSets(data);
            } else if (activeTab === 'sessions') {
                // Fetch upcoming, live, and past sessions
                const [upcoming, live, myAll] = await Promise.all([
                    api.getUpcomingDoubtSessions(),
                    api.getLiveDoubtSessions(),
                    api.getMyDoubtSessions(true), // include_past = true
                ]);
                // Active = Live + Upcoming
                const activeSessions = [...(live || []), ...(upcoming || [])];
                setDoubtSessions(activeSessions);
                // History = Ended sessions
                const history = (myAll || []).filter((s: DoubtSession) => s.status === 'ENDED' || s.status === 'CANCELLED');
                setPastSessions(history);
            } else if (activeTab === 'topics') {
                const data = await api.getKnowledgeTopics();
                setKnowledgeTopics(data || []);
            } else if (activeTab === 'circles') {
                const [circlesData, coursesData] = await Promise.all([
                    api.getAllStudyCircles(),
                    api.getCourses()
                ]);
                setStudyCircles(circlesData || []);
                setCourses(coursesData || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async () => {
        try {
            setStudentsLoading(true);
            setStudentsError('');
            const data = await api.getEnrollableStudents();
            setStudents(data || []);
        } catch (error: any) {
            console.error('Error loading students:', error);
            setStudentsError(error?.message || 'Failed to load students');
        } finally {
            setStudentsLoading(false);
        }
    };

    const openEnrollModal = (course: Course) => {
        setEnrollCourse(course);
        setSelectedStudents([]);
        setStudentSearch('');
        setStudentsError('');
        setShowEnrollModal(true);
        loadStudents();
    };

    const handleEnroll = async () => {
        if (!enrollCourse || selectedStudents.length === 0) {
            alert('Please select at least one student');
            return;
        }

        try {
            setEnrolling(true);
            await api.enrollStudents(enrollCourse.id, selectedStudents);
            alert(`Successfully enrolled ${selectedStudents.length} student(s) in ${enrollCourse.name}`);
            setShowEnrollModal(false);
            setEnrollCourse(null);
            setSelectedStudents([]);
        } catch (error) {
            console.error('Error enrolling students:', error);
            alert('Failed to enroll students');
        } finally {
            setEnrolling(false);
        }
    };

    const toggleStudent = (studentId: number) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const selectAllStudents = () => {
        const filtered = filteredStudents.map(s => s.id);
        setSelectedStudents(filtered);
    };

    const filteredStudents = students.filter(s => {
        const search = studentSearch.toLowerCase();
        return (
            s.first_name.toLowerCase().includes(search) ||
            s.last_name.toLowerCase().includes(search) ||
            (s.register_number?.toLowerCase().includes(search)) ||
            (s.department?.toLowerCase().includes(search))
        );
    });

    const handleCreateCourse = async () => {
        try {
            await api.createCourse(courseForm);
            setShowCourseForm(false);
            setCourseForm({ code: '', name: '', description: '', department: '', semester: 1, credits: 3 });
            loadData();
        } catch (error) {
            console.error('Error creating course:', error);
            alert('Failed to create course');
        }
    };

    const handleStartSession = async (sessionId: number) => {
        try {
            await api.startDoubtSession(sessionId);
            alert('Session started! Students can now join.');
            loadData();
        } catch (error) {
            console.error('Error starting session:', error);
            alert('Failed to start session');
        }
    };

    const handleEndSession = async (sessionId: number) => {
        if (!confirm('Are you sure you want to end this session?')) return;
        try {
            await api.endDoubtSession(sessionId);
            alert('Session ended.');
            loadData();
        } catch (error) {
            console.error('Error ending session:', error);
            alert('Failed to end session');
        }
    };

    const handleCreateFlashcardSet = async () => {
        try {
            await api.createFlashcardSet(flashcardForm);
            setShowFlashcardForm(false);
            setFlashcardForm({ title: '', description: '', topic: '', subject_code: '' });
            loadData();
        } catch (error) {
            console.error('Error creating flashcard set:', error);
            alert('Failed to create flashcard set');
        }
    };

    const handleGenerateFlashcards = async () => {
        if (!generateTopic.trim()) return;

        try {
            setGenerating(true);
            setGenerateError('');
            await api.generateFlashcardsFromTopic(generateTopic, {
                difficulty: generateDifficulty,
                num_cards: generateCount,
            });
            setShowAIModal(false);
            setGenerateTopic('');
            setGenerateDifficulty('medium');
            setGenerateCount(10);
            loadData();
            alert(`Successfully generated ${generateCount} flashcards on "${generateTopic}"!`);
        } catch (error) {
            console.error('Error generating flashcards:', error);
            setGenerateError('Failed to generate flashcards. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleCreateCircle = async () => {
        try {
            if (editingCircleId) {
                await api.updateStudyCircle(editingCircleId, circleForm);
            } else {
                await api.createStudyCircle(circleForm);
            }
            setShowCircleForm(false);
            setEditingCircleId(null);
            setCircleForm({ name: '', description: '', course_id: undefined, subject_code: '', has_voice_room: false });
            loadData();
        } catch (error) {
            console.error('Error saving study circle:', error);
            alert(`Failed to ${editingCircleId ? 'update' : 'create'} study circle`);
        }
    };

    const handleEditCircle = (circle: any) => {
        setEditingCircleId(circle.id);
        setCircleForm({
            name: circle.name,
            description: circle.description || '',
            course_id: circle.course_id,
            subject_code: circle.subject_code || '',
            has_voice_room: circle.has_voice_room,
        });
        setShowCircleForm(true);
    };

    const handleDeleteCircle = async (circleId: number) => {
        if (!window.confirm('Are you sure you want to delete this study circle?')) return;
        try {
            await api.deleteStudyCircle(circleId);
            loadData();
        } catch (error) {
            console.error('Error deleting study circle:', error);
            alert('Failed to delete study circle');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-7 h-7 text-purple-500" />
                        Learning Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage courses, flashcards, and learning content
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                {[
                    { id: 'courses', label: 'Courses', icon: BookOpen },
                    { id: 'flashcards', label: 'Flashcard Sets', icon: Trophy },
                    { id: 'sessions', label: 'Doubt Sessions', icon: Video },
                    { id: 'circles', label: 'Study Circles', icon: Users },
                    { id: 'topics', label: 'Knowledge Topics', icon: Brain },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Courses Tab */}
            {activeTab === 'courses' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Courses</h2>
                        <button
                            onClick={() => setShowCourseForm(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Course
                        </button>
                    </div>



                    {/* Course List */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Courses</h3>
                            <p className="text-gray-500">Click "Add Course" to create your first course</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {courses.map(course => (
                                <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <span className="text-xs text-purple-600 font-medium">{course.code}</span>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{course.name}</h3>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs ${course.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {course.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {course.department && (
                                        <p className="text-sm text-gray-500">{course.department} • Sem {course.semester}</p>
                                    )}
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => openEnrollModal(course)}
                                            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
                                        >
                                            <Users className="w-4 h-4 inline mr-1" />
                                            Enroll
                                        </button>
                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                            <Edit2 className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}


                </div>
            )}

            {/* Flashcards Tab */}
            {activeTab === 'flashcards' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flashcard Sets</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAIModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                AI Generate
                            </button>
                            <button
                                onClick={() => setShowFlashcardForm(true)}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Create Set
                            </button>
                        </div>
                    </div>






                    {/* Flashcard List */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
                        </div>
                    ) : flashcardSets.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Flashcard Sets</h3>
                            <p className="text-gray-500">Click "Create Set" to add flashcards for students</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {flashcardSets.map(set => (
                                <div key={set.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{set.title}</h3>
                                    {set.topic && (
                                        <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full mb-3">
                                            {set.topic}
                                        </span>
                                    )}
                                    <p className="text-sm text-gray-500">{set.total_cards} cards</p>
                                    <div className="mt-4 flex gap-2">
                                        <Link
                                            href={`/dashboard/staff/learning/flashcards/${set.id}`}
                                            className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100 text-center"
                                        >
                                            Add Cards
                                        </Link>
                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                            <Edit2 className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Doubt Sessions Tab */}
            {activeTab === 'sessions' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Doubt Sessions</h2>
                        <Link
                            href="/dashboard/staff/learning/sessions/create"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Schedule Session
                        </Link>
                    </div>

                    {/* Sub-tabs: Active / History */}
                    <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setSessionView('active')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${sessionView === 'active'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🔴 Active ({doubtSessions.length})
                        </button>
                        <button
                            onClick={() => setSessionView('history')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${sessionView === 'history'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📚 History ({pastSessions.length})
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : sessionView === 'active' ? (
                        // Active Sessions View
                        doubtSessions.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Active Sessions</h3>
                                <p className="text-gray-500">Click "Schedule Session" to create a live doubt session</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {doubtSessions.map(session => (
                                    <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{session.title}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.status === 'LIVE' ? 'bg-green-100 text-green-700 animate-pulse' :
                                                session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {session.status}
                                            </span>
                                        </div>
                                        {session.description && (
                                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{session.description}</p>
                                        )}
                                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <span>📅</span>
                                                <span>{new Date(session.scheduled_at).toLocaleDateString('en-US', {
                                                    weekday: 'short', month: 'short', day: 'numeric'
                                                })}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>🕐</span>
                                                <span>{new Date(session.scheduled_at).toLocaleTimeString('en-US', {
                                                    hour: '2-digit', minute: '2-digit'
                                                })} • {session.duration_minutes} min</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            {session.status === 'SCHEDULED' && (
                                                <button
                                                    onClick={() => handleStartSession(session.id)}
                                                    className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"
                                                >
                                                    Start Session
                                                </button>
                                            )}
                                            {session.status === 'LIVE' && (
                                                <>
                                                    <Link
                                                        href={`/dashboard/staff/learning/sessions/${session.id}/room`}
                                                        className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 text-center"
                                                    >
                                                        Join Session
                                                    </Link>
                                                    <button
                                                        onClick={() => handleEndSession(session.id)}
                                                        className="py-2 px-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                                                    >
                                                        End
                                                    </button>
                                                </>
                                            )}
                                            <Link
                                                href={`/dashboard/staff/learning/sessions/${session.id}/edit`}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                            >
                                                <Edit2 className="w-4 h-4 text-gray-500" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // History View
                        pastSessions.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Past Sessions</h3>
                                <p className="text-gray-500">Your completed sessions will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pastSessions.map(session => (
                                    <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                <Video className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">{session.title}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })} • {session.duration_minutes} min
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.status === 'ENDED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {session.status}
                                            </span>
                                            <Link
                                                href={`/dashboard/staff/learning/sessions/${session.id}/summary`}
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                View Summary
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Study Circles Tab */}
            {activeTab === 'circles' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Study Circles</h2>
                        <button
                            onClick={() => {
                                setEditingCircleId(null);
                                setCircleForm({ name: '', description: '', course_id: undefined, subject_code: '', has_voice_room: false });
                                setShowCircleForm(true);
                            }}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Circle
                        </button>
                    </div>

                    {studyCircles.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Study Circles</h3>
                            <p className="text-gray-500 dark:text-gray-400">Create a circle to start a community for a subject.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {studyCircles.map(circle => (
                                <div key={circle.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                                            {circle.name.charAt(0)}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditCircle(circle)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCircle(circle.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{circle.name}</h3>
                                    {circle.subject_code && (
                                        <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">{circle.subject_code}</span>
                                    )}
                                    {circle.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{circle.description}</p>
                                    )}
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                            <Video className={`w-4 h-4 ${circle.has_voice_room ? 'text-green-500' : 'text-gray-300'}`} />
                                            <span>Voice {circle.has_voice_room ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        <Link
                                            href={`/dashboard/student/learning/circles`}
                                            className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                                        >
                                            View <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Knowledge Topics Tab */}
            {activeTab === 'topics' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Knowledge Topics</h2>
                        <Link
                            href="/dashboard/staff/learning/topics/create"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Topic
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                        </div>
                    ) : knowledgeTopics.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Topics</h3>
                            <p className="text-gray-500">Add topics to build the knowledge graph for students</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {knowledgeTopics.map(topic => (
                                <div key={topic.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                            <Brain className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{topic.name}</h3>
                                            {topic.subject && (
                                                <p className="text-sm text-gray-500">{topic.subject}</p>
                                            )}
                                        </div>
                                    </div>
                                    {topic.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{topic.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {topic.difficulty && (
                                            <span className={`px-2 py-1 rounded-full ${topic.difficulty === 'EASY' ? 'bg-green-100 text-green-600' :
                                                topic.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' :
                                                    'bg-red-100 text-red-600'
                                                }`}>
                                                {topic.difficulty}
                                            </span>
                                        )}
                                        {topic.estimated_hours && (
                                            <span> {topic.estimated_hours}h</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* Course Form Modal */}
            {showCourseForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Course</h3>
                            <button onClick={() => setShowCourseForm(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                                    <input
                                        type="text"
                                        value={courseForm.code}
                                        onChange={e => setCourseForm({ ...courseForm, code: e.target.value })}
                                        placeholder="CS201"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credits</label>
                                    <input
                                        type="number"
                                        value={courseForm.credits}
                                        onChange={e => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={courseForm.name}
                                    onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                                    placeholder="Data Structures"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={courseForm.department}
                                        onChange={e => setCourseForm({ ...courseForm, department: e.target.value })}
                                        placeholder="CSE"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                                    <input
                                        type="number"
                                        value={courseForm.semester}
                                        onChange={e => setCourseForm({ ...courseForm, semester: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    value={courseForm.description}
                                    onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleCreateCourse}
                                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Create Course
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enroll Modal */}
            {showEnrollModal && enrollCourse && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enroll Students</h3>
                                <p className="text-sm text-gray-500">{enrollCourse.code} - {enrollCourse.name}</p>
                            </div>
                            <button onClick={() => setShowEnrollModal(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                placeholder="Search students..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Select All */}
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">{selectedStudents.length} selected</span>
                            <button onClick={selectAllStudents} className="text-sm text-blue-600 hover:underline">
                                Select All ({filteredStudents.length})
                            </button>
                        </div>

                        {/* Student List */}
                        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                            {studentsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            ) : studentsError ? (
                                <div className="text-center py-8 text-red-500">{studentsError}</div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No students found</div>
                            ) : (
                                filteredStudents.map(student => (
                                    <label
                                        key={student.id}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(student.id)}
                                            onChange={() => toggleStudent(student.id)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {student.first_name} {student.last_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {student.register_number || 'No Reg #'} • {student.department || 'No Dept'}
                                            </div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        <button
                            onClick={handleEnroll}
                            disabled={enrolling || selectedStudents.length === 0}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {enrolling ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Enrolling...
                                </>
                            ) : (
                                <>
                                    <Users className="w-5 h-5" />
                                    Enroll {selectedStudents.length} Student(s)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Flashcard Form Modal */}
            {showFlashcardForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Flashcard Set</h3>
                            <button onClick={() => setShowFlashcardForm(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={flashcardForm.title}
                                    onChange={e => setFlashcardForm({ ...flashcardForm, title: e.target.value })}
                                    placeholder="Binary Trees Basics"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                                    <input
                                        type="text"
                                        value={flashcardForm.topic}
                                        onChange={e => setFlashcardForm({ ...flashcardForm, topic: e.target.value })}
                                        placeholder="Trees"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Code</label>
                                    <input
                                        type="text"
                                        value={flashcardForm.subject_code}
                                        onChange={e => setFlashcardForm({ ...flashcardForm, subject_code: e.target.value })}
                                        placeholder="CS201"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    value={flashcardForm.description}
                                    onChange={e => setFlashcardForm({ ...flashcardForm, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleCreateFlashcardSet}
                                className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Create Set
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Generation Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Flashcard Generator</h3>
                                    <p className="text-xs text-gray-500">Create flashcards from any topic</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAIModal(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                                <input
                                    type="text"
                                    value={generateTopic}
                                    onChange={e => setGenerateTopic(e.target.value)}
                                    placeholder="e.g., Photosynthesis, Binary Trees, French Revolution"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                                    <select
                                        value={generateDifficulty}
                                        onChange={e => setGenerateDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cards</label>
                                    <select
                                        value={generateCount}
                                        onChange={e => setGenerateCount(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value={5}>5 cards</option>
                                        <option value={10}>10 cards</option>
                                        <option value={15}>15 cards</option>
                                        <option value={20}>20 cards</option>
                                    </select>
                                </div>
                            </div>
                            {generateError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                    {generateError}
                                </div>
                            )}
                            <button
                                onClick={handleGenerateFlashcards}
                                disabled={generating || !generateTopic.trim()}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate {generateCount} Flashcards
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Study Circle Form Modal */}
            {showCircleForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingCircleId ? 'Edit Study Circle' : 'Create Study Circle'}
                            </h3>
                            <button onClick={() => {
                                setShowCircleForm(false);
                                setEditingCircleId(null);
                            }}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Circle Name</label>
                                <input
                                    type="text"
                                    value={circleForm.name}
                                    onChange={e => setCircleForm({ ...circleForm, name: e.target.value })}
                                    placeholder="CS201 - Data Structures Hub"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Code</label>
                                    <input
                                        type="text"
                                        value={circleForm.subject_code}
                                        onChange={e => setCircleForm({ ...circleForm, subject_code: e.target.value })}
                                        placeholder="CS201"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Linked Course</label>
                                    <select
                                        value={circleForm.course_id || ''}
                                        onChange={e => setCircleForm({ ...circleForm, course_id: e.target.value ? parseInt(e.target.value) : undefined })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">None</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    value={circleForm.description}
                                    onChange={e => setCircleForm({ ...circleForm, description: e.target.value })}
                                    rows={2}
                                    placeholder="A place to discuss data structures and algorithms"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="has_voice_circle"
                                    checked={circleForm.has_voice_room}
                                    onChange={e => setCircleForm({ ...circleForm, has_voice_room: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                />
                                <label htmlFor="has_voice_circle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Enable Voice Room (Jitsi)
                                </label>
                            </div>
                            <button
                                onClick={handleCreateCircle}
                                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 mt-2"
                            >
                                <Save className="w-4 h-4" />
                                {editingCircleId ? 'Update Study Circle' : 'Create Study Circle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
