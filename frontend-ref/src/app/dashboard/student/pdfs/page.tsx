'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { Books, Clock, FileText, Pulse, Sparkle, ArrowRight, CalendarBlank } from '@phosphor-icons/react';

export default function StudentPDFsPage() {
    const router = useRouter();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [pdfs, setPdfs] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const assignmentsData = await api.getMyAssignments();
                setAssignments(assignmentsData);

                const pdfDetails: Record<number, any> = {};
                for (const assignment of assignmentsData) {
                    try {
                        const pdf = await api.getPDF(assignment.pdf_id);
                        pdfDetails[assignment.pdf_id] = pdf;
                    } catch (e) {
                        console.error(`Failed to fetch PDF ${assignment.pdf_id}:`, e);
                    }
                }
                setPdfs(pdfDetails);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading PDFs...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-chivo font-bold uppercase tracking-wider text-slate-100 flex items-center gap-3">
                    <Books size={28} weight="duotone" className="text-blue-400" />
                    My PDFs
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Your assigned reading materials</p>
            </div>

            {assignments.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-16 text-center relative overflow-hidden">
                    <Sparkle size={120} weight="duotone" className="absolute -right-6 -bottom-6 text-slate-800/30" />
                    <Books size={64} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wider">No PDFs Assigned</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">You don't have any reading materials assigned yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((assignment) => {
                        const pdf = pdfs[assignment.pdf_id];
                        return (
                            <div
                                key={assignment.id}
                                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
                                onClick={() => router.push(`/dashboard/student/read/${assignment.pdf_id}`)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-950/60 rounded-xl group-hover:bg-blue-900/60 transition-colors">
                                        <FileText size={32} weight="duotone" className="text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-slate-100 mb-1 truncate group-hover:text-blue-400 transition-colors">
                                            {pdf?.title || `PDF #${assignment.pdf_id}`}
                                        </h3>
                                        {pdf?.subject && (
                                            <p className="text-sm text-slate-400 mb-3">{pdf.subject}</p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                            <Clock size={14} weight="duotone" />
                                            {pdf?.min_daily_reading_minutes || 5} min/day required
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                                </div>

                                {pdf && (
                                    <div className="mt-5 pt-4 border-t border-slate-700/40 flex items-center justify-between text-xs text-slate-500 font-mono">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarBlank size={14} weight="duotone" />
                                            <span>{pdf.start_date}</span>
                                        </div>
                                        <span className="text-slate-600">→</span>
                                        <span>{pdf.end_date}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
