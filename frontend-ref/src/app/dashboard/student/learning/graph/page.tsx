'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
    ArrowLeft, Brain, Target, Lightbulb, TrendingUp, CheckCircle,
    Circle, AlertTriangle, ChevronRight, BookOpen, Clock, Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface TopicNode {
    id: number;
    name: string;
    subject_code?: string;
    difficulty: number;
    x: number | null;
    y: number | null;
    status: string;
    progress_percent: number;
    confidence_score: number | null;
}

interface GraphEdge {
    from: number;
    to: number;
    strength: string;
}

interface KnowledgeGraphData {
    nodes: TopicNode[];
    edges: GraphEdge[];
}

interface LearningPath {
    id: number;
    name: string;
    description?: string;
    estimated_hours?: number;
}

export default function KnowledgeGraphPage() {
    const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
    const [weakAreas, setWeakAreas] = useState<TopicNode[]>([]);
    const [suggestedTopics, setSuggestedTopics] = useState<TopicNode[]>([]);
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null);
    const [view, setView] = useState<'graph' | 'list' | 'paths'>('graph');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [graphRes, weakRes, suggestedRes, pathsRes] = await Promise.allSettled([
                api.getMyKnowledgeGraph(),
                api.getMyWeakAreas(),
                api.getSuggestedTopics(),
                api.getLearningPaths(),
            ]);

            if (graphRes.status === 'fulfilled') setGraphData(graphRes.value);
            if (weakRes.status === 'fulfilled') setWeakAreas(weakRes.value);
            if (suggestedRes.status === 'fulfilled') setSuggestedTopics(suggestedRes.value);
            if (pathsRes.status === 'fulfilled') setLearningPaths(pathsRes.value);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-500';
            case 'IN_PROGRESS': return 'bg-blue-500';
            case 'NEEDS_REVIEW': return 'bg-amber-500';
            default: return 'bg-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'IN_PROGRESS': return <Circle className="w-4 h-4 text-blue-500" />;
            case 'NEEDS_REVIEW': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Circle className="w-4 h-4 text-gray-400" />;
        }
    };

    const getDifficultyLabel = (level: number) => {
        const labels = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];
        return labels[Math.min(level - 1, 4)] || 'Unknown';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Brain className="w-7 h-7 text-purple-500" />
                        Knowledge Graph
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Visualize your learning journey and track progress
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {[
                        { id: 'graph', label: 'Graph' },
                        { id: 'list', label: 'List' },
                        { id: 'paths', label: 'Paths' },
                    ].map(v => (
                        <button
                            key={v.id}
                            onClick={() => setView(v.id as typeof view)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === v.id
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Target className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {graphData?.nodes.length || 0}
                            </div>
                            <div className="text-sm text-gray-500">Topics</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {graphData?.nodes.filter(n => n.status === 'COMPLETED').length || 0}
                            </div>
                            <div className="text-sm text-gray-500">Completed</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {graphData?.nodes.filter(n => n.status === 'IN_PROGRESS').length || 0}
                            </div>
                            <div className="text-sm text-gray-500">In Progress</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {weakAreas.length}
                            </div>
                            <div className="text-sm text-gray-500">Weak Areas</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Graph View */}
            {view === 'graph' && graphData && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Topic Map</h2>

                    {graphData.nodes.length === 0 ? (
                        <div className="text-center py-12">
                            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No topics available yet</p>
                        </div>
                    ) : (
                        <div className="relative min-h-[400px] bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                            {/* Simple grid layout for nodes */}
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                                {graphData.nodes.map(node => (
                                    <button
                                        key={node.id}
                                        onClick={() => setSelectedTopic(node)}
                                        className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-lg ${selectedTopic?.id === node.id
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                                            }`}
                                    >
                                        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(node.status)}`}></div>
                                        <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">{node.name}</h3>
                                        {node.subject_code && (
                                            <span className="text-xs text-gray-500">{node.subject_code}</span>
                                        )}
                                        <div className="mt-2">
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                                                    style={{ width: `${node.progress_percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected Topic Details */}
                    {selectedTopic && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{selectedTopic.name}</h3>
                                    <p className="text-sm text-gray-500">{selectedTopic.subject_code}</p>
                                </div>
                                {getStatusIcon(selectedTopic.status)}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Progress</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{selectedTopic.progress_percent}%</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Confidence</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {selectedTopic.confidence_score ?? 'N/A'}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Difficulty</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {getDifficultyLabel(selectedTopic.difficulty)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* List View */}
            {view === 'list' && graphData && (
                <div className="space-y-4">
                    {/* Suggested Next Topics */}
                    {suggestedTopics.length > 0 && (
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-5 h-5" />
                                <h2 className="font-semibold">Suggested Next Topics</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {suggestedTopics.slice(0, 4).map(topic => (
                                    <div key={topic.id} className="bg-white/10 rounded-lg p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{topic.name}</div>
                                            <div className="text-sm text-purple-200">{getDifficultyLabel(topic.difficulty)}</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weak Areas */}
                    {weakAreas.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <h2 className="font-semibold text-gray-900 dark:text-white">Topics Needing Review</h2>
                            </div>
                            <div className="space-y-2">
                                {weakAreas.map(topic => (
                                    <div key={topic.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                                                <Lightbulb className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{topic.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    Confidence: {topic.confidence_score ?? 0}%
                                                </div>
                                            </div>
                                        </div>
                                        <button className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                                            Review
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Topics */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">All Topics</h2>
                        <div className="space-y-2">
                            {graphData.nodes.map(topic => (
                                <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(topic.status)}
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{topic.name}</div>
                                            <div className="text-sm text-gray-500">{topic.subject_code}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24">
                                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 transition-all"
                                                    style={{ width: `${topic.progress_percent}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm text-gray-500 w-12 text-right">{topic.progress_percent}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Paths View */}
            {view === 'paths' && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Learning Paths</h2>

                    {learningPaths.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Learning Paths</h3>
                            <p className="text-gray-500 dark:text-gray-400">Learning paths will appear here when created by faculty</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {learningPaths.map(path => (
                                <div key={path.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                            <BookOpen className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{path.name}</h3>
                                            {path.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{path.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    {path.estimated_hours && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                            <Clock className="w-4 h-4" />
                                            {path.estimated_hours} hours estimated
                                        </div>
                                    )}
                                    <button className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                                        Start Path
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
