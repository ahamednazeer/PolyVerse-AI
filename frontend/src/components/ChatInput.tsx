'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    PaperPlaneTilt,
    Waveform,
    Pulse,
    Paperclip,
    X,
    File as FileIcon,
    Image,
    Plus,
    ArrowUp,
    SpeakerHigh,
    SpeakerSlash,
} from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ChatInputProps {
    onSendMessage: (
        message: string,
        fileIds?: string[],
        files?: { id: string; name: string; type: string; url?: string }[],
        options?: { language: string; voice: boolean; responseVoice: boolean }
    ) => void;
    disabled?: boolean;
}

const placeholders = [
    "Ask me anything...",
    "Write some code...",
    "Explain a concept...",
    "Analyze an image...",
    "How can I help?",
];

function getBrowserLanguageHint() {
    if (typeof navigator === 'undefined') return undefined;
    const language = (navigator.language || '').toLowerCase();
    const supportedHints = ['hi', 'ta', 'te', 'ml', 'kn'];

    for (const hint of supportedHints) {
        if (language === hint || language.startsWith(`${hint}-`)) {
            return hint;
        }
    }

    // For English or unknown browser locales, let Whisper auto-detect.
    return undefined;
}

const voiceLanguageOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'en', label: 'EN' },
    { value: 'ta', label: 'TA' },
    { value: 'hi', label: 'HI' },
    { value: 'te', label: 'TE' },
    { value: 'ml', label: 'ML' },
    { value: 'kn', label: 'KN' },
];

const SUPPORTED_UPLOAD_LABEL =
    'Supported formats: JPG, PNG, GIF, WebP, SVG, PDF, TXT, DOC, DOCX, CSV, HTML, CSS, and common code files.';

