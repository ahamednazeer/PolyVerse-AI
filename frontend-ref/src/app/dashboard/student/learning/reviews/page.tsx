'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    Star, ArrowLeft, MessageSquare, TrendingUp, ThumbsUp,
    AlertCircle, CheckCircle, Clock, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface Course {
    id: number;
    code: string;
    name: string;
}

interface ReviewAggregate {
    course_id: number;
    avg_difficulty: number;
    avg_clarity: number;
    avg_relevance: number;
    avg_overall: number;
    total_reviews: number;
}

interface ReviewWindow {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
}

export default function CourseReviewsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [aggregates, setAggregates] = useState<Record<number, ReviewAggregate>>({});
    const [reviewedCourses, setReviewedCourses] = useState<Set<number>>(new Set());
    const [activeWindow, setActiveWindow] = useState<ReviewWindow | null>(null);
    const [loading, setLoading] = useState(true);

    // Review form state
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [ratings, setRatings] = useState({
        difficulty: 3,
        clarity: 3,
        relevance: 3,
        overall: 3,
    });
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [coursesData, aggregatesData, myReviews, window] = await Promise.allSettled([
                api.getMyCourses(),
                api.getCourseAggregates(),
                api.getMyCourseReviews(),
                api.getCurrentReviewWindow(),
            ]);

            if (coursesData.status === 'fulfilled') {
                setCourses(coursesData.value);
            }

            if (aggregatesData.status === 'fulfilled') {
                const aggMap: Record<number, ReviewAggregate> = {};
                aggregatesData.value.forEach((agg: ReviewAggregate) => {
                    aggMap[agg.course_id] = agg;
                });
                setAggregates(aggMap);
            }

            if (myReviews.status === 'fulfilled') {
                const reviewed = new Set<number>();
                myReviews.value.forEach((review: { course_id: number }) => {
                    reviewed.add(review.course_id);
                });
                setReviewedCourses(reviewed);
            }

            if (window.status === 'fulfilled') {
                setActiveWindow(window.value);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!selectedCourse) return;

        try {
            setSubmitting(true);
            await api.submitCourseReview({
                course_id: selectedCourse.id,
                difficulty_rating: ratings.difficulty,
                clarity_rating: ratings.clarity,
                relevance_rating: ratings.relevance,
                overall_rating: ratings.overall,
                feedback_text: feedback || undefined,
            });

            setSubmitSuccess(true);
            setReviewedCourses(prev => new Set([...prev, selectedCourse.id]));

            setTimeout(() => {
                setShowForm(false);
                setSubmitSuccess(false);
                setSelectedCourse(null);
                setRatings({ difficulty: 3, clarity: 3, relevance: 3, overall: 3 });
                setFeedback('');
            }, 2000);
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to submit review. You may have already reviewed this course.');
        } finally {
            setSubmitting(false);
        }
    };

    const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className="focus:outline-none"
                    >
                        <Star
                            className={`w-8 h-8 transition-colors ${star <= value
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    // Review form modal
    if (showForm && selectedCourse) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Courses
                </button>

                {submitSuccess ? (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Review Submitted!</h2>
                        <p className="text-gray-600 dark:text-gray-400">Thank you for your feedback. It will be reviewed before publishing.</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Review: {selectedCourse.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">{selectedCourse.code}</p>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Your review is anonymous to faculty, but identifiable to administrators for moderation purposes.
                            </p>
                        </div>

                        <StarRating
                            label="Difficulty (1 = Very Hard, 5 = Very Easy)"
                            value={ratings.difficulty}
                            onChange={(v) => setRatings(r => ({ ...r, difficulty: v }))}
                        />

                        <StarRating
                            label="Clarity of Teaching"
                            value={ratings.clarity}
                            onChange={(v) => setRatings(r => ({ ...r, clarity: v }))}
                        />

                        <StarRating
                            label="Course Relevance"
                            value={ratings.relevance}
                            onChange={(v) => setRatings(r => ({ ...r, relevance: v }))}
                        />

                        <StarRating
                            label="Overall Rating"
                            value={ratings.overall}
                            onChange={(v) => setRatings(r => ({ ...r, overall: v }))}
                        />

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Additional Feedback (Optional)
                            </label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={4}
                                placeholder="Share your thoughts about the course..."
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Reviews with personal attacks or abusive content will be rejected.</p>
                        </div>

                        <button
                            onClick={handleSubmitReview}
                            disabled={submitting}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="w-5 h-5" />
                                    Submit Review
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <Link href="/dashboard/student/learning" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4">
                <ArrowLeft className="w-5 h-5" />
                Back to Learning Hub
            </Link>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="w-7 h-7 text-amber-500" />
                    Course Reviews
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Share your feedback anonymously to help improve teaching
                </p>
            </div>

            {/* Active Window Banner */}
            {activeWindow && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-6 h-6" />
                        <span className="font-semibold text-lg">Review Window Open</span>
                    </div>
                    <p className="text-purple-100 mb-1">{activeWindow.name}</p>
                    <p className="text-sm text-purple-200">
                        {formatDate(activeWindow.start_date)} — {formatDate(activeWindow.end_date)}
                    </p>
                </div>
            )}

            {/* Courses to Review */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Enrolled Courses</h2>
                {courses.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Courses Found</h3>
                        <p className="text-gray-500 dark:text-gray-400">You need to be enrolled in courses to review them</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map(course => {
                            const agg = aggregates[course.id];
                            const reviewed = reviewedCourses.has(course.id);

                            return (
                                <div
                                    key={course.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{course.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{course.code}</p>
                                        </div>
                                        {reviewed && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                                <CheckCircle className="w-3 h-3" />
                                                Reviewed
                                            </span>
                                        )}
                                    </div>

                                    {agg && (
                                        <div className="grid grid-cols-4 gap-2 mb-4">
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="text-lg font-bold text-amber-600">{agg.avg_overall.toFixed(1)}</div>
                                                <div className="text-xs text-gray-500">Overall</div>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="text-lg font-bold text-blue-600">{agg.avg_clarity.toFixed(1)}</div>
                                                <div className="text-xs text-gray-500">Clarity</div>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="text-lg font-bold text-green-600">{agg.avg_relevance.toFixed(1)}</div>
                                                <div className="text-xs text-gray-500">Relevance</div>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="text-lg font-bold text-purple-600">{agg.total_reviews}</div>
                                                <div className="text-xs text-gray-500">Reviews</div>
                                            </div>
                                        </div>
                                    )}

                                    {!reviewed ? (
                                        <button
                                            onClick={() => {
                                                setSelectedCourse(course);
                                                setShowForm(true);
                                            }}
                                            className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Star className="w-4 h-4" />
                                            Write Review
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                                        >
                                            Already Reviewed
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
