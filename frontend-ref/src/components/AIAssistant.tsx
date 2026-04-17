'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Robot,
    X,
    PaperPlaneTilt,
    ArrowRight,
    Trash,
    Microphone,
    Waveform,
    CornersOut,
    CornersIn,
    Sparkle,
    Lightning,
    Copy,
    Check,
    Brain,
    ChatCircleDots,
    Pulse,
    GraduationCap,
    MapPin,
    ClipboardText,
    Question,
    CalendarCheck,
    House,
    Door,
    UserCircle
} from '@phosphor-icons/react';
import { useAIAssistant } from './AIAssistantContext';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

// Context chips based on module - using full class strings since Tailwind purges dynamic classes
const getContextInfo = (module: string) => {
    const contexts: Record<string, { icon: React.ReactNode; label: string; classes: string }> = {
        dashboard: {
            icon: <GraduationCap size={12} />,
            label: 'Dashboard',
            classes: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        },
        attendance: {
            icon: <CalendarCheck size={12} />,
            label: 'Attendance',
            classes: 'bg-green-500/20 text-green-400 border-green-500/30'
        },
        faculty: {
            icon: <MapPin size={12} />,
            label: 'Faculty Locator',
            classes: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        },
        queries: {
            icon: <Question size={12} />,
            label: 'Queries',
            classes: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        },
        complaints: {
            icon: <ClipboardText size={12} />,
            label: 'Complaints',
            classes: 'bg-red-500/20 text-red-400 border-red-500/30'
        },
        hostel: {
            icon: <House size={12} />,
            label: 'Hostel',
            classes: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
        },
        outpass: {
            icon: <Door size={12} />,
            label: 'Outpass',
            classes: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
        },
        profile: {
            icon: <UserCircle size={12} />,
            label: 'Profile',
            classes: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
        },
    };
    return contexts[module] || contexts.dashboard;
};

// Placeholder suggestions
const getPlaceholders = (module: string): string[] => {
    const placeholders: Record<string, string[]> = {
        dashboard: ["Ask me anything...", "How can I help?", "What's on your mind?"],
        attendance: ["Why did my attendance fail?", "What are the rules?", "How to mark attendance?"],
        hostel: ["What are hostel timings?", "How to request outpass?", "Hostel rules?"],
        queries: ["How to submit a query?", "Who responds?", "Query vs complaint?"],
        complaints: ["How long to resolve?", "Complaint stages?", "Track my complaint?"],
    };
    return placeholders[module] || placeholders.dashboard;
};

