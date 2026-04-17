'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Question, Plus, Trash, Clock, FilePdf, X, Check, CaretDown, CaretUp, Robot, Pulse, Sparkle } from '@phosphor-icons/react';

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    total_questions: number;
    pdf_id: number;
    is_published: boolean;
}

interface PDF {
    id: number;
    title: string;
}

interface QuestionData {
    question_text: string;
    options: string[];
    correct_answer: number;
    order: number;
}

interface QuizFormData {
    pdf_id: number;
    title: string;
    description: string;
    duration_minutes: number;
    day_unlock: number;
    show_answers_after_completion: boolean;
    questions: QuestionData[];
}

export default function AdminQuizzesPage() {
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [selectedPdf, setSelectedPdf] = useState<number | null>(null);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [numQuestionsToGenerate, setNumQuestionsToGenerate] = useState(5);

    const [formData, setFormData] = useState<QuizFormData>({
        pdf_id: 0,
        title: '',
        description: '',
        duration_minutes: 30,
        day_unlock: 0,
        show_answers_after_completion: false,
        questions: []
    });

    useEffect(() => {
        fetchPDFs();
    }, []);

    useEffect(() => {
        if (selectedPdf) {
            fetchQuizzes(selectedPdf);
        } else {
            setQuizzes([]);
        }
    }, [selectedPdf]);

    const fetchPDFs = async () => {
        try {
            const data = await api.getPDFs();
            let pdfList: PDF[] = [];

            if (Array.isArray(data)) {
                pdfList = data;
            } else if (data && Array.isArray(data.items)) {
                pdfList = data.items;
            } else if (data && Array.isArray(data.pdfs)) {
                pdfList = data.pdfs;
            }

            setPdfs(pdfList);
            if (pdfList.length > 0) {
                setSelectedPdf(pdfList[0].id);
            }
        } catch (err) {
            console.error('Failed to load PDFs', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizzes = async (pdfId: number) => {
        try {
            const data = await api.getQuizzes(pdfId);
            if (Array.isArray(data)) {
                setQuizzes(data);
            } else if (data && Array.isArray(data.quizzes)) {
                setQuizzes(data.quizzes);
            } else if (data && Array.isArray(data.items)) {
                setQuizzes(data.items);
            } else {
                setQuizzes([]);
            }
        } catch (err) {
            console.error('Failed to load quizzes', err);
            setQuizzes([]);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;
        try {
            await api.deleteQuiz(id);
            setQuizzes(quizzes.filter(q => q.id !== id));
        } catch (err) {
            alert('Failed to delete quiz');
        }
    };

    const handlePublish = async (id: number) => {
        try {
            await api.publishQuiz(id);
            setQuizzes(quizzes.map(q => q.id === id ? { ...q, is_published: true } : q));
        } catch (err: any) {
            alert(err.message || 'Failed to publish quiz');
        }
    };

    const handleAutoGenerate = async () => {
        if (!selectedPdf) {
            alert('Please select a PDF first');
            return;
        }

        setGenerating(true);
        try {
            const pdfTitle = pdfs.find(p => p.id === selectedPdf)?.title || 'Selected PDF';
            const result = await api.generateQuiz(selectedPdf, numQuestionsToGenerate, `Quiz: ${pdfTitle}`);

            setFormData({
                pdf_id: selectedPdf,
                title: result.title || `Quiz: ${pdfTitle}`,
                description: result.description || 'Auto-generated quiz based on PDF content',
                duration_minutes: 30,
                day_unlock: 1,
                show_answers_after_completion: false,
                questions: result.questions.map((q: any, i: number) => ({
                    question_text: q.question_text,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    order: i
                }))
            });

            setShowModal(true);
        } catch (err: any) {
            alert(err.message || 'Failed to generate quiz. Make sure GROQ API is configured.');
        } finally {
            setGenerating(false);
        }
    };

    const openCreateModal = () => {
        if (!selectedPdf) {
            alert('Please select a PDF first');
            return;
        }
        setFormData({
            pdf_id: selectedPdf,
            title: '',
            description: '',
            duration_minutes: 30,
            day_unlock: 1,
            show_answers_after_completion: false,
            questions: [createEmptyQuestion(0)]
        });
        setShowModal(true);
    };

    const createEmptyQuestion = (order: number): QuestionData => ({
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        order
    });

    const addQuestion = () => {
        setFormData({
            ...formData,
            questions: [...formData.questions, createEmptyQuestion(formData.questions.length)]
        });
    };

    const removeQuestion = (index: number) => {
        const newQuestions = formData.questions.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            questions: newQuestions.map((q, i) => ({ ...q, order: i }))
        });
    };

    const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
        const newQuestions = [...formData.questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setFormData({ ...formData, questions: newQuestions });
    };

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newQuestions = [...formData.questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[optIndex] = value;
        newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
        setFormData({ ...formData, questions: newQuestions });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.title.trim()) {
            alert('Please enter a quiz title');
            return;
        }
        if (formData.questions.length === 0) {
            alert('Please add at least one question');
            return;
        }
        for (let i = 0; i < formData.questions.length; i++) {
            const q = formData.questions[i];
            if (!q.question_text.trim()) {
                alert(`Question ${i + 1} is empty`);
                return;
            }
            const filledOptions = q.options.filter(o => o.trim());
            if (filledOptions.length < 2) {
                alert(`Question ${i + 1} needs at least 2 options`);
                return;
            }
        }

        setSubmitting(true);
        try {
            await api.createQuiz(formData);
            setShowModal(false);
            if (selectedPdf) {
                fetchQuizzes(selectedPdf);
            }
            alert('Quiz created successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to create quiz');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Quizzes...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Question size={28} weight="duotone" className="text-indigo-400" />
                        Quiz Management
                    </h1>
                    <p className="text-slate-500 mt-1">Create and manage quizzes for materials</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Auto-Generate with AI */}
                    <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1.5 pr-3">
                        <select
                            value={numQuestionsToGenerate}
                            onChange={(e) => setNumQuestionsToGenerate(parseInt(e.target.value))}
                            className="bg-slate-700 border-0 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none"
                            disabled={!selectedPdf || generating}
                        >
                            <option value={3}>3 Qs</option>
                            <option value={5}>5 Qs</option>
                            <option value={10}>10 Qs</option>
                        </select>
                        <button
                            onClick={handleAutoGenerate}
                            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                            disabled={!selectedPdf || generating}
                        >
                            {generating ? (
                                <><div className="w-4 h-4 rounded-full border-2 border-purple-700 border-t-purple-300 animate-spin" /> Generating...</>
                            ) : (
                                <><Robot size={18} weight="duotone" /> Auto-Generate</>
                            )}
                        </button>
                    </div>

                    {/* Manual Create */}
                    <button
                        onClick={openCreateModal}
                        className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl px-5 py-2.5 flex items-center gap-2 font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition-all hover:scale-[1.02]"
                        disabled={!selectedPdf}
                    >
                        <Plus size={20} weight="bold" /> Create Quiz
                    </button>
                </div>
            </div>

            <div className="flex gap-6">
                {/* PDF Sidebar Selection */}
                <div className="w-64 flex-shrink-0">
                    <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Filter by PDF</h3>
                    <div className="space-y-1">
                        {pdfs.map(pdf => (
                            <button
                                key={pdf.id}
                                onClick={() => setSelectedPdf(pdf.id)}
                                className={`w-full text-left p-3 rounded-xl text-sm truncate transition-all ${selectedPdf === pdf.id
                                    ? 'bg-blue-950/50 text-blue-400 border border-blue-900'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <FilePdf size={16} weight="duotone" />
                                    <span className="truncate">{pdf.title}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quiz List */}
                <div className="flex-1">
                    <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">
                        Quizzes {selectedPdf && pdfs.find(p => p.id === selectedPdf)?.title && `for ${pdfs.find(p => p.id === selectedPdf)?.title}`}
                    </h3>

                    <div className="space-y-4">
                        {quizzes.length > 0 ? quizzes.map((quiz) => (
                            <div key={quiz.id} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 flex items-center justify-between group hover:border-slate-600 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-200 text-lg">{quiz.title}</h4>
                                        {quiz.is_published ? (
                                            <span className="px-2.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-lg font-bold">Published</span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg font-bold">Draft</span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 text-sm mb-3">{quiz.description}</p>
                                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                                        <span className="flex items-center gap-1"><Clock size={14} weight="duotone" /> {quiz.duration_minutes} mins</span>
                                        <span className="flex items-center gap-1"><Question size={14} weight="duotone" /> {quiz.total_questions} questions</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!quiz.is_published && (
                                        <button
                                            onClick={() => handlePublish(quiz.id)}
                                            className="p-2.5 text-slate-400 hover:text-green-400 hover:bg-green-900/30 rounded-xl transition-colors"
                                            title="Publish"
                                        >
                                            <Check size={18} weight="bold" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(quiz.id)}
                                        className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-xl transition-colors"
                                        title="Delete"
                                    >
                                        <Trash size={18} weight="duotone" />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-slate-800/20 border border-dashed border-slate-800 rounded-xl p-16 text-center text-slate-500 relative overflow-hidden">
                                <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                                <Question size={56} weight="duotone" className="mx-auto mb-4 text-slate-600" />
                                <p>No quizzes found for this PDF.</p>
                                {selectedPdf && <p className="text-sm mt-2">Click "Create Quiz" to add one.</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Quiz Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-xl font-bold">Create Quiz</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-800 rounded">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Quiz Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:border-blue-500 focus:outline-none"
                                        placeholder="Enter quiz title"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:border-blue-500 focus:outline-none"
                                        placeholder="Enter quiz description"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:border-blue-500 focus:outline-none"
                                        min={1}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Unlock after Day</label>
                                    <input
                                        type="number"
                                        value={formData.day_unlock}
                                        onChange={(e) => setFormData({ ...formData, day_unlock: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:border-blue-500 focus:outline-none"
                                        min={0}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.show_answers_after_completion}
                                            onChange={(e) => setFormData({ ...formData, show_answers_after_completion: e.target.checked })}
                                            className="w-5 h-5 bg-slate-800 border border-slate-600 rounded accent-green-500"
                                        />
                                        <span className="text-sm font-medium text-slate-300">Show correct answers after quiz completion</span>
                                    </label>
                                    <p className="text-xs text-slate-500 mt-1 ml-8">When enabled, students can review correct answers after submitting the quiz</p>
                                </div>
                            </div>

                            {/* Questions */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">Questions ({formData.questions.length})</h3>
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        <Plus size={16} /> Add Question
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.questions.map((q, qIndex) => (
                                        <div key={qIndex} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-sm font-mono text-slate-500">Question {qIndex + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(qIndex)}
                                                    className="text-slate-500 hover:text-red-400"
                                                    disabled={formData.questions.length === 1}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>

                                            <input
                                                type="text"
                                                value={q.question_text}
                                                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded mb-3 focus:border-blue-500 focus:outline-none"
                                                placeholder="Enter question text"
                                            />

                                            <div className="grid grid-cols-2 gap-2">
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex} className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuestion(qIndex, 'correct_answer', optIndex)}
                                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${q.correct_answer === optIndex
                                                                ? 'border-green-500 bg-green-500 text-white'
                                                                : 'border-slate-600 hover:border-slate-400'
                                                                }`}
                                                            title="Mark as correct"
                                                        >
                                                            {q.correct_answer === optIndex && <Check size={14} weight="bold" />}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                                            className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                            >
                                {submitting ? 'Creating...' : 'Create Quiz'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