// Voice Visualizer — same from AIAssistant.tsx
const VoiceVisualizer = ({ stream, width, height }: { stream: MediaStream | null; width: number; height: number }) => {
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

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
    const [input, setInput] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; type: string; url?: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [containerWidth, setContainerWidth] = useState(600);
    const [voiceLanguage, setVoiceLanguage] = useState<'auto' | 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn'>('auto');
    const [responseVoiceEnabled, setResponseVoiceEnabled] = useState(false);
    const [lastInputWasVoice, setLastInputWasVoice] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const transcriptionToastId = useRef<string | number | null>(null);

    const stopProgressToast = (
        toastRef: React.MutableRefObject<string | number | null>,
    ) => {
        if (toastRef.current !== null) {
            toast.dismiss(toastRef.current);
            toastRef.current = null;
        }
    };

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const recordingStartTimeRef = useRef<number>(0);
    const shouldTranscribeRef = useRef<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) setContainerWidth(entry.contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!disabled) inputRef.current?.focus();
    }, [disabled]);

    // Voice recording handlers — same from AIAssistant.tsx
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
            transcriptionToastId.current = toast.loading('Downloading voice model. Please wait.');
            const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
            const languageHint = voiceLanguage === 'auto' ? getBrowserLanguageHint() : voiceLanguage;
            const result = await api.transcribeAudio(file, languageHint);
            const transcribedText = (result.text || '').trim();
            if (transcribedText) {
                setInput((prev) => [prev.trim(), transcribedText].filter(Boolean).join(' ').trim());
                setLastInputWasVoice(true);
                requestAnimationFrame(() => inputRef.current?.focus());
            }
        } catch (err) {
            console.error('Transcription failed:', err);
            toast.error(err instanceof Error ? err.message : 'Transcription failed');
        } finally {
            stopProgressToast(transcriptionToastId);
            setTranscribing(false);
        }
    };

    // File upload
    const processFiles = async (files: FileList | File[]) => {
        if (!files?.length) return;

        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const result = await api.uploadFile(file);
                setUploadedFiles(prev => [...prev, {
                    id: result.id,
                    name: result.name,
                    type: result.type,
                    url: api.getUploadUrl(result.url),
                }]);
            }
        } catch (err) {
            console.error('File upload failed:', err);
            const message = err instanceof Error ? err.message : 'Upload failed';
            if (message.toLowerCase().includes('file type not allowed')) {
                toast.error(`Unsupported file format. ${SUPPORTED_UPLOAD_LABEL}`);
            } else {
                toast.error(message);
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
    };

    // Global Drag & Drop Handlers
    useEffect(() => {
        let dragCounter = 0;

        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            dragCounter++;
            if (e.dataTransfer?.types.includes('Files') && !disabled && !uploading) {
                setIsDragging(true);
            }
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                setIsDragging(false);
            }
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            dragCounter = 0;
            setIsDragging(false);
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0 && !disabled && !uploading) {
                processFiles(e.dataTransfer.files);
            }
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, [disabled, uploading]);

    const removeFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    const resolveMessageLanguage = () => {
        if (voiceLanguage !== 'auto') {
            return voiceLanguage;
        }

        const browserHint = getBrowserLanguageHint();
        if (browserHint) {
            return browserHint;
        }

        if (typeof navigator !== 'undefined' && navigator.language) {
            return navigator.language.split('-')[0].toLowerCase();
        }

        return 'en';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && uploadedFiles.length === 0) || disabled || transcribing) return;
        const message = input.trim() || 'Analyze this file';
        const fileIds = uploadedFiles.map(f => f.id);
        const files = [...uploadedFiles];
        const options = {
            language: resolveMessageLanguage(),
            voice: lastInputWasVoice,
            responseVoice: responseVoiceEnabled,
        };
        setInput('');
        setUploadedFiles([]);
        setLastInputWasVoice(false);
        onSendMessage(
            message,
            fileIds.length > 0 ? fileIds : undefined,
            files.length > 0 ? files : undefined,
            options,
        );
    };

    // Keyboard shortcut — Alt to speak
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.altKey && !isRecording && !disabled && !transcribing) {
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
    }, [isRecording, disabled, transcribing]);

    return (
        <div className="bg-[#212121] p-4 pb-8 relative">
            {/* Overlay for Drag and Drop */}
            {isDragging && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm border-2 border-dashed border-blue-500 m-4 rounded-3xl">
                    <div className="flex flex-col items-center text-blue-400 animate-pulse">
                        <FileIcon size={48} className="mb-4" />
                        <h3 className="text-2xl font-bold tracking-tight text-slate-100">Drop files to upload</h3>
                        <p className="text-sm text-slate-400 mt-2">Attach code, PDFs, or images to the conversation</p>
                    </div>
                </div>
            )}

            {/* File preview chips */}
            {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {uploadedFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700/50 rounded-lg text-xs text-slate-300">
                            {file.type.startsWith('image/') ? <Image size={12} className="text-amber-400" /> : <FileIcon size={12} className="text-blue-400" />}
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button onClick={() => removeFile(file.id)} className="text-slate-500 hover:text-red-400 transition-colors ml-1">
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="flex items-center w-full bg-[#2f2f2f] border border-transparent rounded-[28px] pl-3 pr-2 py-2 transition-all focus-within:border-white/20">
                    
                    {/* File upload button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || uploading}
                        className="p-1.5 rounded-full text-slate-400 hover:bg-[#212121] hover:text-slate-200 transition-all disabled:opacity-50 flex-shrink-0"
                        title="Attach file"
                    >
                        <Plus size={20} weight="bold" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,audio/*,.pdf,.txt,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.rs,.go,.rb,.php,.html,.css,.csv"
                        multiple
                    />

                    {/* Input Field */}
                    <div ref={containerRef} className="flex-1 relative flex items-center min-w-0 px-2 h-9">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                setLastInputWasVoice(false);
                            }}
                            placeholder={transcribing ? "Transcribing..." : isRecording ? "" : "Ask anything"}
                            disabled={disabled || transcribing}
                            className={`w-full bg-transparent text-sm text-slate-200 placeholder-slate-400 focus:outline-none disabled:opacity-50 h-full ${isRecording ? 'opacity-0' : 'opacity-100'}`}
                        />

                        {isRecording && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-start">
                                <VoiceVisualizer stream={mediaStream} width={containerWidth - 16} height={32} />
                            </div>
                        )}
                    </div>

                    {/* Submit / Voice Toggle */}
                    <div className="flex-shrink-0 flex items-center gap-2 pr-1">
                        {input.trim() || uploadedFiles.length > 0 || uploading || transcribing ? (
                            <button
                                type="submit"
                                disabled={(!input.trim() && uploadedFiles.length === 0) || disabled || transcribing || uploading}
                                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-slate-200 transition-all disabled:opacity-40 disabled:hover:bg-white"
                            >
                                <ArrowUp size={18} weight="bold" />
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setResponseVoiceEnabled((prev) => !prev)}
                                    disabled={disabled || isRecording || transcribing}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        responseVoiceEnabled
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-transparent text-slate-300 hover:bg-[#212121] hover:text-white'
                                    }`}
                                    title={responseVoiceEnabled ? 'Disable spoken replies' : 'Enable spoken replies'}
                                >
                                    {responseVoiceEnabled ? <SpeakerHigh size={16} weight="bold" /> : <SpeakerSlash size={16} weight="bold" />}
                                </button>
                                <select
                                    value={voiceLanguage}
                                    onChange={(e) => setVoiceLanguage(e.target.value as typeof voiceLanguage)}
                                    disabled={disabled || isRecording || transcribing}
                                    className="rounded-full bg-transparent px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-300 outline-none transition-colors hover:text-white disabled:opacity-50"
                                    title="Voice language"
                                >
                                    {voiceLanguageOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onMouseDown={handleMouseDown}
                                    onMouseUp={handleMouseUp}
                                    onTouchStart={handleMouseDown}
                                    onTouchEnd={handleMouseUp}
                                    disabled={disabled}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        isRecording
                                            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20'
                                            : 'bg-white text-black hover:bg-slate-200'
                                    }`}
                                    title="Hold to speak (Alt)"
                                >
                                    {isRecording ? <Waveform size={16} weight="bold" /> : <Waveform size={16} weight="bold" />}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <p className="mt-2 text-[10px] text-slate-500 text-center font-mono uppercase tracking-widest">
                    {isRecording ? "🎙️ Listening..." : transcribing ? "✨ Processing..." : uploading ? "📎 Uploading..." : "PolyVerse AI • Llama 3.3"}
                </p>
            </form>
        </div>
    );
}
