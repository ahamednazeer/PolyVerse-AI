'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
    Trophy, Zap, Clock, CheckCircle, XCircle, ArrowLeft,
    Users, Star, Target, TrendingUp, Award, Play, Loader2, RefreshCw, Sparkles, X
} from 'lucide-react';
import Link from 'next/link';

interface FlashcardSet {
    id: number;
    title: string;
    description?: string;
    topic?: string;
    total_cards: number;
    times_played: number;
}

interface BattleQuestion {
    index: number;
    total: number;
    question: string;
    options: string[];
    hint?: string;
    time_limit: number;
}

interface BattleStats {
    total_battles: number;
    wins: number;
    losses: number;
    win_rate: number;
    average_score: number;
}

type GameState = 'idle' | 'selecting' | 'waiting' | 'playing' | 'result';

export default function FlashcardBattlesPage() {
    const [sets, setSets] = useState<FlashcardSet[]>([]);
    const [stats, setStats] = useState<BattleStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Battle state
    const [gameState, setGameState] = useState<GameState>('idle');
    const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
    const [battleId, setBattleId] = useState<number | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<BattleQuestion | null>(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctAnswer: number } | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);

    // AI Generation state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateTopic, setGenerateTopic] = useState('');
    const [generateDifficulty, setGenerateDifficulty] = useState('medium');
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === 'playing' && timeLeft > 0 && !selectedAnswer) {
            timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0 && gameState === 'playing' && !selectedAnswer) {
            handleTimeout();
        }
        return () => clearTimeout(timer);
    }, [timeLeft, gameState, selectedAnswer]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [setsData, statsData] = await Promise.all([
                api.getFlashcardSets(),
                api.getMyFlashcardStats(),
            ]);
            setSets(setsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateFlashcards = async () => {
        console.log('Generate button clicked, topic:', generateTopic);
        if (!generateTopic.trim()) {
            console.log('Topic is empty, returning');
            return;
        }

        try {
            setGenerating(true);
            setGenerateError('');
            console.log('Calling API...');


            await api.generateFlashcardsFromTopic(generateTopic, {
                difficulty: generateDifficulty,
                num_cards: 10,
                auto_publish: true
            });

            // Reload data and close modal
            await loadData();
            setShowGenerateModal(false);
            setGenerateTopic('');
        } catch (error: any) {
            setGenerateError(error.message || 'Failed to generate flashcards');
        } finally {
            setGenerating(false);
        }
    };

    const startBattle = async (set: FlashcardSet) => {
        // Check if set has cards
        if (set.total_cards === 0) {
            alert('This flashcard set has no cards. Please add cards before starting a battle.');
            return;
        }

        try {
            setSelectedSet(set);
            setGameState('waiting');

            const battle = await api.createBattle(set.id, 'PUBLIC', 10);
            setBattleId(battle.id);

            // Start the battle
            await api.startBattle(battle.id);

            // Load first question
            await loadQuestion(battle.id, 0);

            setGameState('playing');
            setScore(0);
            setCorrectAnswers(0);
            setQuestionIndex(0);
        } catch (error: any) {
            console.error('Error starting battle:', error);
            alert(error?.message || 'Failed to start battle. Please try again.');
            setGameState('idle');
        }
    };

    const loadQuestion = async (id: number, index: number) => {
        try {
            const question = await api.getBattleQuestion(id, index);
            setCurrentQuestion(question);
            setTimeLeft(question.time_limit);
            setSelectedAnswer(null);
            setAnswerResult(null);
            setStartTime(Date.now());
        } catch (error) {
            console.error('Error loading question:', error);
        }
    };

    const handleAnswer = async (answerIndex: number) => {
        if (!battleId || selectedAnswer !== null) return;

        setSelectedAnswer(answerIndex);
        const timeMs = Date.now() - (startTime || Date.now());

        try {
            const result = await api.submitBattleAnswer(battleId, questionIndex, answerIndex, timeMs);
            setAnswerResult({
                correct: result.is_correct,
                correctAnswer: result.correct_answer,
            });

            if (result.is_correct) {
                setScore(s => s + result.score_earned);
                setCorrectAnswers(c => c + 1);
            }

            // Move to next question after delay
            setTimeout(() => {
                if (currentQuestion && questionIndex < currentQuestion.total - 1) {
                    const nextIndex = questionIndex + 1;
                    setQuestionIndex(nextIndex);
                    loadQuestion(battleId, nextIndex);
                } else {
                    endBattle();
                }
            }, 1500);
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    };

    const handleTimeout = () => {
        if (!battleId) return;
        handleAnswer(-1); // Submit timeout as wrong answer
    };

    const endBattle = async () => {
        if (!battleId) return;

        try {
            await api.endBattle(battleId);
        } catch (error) {
            console.error('Error ending battle:', error);
        }

        setGameState('result');
    };

    const resetGame = () => {
        setGameState('idle');
        setBattleId(null);
        setSelectedSet(null);
        setCurrentQuestion(null);
        setQuestionIndex(0);
        setScore(0);
        setCorrectAnswers(0);
        loadData();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
            </div>
        );
    }

    // Game in progress
    if (gameState === 'playing' && currentQuestion) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold text-amber-600">
                                <Zap className="w-8 h-8 inline mr-2" />
                                Battle Mode
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <div className="text-sm text-gray-500">Score</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{score}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-500">Question</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {questionIndex + 1}/{currentQuestion.total}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                Time Left
                            </span>
                            <span className={`font-bold text-xl ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                                {timeLeft}s
                            </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-amber-500'}`}
                                style={{ width: `${(timeLeft / currentQuestion.time_limit) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                            {currentQuestion.question}
                        </h2>

                        {currentQuestion.hint && (
                            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 italic">
                                💡 Hint: {currentQuestion.hint}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            {currentQuestion.options.map((option, idx) => {
                                let bgClass = 'bg-gray-50 dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-gray-200 dark:border-gray-600';

                                if (selectedAnswer !== null) {
                                    if (idx === answerResult?.correctAnswer) {
                                        bgClass = 'bg-green-100 dark:bg-green-900/30 border-green-500';
                                    } else if (idx === selectedAnswer && !answerResult?.correct) {
                                        bgClass = 'bg-red-100 dark:bg-red-900/30 border-red-500';
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(idx)}
                                        disabled={selectedAnswer !== null}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${bgClass} ${selectedAnswer === null ? 'cursor-pointer' : 'cursor-default'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center font-semibold text-amber-700 dark:text-amber-400">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="text-gray-900 dark:text-white">{option}</span>
                                            {selectedAnswer !== null && idx === answerResult?.correctAnswer && (
                                                <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                                            )}
                                            {selectedAnswer === idx && !answerResult?.correct && (
                                                <XCircle className="w-5 h-5 text-red-500 ml-auto" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        {Array.from({ length: currentQuestion.total }).map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-2 flex-1 rounded-full ${idx < questionIndex
                                    ? 'bg-green-500'
                                    : idx === questionIndex
                                        ? 'bg-amber-500'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Waiting for battle
    if (gameState === 'waiting') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-amber-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Starting Battle...</h2>
                    <p className="text-gray-500">Get ready for {selectedSet?.title}</p>
                </div>
            </div>
        );
    }

    // Results screen
    if (gameState === 'result') {
        const percentage = currentQuestion ? Math.round((correctAnswers / currentQuestion.total) * 100) : 0;

        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-6">
                <div className="max-w-lg mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-10 h-10 text-white" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Battle Complete!</h1>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">{selectedSet?.title}</p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                <div className="text-3xl font-bold text-amber-600">{score}</div>
                                <div className="text-sm text-gray-500">Total Score</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                <div className="text-3xl font-bold text-green-600">{percentage}%</div>
                                <div className="text-sm text-gray-500">Accuracy</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                <div className="text-3xl font-bold text-blue-600">{correctAnswers}</div>
                                <div className="text-sm text-gray-500">Correct</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                <div className="text-3xl font-bold text-gray-600">{currentQuestion?.total || 10}</div>
                                <div className="text-sm text-gray-500">Questions</div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={resetGame}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Back to Sets
                            </button>
                            <button
                                onClick={() => selectedSet && startBattle(selectedSet)}
                                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Play Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main menu
    return (
        <>
            <div className="p-6 space-y-6">
                <Link href="/dashboard/student/learning" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Learning Hub
                </Link>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Trophy className="w-7 h-7 text-amber-500" />
                            Flashcard Battles
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Challenge yourself and compete for the top spot!
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_battles}</div>
                                    <div className="text-sm text-gray-500">Battles</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <Trophy className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.wins}</div>
                                    <div className="text-sm text-gray-500">Wins</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.win_rate.toFixed(0)}%</div>
                                    <div className="text-sm text-gray-500">Win Rate</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Star className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.average_score.toFixed(0)}</div>
                                    <div className="text-sm text-gray-500">Avg Score</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Flashcard Sets */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Choose a Set to Battle</h2>
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 font-medium"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate with AI
                        </button>
                    </div>
                    {sets.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Flashcard Sets Available</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Generate flashcards using AI to get started!</p>
                            <button
                                onClick={() => setShowGenerateModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 font-medium mx-auto"
                            >
                                <Sparkles className="w-5 h-5" />
                                Generate Flashcards with AI
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sets.map(set => (
                                <div key={set.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{set.title}</h3>
                                    {set.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{set.description}</p>
                                    )}
                                    {set.topic && (
                                        <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full mb-3">
                                            {set.topic}
                                        </span>
                                    )}
                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        <span>{set.total_cards} cards</span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {set.times_played} plays
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => startBattle(set)}
                                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play className="w-4 h-4" />
                                        Start Battle
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Generate Modal */}
            {
                showGenerateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-purple-500" />
                                    Generate Flashcards with AI
                                </h3>
                                <button
                                    onClick={() => setShowGenerateModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Topic *
                                    </label>
                                    <input
                                        type="text"
                                        value={generateTopic}
                                        onChange={(e) => setGenerateTopic(e.target.value)}
                                        placeholder="e.g., Data Structures, Machine Learning, Indian History"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Difficulty Level
                                    </label>
                                    <select
                                        value={generateDifficulty}
                                        onChange={(e) => setGenerateDifficulty(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="easy">Easy - Basic definitions & facts</option>
                                        <option value="medium">Medium - Understanding concepts</option>
                                        <option value="hard">Hard - Analysis & application</option>
                                    </select>
                                </div>

                                {generateError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                        {generateError}
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerateFlashcards}
                                    disabled={generating || !generateTopic.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Generating... (this may take a minute)
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Generate 10 Flashcards
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                    AI will generate 10 flashcards based on the topic. You can start a battle immediately after generation.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