// Animated AI Avatar
const AIAvatar = ({ isThinking }: { isThinking: boolean }) => (
    <div className="relative">
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30 ${isThinking ? 'animate-pulse' : ''}`}>
            <Brain size={18} className="text-blue-400" weight="duotone" />
        </div>
        {isThinking && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
        )}
    </div>
);

// Thinking Animation
const ThinkingBubble = () => (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
        <AIAvatar isThinking={true} />
        <div className="bg-slate-800/60 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-tl-md border border-slate-700/50 flex items-center h-[44px]">
            <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            </div>
        </div>
    </div>
);

// Typewriter Effect Component
const TypewriterText = React.memo(({ text, onComplete }: { text: string; onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!text) return;

        let index = 0;
        const words = text.split(/(\s+)/); // Keep whitespace and line breaks
        let currentText = '';

        const typeWord = () => {
            if (index < words.length) {
                currentText += words[index];
                setDisplayedText(currentText);
                index++;

                // Auto-scroll as we type
                if (containerRef.current) {
                    const chatContainer = containerRef.current.closest('.overflow-y-auto');
                    if (chatContainer) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                }

                const speed = Math.random() * 30 + 10;
                setTimeout(typeWord, speed);
            } else {
                setIsComplete(true);
                onComplete?.();
            }
        };

        const timer = setTimeout(typeWord, 100);
        return () => clearTimeout(timer);
    }, [text, onComplete]);

    return (
        <div ref={containerRef} className="relative group/typewriter outline-none">
            <div className="whitespace-pre-wrap transition-opacity duration-300">
                {displayedText}
                {!isComplete && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse rounded-full align-middle mb-0.5" />
                )}
            </div>
            {!isComplete && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDisplayedText(text);
                        setIsComplete(true);
                        onComplete?.();
                    }}
                    className="absolute -bottom-6 right-0 text-[10px] text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 uppercase tracking-widest font-bold bg-slate-900/40 px-2 py-0.5 rounded backdrop-blur-sm border border-slate-700/50"
                >
                    Skip <ArrowRight size={10} />
                </button>
            )}
        </div>
    );
});

TypewriterText.displayName = 'TypewriterText';

// Message Component with typewriter effect for assistant
const ChatMessage = React.memo(({
    role,
    content,
    timestamp,
    isLatestAssistant
}: {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
    isLatestAssistant?: boolean;
}) => {
    const [copied, setCopied] = useState(false);
    const [isTypingComplete, setIsTypingComplete] = useState(!isLatestAssistant);

    useEffect(() => {
        if (!isLatestAssistant) {
            setIsTypingComplete(true);
        }
    }, [isLatestAssistant]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (role === 'user') {
        return (
            <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="max-w-[85%] px-4 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm leading-relaxed rounded-2xl rounded-br-sm shadow-lg shadow-blue-900/20">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 group animate-in fade-in slide-in-from-left-4 duration-300">
            <AIAvatar isThinking={false} />
            <div className="flex-1 max-w-[85%]">
                <div className="bg-slate-800/60 backdrop-blur-sm px-5 py-3.5 rounded-2xl rounded-tl-md border border-slate-700/50 text-sm text-slate-200 leading-relaxed relative">
                    {isLatestAssistant && !isTypingComplete ? (
                        <TypewriterText text={content} onComplete={() => setIsTypingComplete(true)} />
                    ) : (
                        <div className="ai-chat-markdown text-[13.5px] leading-[1.6]">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="text-[15px] font-semibold text-white mt-3 mb-1 first:mt-0">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-[14.5px] font-semibold text-white mt-2.5 mb-1 first:mt-0">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-[14px] font-semibold text-white mt-2 mb-0.5 first:mt-0">{children}</h3>,
                                    h4: ({ children }) => <h4 className="text-[13.5px] font-semibold text-white mt-1.5 mb-0.5">{children}</h4>,
                                    p: ({ children }) => <p className="my-1 text-slate-200 first:mt-0 last:mb-0">{children}</p>,
                                    ul: ({ children }) => <ul className="my-1 pl-5 space-y-0.5 list-disc marker:text-slate-500">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-1 pl-5 space-y-0.5 list-decimal marker:text-slate-500">{children}</ol>,
                                    li: ({ children }) => <li className="text-slate-200 pl-0.5">{children}</li>,
                                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>,
                                    code: ({ children, className }) => {
                                        const isInline = !className;
                                        return isInline
                                            ? <code className="px-1 py-0.5 bg-slate-700/60 rounded text-[12px] font-mono text-slate-100">{children}</code>
                                            : <code className={className}>{children}</code>;
                                    },
                                    pre: ({ children }) => (
                                        <pre className="my-2 p-3 bg-slate-900 rounded-lg overflow-x-auto text-[12px] font-mono border border-slate-700/50">
                                            {children}
                                        </pre>
                                    ),
                                    blockquote: ({ children }) => (
                                        <blockquote className="my-1.5 pl-3 border-l-2 border-slate-600 text-slate-300 italic">
                                            {children}
                                        </blockquote>
                                    ),
                                    a: ({ href, children }) => (
                                        <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                                            {children}
                                        </a>
                                    ),
                                    hr: () => <hr className="my-2 border-slate-700" />,
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    )}

                    {isTypingComplete && (
                        <button
                            onClick={handleCopy}
                            className="absolute -right-2 -top-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                            title="Copy message"
                        >
                            {copied ? (
                                <Check size={12} className="text-green-400" />
                            ) : (
                                <Copy size={12} className="text-slate-400" />
                            )}
                        </button>
                    )}
                </div>
                {timestamp && (
                    <p className="text-[10px] text-slate-600 mt-1 font-mono">
                        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

// Quick Suggestion Chip
const SuggestionChip = ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/30 rounded-full text-xs text-slate-400 hover:text-white transition-all flex items-center gap-1.5 group"
    >
        <Sparkle size={10} className="text-blue-400 group-hover:text-yellow-400 transition-colors" weight="fill" />
        {text}
    </button>
);

// Voice Visualizer
const VoiceVisualizer = ({ stream, width, height }: { stream: MediaStream | null, width: number, height: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, width, height);

            const bass = dataArray.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
            const mids = dataArray.slice(8, 32).reduce((a, b) => a + b, 0) / 24;
            const highs = dataArray.slice(32, 100).reduce((a, b) => a + b, 0) / 68;

            const drawWave = (color: string, offset: number, speed: number, alpha: number, weight: number, bandValue: number, freqScale: number) => {
                ctx.beginPath();
                const amp = (bandValue / 128) * (height / 2.3);
                const time = Date.now() / 1000 * speed;

                ctx.strokeStyle = color;
                ctx.lineWidth = weight;
                ctx.globalAlpha = alpha;
                ctx.lineCap = 'round';
                ctx.moveTo(0, height / 2);

                for (let x = 0; x <= width; x += 4) {
                    const y = height / 2 + Math.sin(x * freqScale + time + offset) * amp;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            };

            drawWave('#6366f1', Math.PI * 1.5, 0.6, 0.25, 1.5, bass, 0.015);
            drawWave('#06b6d4', Math.PI, 1.2, 0.45, 2, mids, 0.035);
            drawWave('#3b82f6', 0, 1.8, 0.85, 2.5, highs, 0.055);

            ctx.globalAlpha = 1;
        };

        draw();

        return () => {
            cancelAnimationFrame(requestRef.current);
            audioContext.close();
        };
    }, [stream, width, height]);

    return <canvas ref={canvasRef} style={{ width: `${width}px`, height: `${height}px` }} />;
};

export default function AIAssistant() {
    const router = useRouter();
    const {
        isOpen,
        isLoading,
        isBlocked,
        currentModule,
        messages,
        actionChips,
        toggleOpen,
        sendMessage,
        clearMessages,
    } = useAIAssistant();

    const [input, setInput] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [panelSize, setPanelSize] = useState({ width: 400, height: 560 });
    const [panelPosition, setPanelPosition] = useState({ bottom: 96, right: 24 });
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [containerWidth, setContainerWidth] = useState(400);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const recordingStartTimeRef = useRef<number>(0);
    const shouldTranscribeRef = useRef<boolean>(false);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, right: 0, bottom: 0 });

    // Track window size for smooth expand animation
    useEffect(() => {
        const updateWindowSize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateWindowSize();
        window.addEventListener('resize', updateWindowSize);
        return () => window.removeEventListener('resize', updateWindowSize);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) setContainerWidth(entry.contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isOpen]);

    useEffect(() => {
        const placeholders = getPlaceholders(currentModule);
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [currentModule]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isBlocked) inputRef.current?.focus();
    }, [isOpen, isBlocked]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.altKey && !isRecording && isOpen && !isLoading && !transcribing) {
                e.preventDefault();
                handleMouseDown();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt' && isRecording) {
                e.preventDefault();
                handleMouseUp();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isRecording, isOpen, isLoading, transcribing]);

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleDragMouseDown = (e: React.MouseEvent) => {
        if (isExpanded) return;
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        e.stopPropagation();
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            right: panelPosition.right,
            bottom: panelPosition.bottom
        };
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isResizing && !isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing) {
                const newWidth = Math.max(360, Math.min(window.innerWidth - 48, window.innerWidth - e.clientX - panelPosition.right));
                const newHeight = Math.max(450, Math.min(window.innerHeight - 48, window.innerHeight - e.clientY - panelPosition.bottom));
                setPanelSize({ width: newWidth, height: newHeight });
            } else if (isDragging) {
                const deltaX = dragStartRef.current.mouseX - e.clientX;
                const deltaY = dragStartRef.current.mouseY - e.clientY;
                const newRight = Math.max(8, Math.min(window.innerWidth - panelSize.width - 8, dragStartRef.current.right + deltaX));
                const newBottom = Math.max(8, Math.min(window.innerHeight - panelSize.height - 8, dragStartRef.current.bottom + deltaY));
                setPanelPosition({ bottom: newBottom, right: newRight });
            }
        };
        const handleMouseUp = () => {
            setIsResizing(false);
            setIsDragging(false);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isDragging, panelSize, panelPosition]);

    const handleMouseDown = () => {
        if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = setTimeout(() => {
            startRecording();
            recordingStartTimeRef.current = Date.now();
        }, 300);
    };

    const handleMouseUp = () => {
        if (startTimeoutRef.current) {
            clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }
        if (isRecording) {
            const duration = Date.now() - recordingStartTimeRef.current;
            shouldTranscribeRef.current = duration >= 500;
            stopRecording();
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMediaStream(stream);
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                setMediaStream(null);
                if (audioBlob.size > 0 && shouldTranscribeRef.current) {
                    handleTranscription(audioBlob);
                }
                shouldTranscribeRef.current = false;
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
    };

    const handleTranscription = async (blob: Blob) => {
        setTranscribing(true);
        try {
            const result = await api.aiTranscribeAudio(blob);
            if (result.text?.trim()) {
                const transcript = result.text.trim();
                if (!isLoading) {
                    setInput('');
                    await sendMessage(transcript);
                }
            }
        } catch (err) {
            console.error('Transcription failed:', err);
        } finally {
            setTranscribing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || transcribing) return;
        const message = input;
        setInput('');
        await sendMessage(message);
    };

    const handleChipClick = (url: string) => {
        router.push(url);
        toggleOpen();
    };

    const handleQuickAction = async (text: string) => {
        if (!isLoading) await sendMessage(text);
    };

    if (isBlocked) return null;

    const placeholders = getPlaceholders(currentModule);
    const contextInfo = getContextInfo(currentModule);
    const suggestions = ["What can you help with?", "Mark my attendance", "Show my schedule"];

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={toggleOpen}
                data-walkthrough="ai-assistant"
                className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 group border ${isOpen
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-600'
                    : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 hover:border-blue-500/50 hover:scale-105'
                    }`}
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
            >
                {isOpen ? (
                    <X size={20} className="text-slate-300" weight="bold" />
                ) : (
                    <div className="relative">
                        <Robot size={24} className="text-blue-400" weight="duotone" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-slate-800" />
                    </div>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className={`fixed z-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl ${isResizing || isDragging ? '' : 'transition-[width,height,left,top,right,bottom,transform] duration-300 ease-out'}`}
                    style={{
                        width: isExpanded ? `${windowSize.width - 48}px` : `${panelSize.width}px`,
                        height: isExpanded ? `${windowSize.height - 48}px` : `${panelSize.height}px`,
                        bottom: isExpanded ? '24px' : `${panelPosition.bottom}px`,
                        right: isExpanded ? '24px' : `${panelPosition.right}px`,
                        maxHeight: isExpanded ? 'none' : 'calc(100vh - 120px)',
                        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
                        border: '1px solid rgba(51, 65, 85, 0.5)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(59, 130, 246, 0.1) inset',
                        willChange: isAnimating ? 'width, height, right, bottom' : 'auto'
                    }}
                    onTransitionEnd={() => setIsAnimating(false)}
                >
                    {/* Resize Handles */}
                    {!isExpanded && (
                        <>
                            <div onMouseDown={handleResizeMouseDown} className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-blue-500/20 z-[60]" />
                            <div onMouseDown={handleResizeMouseDown} className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-blue-500/20 z-[60]" />
                            <div onMouseDown={handleResizeMouseDown} className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-[70] flex items-center justify-center group">
                                <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-slate-600 group-hover:border-blue-400 rounded-tl-sm" />
                            </div>
                        </>
                    )}

                    {/* Header */}
                    <div
                        onMouseDown={handleDragMouseDown}
                        className={`flex items-center justify-between px-4 py-3 border-b border-slate-700/50 ${!isExpanded ? 'cursor-move select-none' : ''}`}
                        style={{ background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(15, 23, 42, 0.5) 100%)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                                    <ChatCircleDots size={22} className="text-blue-400" weight="duotone" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                                    Campus AI
                                    <span className={`px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-md border flex items-center gap-1 ${contextInfo.classes}`}>
                                        {contextInfo.icon}
                                        {contextInfo.label}
                                    </span>
                                </h3>
                                <p className="text-[10px] text-slate-500">Powered by Llama 3.3 • Always learning</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    setIsAnimating(true);
                                    setIsExpanded(!isExpanded);
                                }}
                                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
                                title={isExpanded ? "Minimize" : "Expand"}
                            >
                                {isExpanded ? <CornersIn size={18} /> : <CornersOut size={18} />}
                            </button>
                            <button
                                onClick={clearMessages}
                                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-all"
                                title="Clear chat"
                            >
                                <Trash size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
                                {/* Welcome Animation */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-2xl animate-pulse" />
                                    <div className="relative w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center border border-slate-700/50 shadow-xl">
                                        <Brain size={40} className="text-blue-400" weight="duotone" />
                                    </div>
                                </div>

                                <div className="text-center space-y-2">
                                    <h4 className="text-lg font-bold text-white">Hello! I'm Campus AI 👋</h4>
                                    <p className="text-slate-400 text-sm max-w-[280px]">
                                        Your intelligent assistant for attendance, schedules, and campus services.
                                    </p>
                                </div>

                                {/* Suggestions */}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {suggestions.map((text, i) => (
                                        <SuggestionChip key={i} text={text} onClick={() => handleQuickAction(text)} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {(() => {
                                    const lastAssistantIdx = messages.slice().reverse().findIndex(m => m.role === 'assistant');
                                    const actualIdx = lastAssistantIdx !== -1 ? messages.length - 1 - lastAssistantIdx : -1;

                                    return messages.map((msg, idx) => (
                                        <ChatMessage
                                            key={msg.id}
                                            role={msg.role}
                                            content={msg.content}
                                            isLatestAssistant={idx === actualIdx}
                                        />
                                    ));
                                })()}

                                {isLoading && <ThinkingBubble />}

                                {actionChips.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {actionChips.map((chip, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleChipClick(chip.url)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-400/50 rounded-full text-xs text-blue-300 hover:text-blue-200 transition-all group"
                                            >
                                                <Lightning size={12} weight="fill" />
                                                {chip.label}
                                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            {/* Voice Button */}
                            <button
                                type="button"
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onTouchStart={handleMouseDown}
                                onTouchEnd={handleMouseUp}
                                className={`p-2.5 rounded-xl transition-all ${isRecording
                                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white scale-110 shadow-lg shadow-red-500/30'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                                    }`}
                                title="Hold to speak (Alt)"
                                disabled={isLoading || transcribing}
                            >
                                {transcribing ? (
                                    <Pulse size={18} className="animate-pulse" />
                                ) : isRecording ? (
                                    <Waveform size={18} weight="bold" />
                                ) : (
                                    <Microphone size={18} />
                                )}
                            </button>

                            {/* Input Field */}
                            <div ref={containerRef} className="flex-1 relative flex items-center overflow-hidden rounded-xl bg-slate-800/80 border border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500/50">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={transcribing ? "Transcribing..." : isRecording ? "" : placeholders[placeholderIndex]}
                                    disabled={isLoading || transcribing}
                                    className={`w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50 ${isRecording ? 'opacity-0' : 'opacity-100'}`}
                                />

                                {isRecording && (
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <VoiceVisualizer stream={mediaStream} width={containerWidth - 32} height={36} />
                                    </div>
                                )}
                            </div>

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading || transcribing}
                                className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
                            >
                                <PaperPlaneTilt size={18} className="text-white" weight="fill" />
                            </button>
                        </div>

                        <p className="mt-2 text-[10px] text-slate-500 text-center font-mono">
                            {isRecording ? "🎙️ Listening..." : transcribing ? "✨ Transcribing..." : "⌥ Alt to speak • Enter to send"}
                        </p>
                    </form>
                </div>
            )}
        </>
    );
}
