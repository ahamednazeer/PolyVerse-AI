'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    CaretLeft,
    CaretRight,
    MagnifyingGlassPlus,
    MagnifyingGlassMinus,
    Spinner,
    ArrowsIn,
    ArrowsOut,
    Clock,
    Target
} from '@phosphor-icons/react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    pdfUrl: string | null;
    onInteraction?: () => void;
    // Stats for fullscreen overlay
    sessionTime?: number;
    dailyProgress?: number;
    dailyTarget?: number;
    isCompleted?: boolean;
}

// Helper to format time
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function PDFViewer({
    pdfUrl,
    onInteraction,
    sessionTime = 0,
    dailyProgress = 0,
    dailyTarget = 300,
    isCompleted = false
}: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    }, []);

    const onDocumentLoadError = useCallback((error: Error) => {
        console.error('PDF Load Error:', error);
        setIsLoading(false);
    }, []);

    const goToPrevPage = () => {
        setPageNumber(prev => Math.max(prev - 1, 1));
        onInteraction?.();
    };

    const goToNextPage = () => {
        setPageNumber(prev => Math.min(prev + 1, numPages));
        onInteraction?.();
    };

    const zoomIn = () => {
        setScale(prev => Math.min(prev + 0.2, 3.0));
        onInteraction?.();
    };

    const zoomOut = () => {
        setScale(prev => Math.max(prev - 0.2, 0.5));
        onInteraction?.();
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (e) {
            console.error('Fullscreen error:', e);
        }
        onInteraction?.();
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const page = parseInt(e.target.value, 10);
        if (page >= 1 && page <= numPages) {
            setPageNumber(page);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                setPageNumber(prev => Math.max(prev - 1, 1));
                onInteraction?.();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
                setPageNumber(prev => Math.min(prev + 1, numPages));
                onInteraction?.();
                if (e.key === ' ') e.preventDefault();
            } else if (e.key === 'Escape' && isFullscreen) {
                // ESC already handled by browser for fullscreen
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [numPages, onInteraction, isFullscreen]);

    if (!pdfUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/50 min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Spinner size={40} className="animate-spin" />
                    <span className="font-mono text-sm">Loading PDF...</span>
                </div>
            </div>
        );
    }

    const progressPercent = Math.min(100, (dailyProgress / dailyTarget) * 100);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full flex flex-col bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}
            onClick={onInteraction}
        >
            {/* Fullscreen Stats Overlay - Shows in top-right when fullscreen */}
            {isFullscreen && (
                <div className="absolute top-16 right-4 z-50 flex flex-col gap-2">
                    {/* Session Timer */}
                    <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2 flex items-center gap-2 shadow-xl">
                        <Clock size={16} className="text-blue-400" />
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-mono">Session</p>
                            <p className="text-lg font-mono font-bold text-slate-100">{formatTime(sessionTime)}</p>
                        </div>
                    </div>

                    {/* Daily Progress */}
                    <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2 shadow-xl">
                        <div className="flex items-center gap-2 mb-1">
                            <Target size={16} className={isCompleted ? "text-green-400" : "text-orange-400"} />
                            <div className="text-right flex-1">
                                <p className="text-[10px] text-slate-500 uppercase font-mono">Daily</p>
                                <p className="text-sm font-mono font-bold text-slate-100">
                                    {formatTime(dailyProgress)} <span className="text-slate-500 text-xs">/ {formatTime(dailyTarget)}</span>
                                </p>
                            </div>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden w-24">
                            <div
                                className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        {isCompleted && (
                            <p className="text-[10px] text-green-400 font-mono mt-1 text-center">✓ Done</p>
                        )}
                    </div>
                </div>
            )}

            {/* Toolbar - Responsive */}
            <div className="flex-none flex items-center justify-between px-2 sm:px-4 py-2 bg-gradient-to-b from-slate-800 to-slate-800/90 border-b border-slate-700/60">
                {/* Page Navigation */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="p-2 sm:p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 active:bg-slate-500/50 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation"
                        title="Previous Page (←)"
                    >
                        <CaretLeft size={20} weight="bold" />
                    </button>

                    <div className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 font-mono text-sm text-slate-300">
                        <input
                            type="number"
                            min={1}
                            max={numPages}
                            value={pageNumber}
                            onChange={handlePageChange}
                            className="w-10 sm:w-12 px-1 sm:px-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                        />
                        <span className="text-slate-500">/</span>
                        <span>{numPages || '?'}</span>
                    </div>

                    <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className="p-2 sm:p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 active:bg-slate-500/50 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation"
                        title="Next Page (→)"
                    >
                        <CaretRight size={20} weight="bold" />
                    </button>
                </div>

                {/* Zoom & Fullscreen Controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={zoomOut}
                        disabled={scale <= 0.5}
                        className="p-2 sm:p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 active:bg-slate-500/50 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation"
                        title="Zoom Out"
                    >
                        <MagnifyingGlassMinus size={20} weight="bold" />
                    </button>

                    <span className="w-12 sm:w-14 text-center font-mono text-xs sm:text-sm text-slate-400">
                        {Math.round(scale * 100)}%
                    </span>

                    <button
                        onClick={zoomIn}
                        disabled={scale >= 3.0}
                        className="p-2 sm:p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 active:bg-slate-500/50 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation"
                        title="Zoom In"
                    >
                        <MagnifyingGlassPlus size={20} weight="bold" />
                    </button>

                    {/* Single Fullscreen Button */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 sm:p-2.5 rounded-lg bg-blue-600/80 hover:bg-blue-500/80 active:bg-blue-400/80 text-white transition-all ml-1 sm:ml-2"
                        title={isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen"}
                    >
                        {isFullscreen ? <ArrowsIn size={20} weight="bold" /> : <ArrowsOut size={20} weight="bold" />}
                    </button>
                </div>
            </div>

            {/* PDF Content - Takes maximum space */}
            <div
                ref={contentRef}
                className="flex-1 overflow-auto flex justify-center items-start p-2 sm:p-4 bg-gradient-to-b from-slate-900/50 to-slate-950/80"
                style={{ minHeight: 0 }}
            >
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                        <div className="flex flex-col items-center gap-4 text-slate-400 py-20">
                            <Spinner size={40} className="animate-spin" />
                            <span className="font-mono text-sm">Loading document...</span>
                        </div>
                    }
                    error={
                        <div className="flex flex-col items-center gap-3 text-red-400 py-20">
                            <span className="font-mono text-sm">Failed to load PDF</span>
                            <span className="text-xs text-slate-500">Please try refreshing the page</span>
                        </div>
                    }
                    className="max-w-full"
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={
                            <div className="flex items-center justify-center py-20 min-h-[400px]">
                                <Spinner size={32} className="animate-spin text-slate-400" />
                            </div>
                        }
                        className="shadow-2xl rounded-sm overflow-hidden"
                    />
                </Document>
            </div>

            {/* Compact Footer */}
            <div className="flex-none px-3 sm:px-4 py-2 bg-slate-800/80 border-t border-slate-700/40 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>
                    Page {pageNumber} / {numPages}
                </span>
                <span className="text-slate-500 hidden sm:inline">← → to navigate</span>
                <span>{Math.round(scale * 100)}%</span>
            </div>
        </div>
    );
}
