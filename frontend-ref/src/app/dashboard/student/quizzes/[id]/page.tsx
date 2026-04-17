'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { Clock, Question, CheckCircle, XCircle } from '@phosphor-icons/react';

interface QuizQuestion {
    id: number;
    question_text: string;
    options: string[];
    order: number;
}

interface QuizData {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    total_questions: number;
    questions: QuizQuestion[];
    is_attempted: boolean;
    attempt_score?: number;
}

export default function QuizAttemptPage() {
    const params = useParams();
    const router = useRouter();
    const quizId = Number(params.id);

    const [user, setUser] = useState<any>(null);
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [userData, quizData] = await Promise.all([
                    api.getMe(),
                    api.getQuizForStudent(quizId),
                ]);
                setUser(userData);
                setQuiz(quizData);

                if (quizData.is_attempted) {
                    setResult({
                        score: quizData.attempt_score,
                        total_questions: quizData.total_questions
                    });
                } else {
                    // Start attempt on backend? Not yet. Backend `start_attempt` creates an attempt record.
                    // We should call `start_attempt` when user clicks "Start Quiz".
                    // But for simplicity, we assume hitting this page starts it or shows a "Start" button.
                    // Let's show a start screen first.
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [quizId]);

    const [started, setStarted] = useState(false);

    const handleStart = async () => {
        try {
            await api.startQuizAttempt(quizId);
            setStarted(true);
            setTimeLeft((quiz?.duration_minutes || 10) * 60);

            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error: any) {
            alert(error.message || 'Failed to start quiz');
        }
    }

    const handleAnswer = (questionId: number, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [String(questionId)]: optionIndex }));
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const res = await api.submitQuizAttempt(quizId, answers);
            setResult(res);
        } catch (error: any) {
            alert(error.message || 'Submission failed');
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-slate-500 font-mono">Loading...</div>
            </div>
        );
    }

    // Result Screen
    if (result) {
        return (
            <div className="max-w-2xl mx-auto space-y-8 mt-10">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-8 text-center animate-scale-in">
                    <div className="inline-flex p-4 bg-slate-900 rounded-full mb-6">
                        <CheckCircle size={48} className="text-green-500" weight="fill" />
                    </div>
                    <h1 className="text-3xl font-chivo font-bold uppercase tracking-wider mb-2">Quiz Completed!</h1>
                    <p className="text-slate-400 mb-8">You have successfully submitted your answers.</p>

                    <div className="bg-slate-900/50 p-6 rounded-sm border border-slate-800 inline-block min-w-[200px]">
                        <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Final Score</p>
                        <p className="text-4xl font-mono font-bold text-white">
                            {result.score} <span className="text-xl text-slate-500">/ {result.total_questions}</span>
                        </p>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => router.push('/dashboard/student/quizzes')}
                            className="btn-primary"
                        >
                            Back to Quizzes
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Start Screen
    if (!started && !quiz?.is_attempted) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 mt-10">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-8 text-center">
                    <h1 className="text-3xl font-chivo font-bold uppercase tracking-wider mb-4">{quiz?.title}</h1>
                    <p className="text-slate-400 mb-8 max-w-lg mx-auto">{quiz?.description || "Get ready to test your knowledge. Once you start, the timer will begin and you cannot pause."}</p>

                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
                        <div className="bg-slate-900/50 p-4 rounded-sm border border-slate-800">
                            <Clock size={24} className="text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Duration</p>
                            <p className="font-bold text-white">{quiz?.duration_minutes} Minutes</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-sm border border-slate-800">
                            <Question size={24} className="text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Questions</p>
                            <p className="font-bold text-white">{quiz?.total_questions} Total</p>
                        </div>
                    </div>

                    <button onClick={handleStart} className="btn-primary px-8 py-3 text-lg">
                        Start Quiz
                    </button>
                </div>
            </div>
        );
    }

    // Quiz Interface
    return (
        <div className="max-w-3xl mx-auto pb-20">
            {/* Header / Timer */}
            <div className="sticky top-[73px] z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 py-4 mb-8 flex justify-between items-center px-4 -mx-4">
                <h2 className="font-bold text-slate-200 truncate pr-4">{quiz?.title}</h2>
                <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                    <Clock weight="fill" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="space-y-8">
                {quiz?.questions.map((q, qIndex) => (
                    <div key={q.id} className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                        <h3 className="text-lg font-medium text-slate-100 mb-4 flex items-start gap-3">
                            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-sm mt-1">Q{qIndex + 1}</span>
                            {q.question_text}
                        </h3>

                        <div className="space-y-3">
                            {q.options.map((option, oIndex) => (
                                <label
                                    key={oIndex}
                                    className={`flex items-center gap-3 p-4 rounded-sm border cursor-pointer transition-all ${answers[String(q.id)] === oIndex
                                        ? 'bg-blue-900/20 border-blue-500 text-blue-100'
                                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${answers[String(q.id)] === oIndex ? 'border-blue-400' : 'border-slate-500'
                                        }`}>
                                        {answers[String(q.id)] === oIndex && <div className="w-2 h-2 bg-blue-400 rounded-full" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name={`question-${q.id}`}
                                        className="hidden"
                                        checked={answers[String(q.id)] === oIndex}
                                        onChange={() => handleAnswer(q.id, oIndex)}
                                    />
                                    <span className="text-sm">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 border-t border-slate-800 flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary max-w-xs w-full"
                >
                    {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
            </div>
        </div>
    );
}
