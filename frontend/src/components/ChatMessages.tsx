'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
    Brain,
    Copy,
    Check,
    File as FileIcon,
    Image as ImageIcon,
} from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    agent?: string;
    timestamp?: Date;
    isHistory?: boolean;
    files?: {
        id: string;
        name: string;
        type: string;
        url?: string;
    }[];
}

function getAttachmentLabel(file: NonNullable<Message["files"]>[number]) {
    if (file.type.startsWith('audio/')) return 'Voice note';
    return file.name || 'Attachment';
}

const CodeBlock = ({ language, code }: { language: string; code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4 rounded-md overflow-hidden bg-[#1e1e1e] border border-slate-700/50">
            <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800/80 border-b border-slate-700/50">
                <span className="text-xs text-slate-400 font-mono lowercase">{language}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copy code"
                >
                    {copied ? <><Check size={12} className="text-green-400" /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                PreTag="div"
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

// AI Avatar — same design from AIAssistant.tsx
const AIAvatar = ({ isThinking }: { isThinking: boolean }) => {
    return (
        <div className="relative flex-shrink-0">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30 ${isThinking ? 'animate-pulse' : ''}`}>
                <Brain size={18} className="text-blue-400" weight="duotone" />
            </div>
            {isThinking && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
            )}
        </div>
    );
};

// Thinking dots — same from AIAssistant.tsx
const ThinkingBubble = () => (
    <div className="flex w-full max-w-5xl items-start gap-3 animate-slide-in px-4 sm:px-6 lg:px-10">
        <AIAvatar isThinking={true} />
        <div className="flex h-[44px] items-center rounded-2xl bg-transparent px-1 py-3">
            <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            </div>
        </div>
    </div>
);

// Single Chat Message — same design from AIAssistant.tsx
const ChatMessage = React.memo(({
    role,
    content,
    agent,
    timestamp,
    isStreaming,
    files,
}: {
    role: 'user' | 'assistant';
    content: string;
    agent?: string;
    timestamp?: Date;
    isStreaming?: boolean;
    files?: Message['files'];
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl rounded-br-sm border border-slate-700/70 bg-[#2b2b2b] px-4 py-2.5 text-sm leading-relaxed text-slate-100 shadow-lg shadow-black/20">
                    {files && files.length > 0 && (
                        <div className="mb-2 flex flex-wrap justify-end gap-2">
                            {files.map((file) => (
                                file.type.startsWith('image/') && file.url ? (
                                    <div key={file.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                        <img
                                            src={file.url}
                                            alt={file.name || 'Uploaded image'}
                                            className="block h-28 w-28 object-cover"
                                        />
                                        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-200">
                                            <ImageIcon size={12} />
                                            <span className="max-w-[96px] truncate">{getAttachmentLabel(file)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={file.id} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                                        <FileIcon size={12} />
                                        <span className="max-w-[160px] truncate">{getAttachmentLabel(file)}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                    <div>{content}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="group w-full max-w-5xl px-4 sm:px-6 lg:px-10">
            <div className="relative">
                    {isStreaming ? (
                        <div className="chat-markdown streaming-active text-[15px] leading-[1.75] text-slate-100">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props;
                                    const match = /language-(\w+)/.exec(className || '');
                                    return match ? (
                                        <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
                                    ) : (
                                        <code {...rest} className={className}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}>{content}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="chat-markdown text-[15px] leading-[1.75] text-slate-100">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props;
                                    const match = /language-(\w+)/.exec(className || '');
                                    return match ? (
                                        <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
                                    ) : (
                                        <code {...rest} className={className}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}>{content}</ReactMarkdown>
                        </div>
                    )}

                    {!isStreaming && (
                        <button
                            onClick={handleCopy}
                            className="absolute -right-2 top-0 rounded-lg border border-slate-800 bg-[#2a2a2a] p-1.5 opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:bg-[#343434] z-10"
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
                <p className="mt-3 text-[10px] font-mono text-slate-600">
                    {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            )}
            </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

// Main Messages Container
interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
    streamingContent: string;
    streamingAgent: string;
    enableVoiceReplies?: boolean;
    speechLanguage?: string;
}

export default function ChatMessages({
    messages,
    isLoading,
    streamingContent,
    streamingAgent,
    enableVoiceReplies = false,
    speechLanguage = 'en',
}: ChatMessagesProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAutoScrollPaused = useRef(false);
    const lastSpokenMessageId = useRef<string | null>(null);
    const hasInitializedScroll = useRef(false);
    const touchStartY = useRef<number | null>(null);

    const isNearBottom = () => {
        if (!containerRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        return scrollHeight - scrollTop - clientHeight < 100;
    };

    const scrollToBottom = (behavior: ScrollBehavior) => {
        if (!containerRef.current) return;
        containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior,
        });
    };

    const handleScroll = () => {
        isAutoScrollPaused.current = !isNearBottom();
    };

    const handleWheelCapture = (event: React.WheelEvent<HTMLDivElement>) => {
        if (event.deltaY < 0) {
            isAutoScrollPaused.current = true;
        }
    };

    const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        touchStartY.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        const currentY = event.touches[0]?.clientY ?? null;
        if (touchStartY.current !== null && currentY !== null && currentY > touchStartY.current) {
            isAutoScrollPaused.current = true;
        }
    };

    useEffect(() => {
        // Only auto-scroll if the user hasn't explicitly scrolled up to read history
        if (!isAutoScrollPaused.current && containerRef.current) {
            scrollToBottom(streamingContent ? 'auto' : 'smooth');
        }
    }, [messages, streamingContent]);

    useLayoutEffect(() => {
        if (!messages.length) {
            hasInitializedScroll.current = false;
            return;
        }

        if (!hasInitializedScroll.current) {
            hasInitializedScroll.current = true;
            isAutoScrollPaused.current = false;
            requestAnimationFrame(() => scrollToBottom('auto'));
        }
    }, [messages.length]);

    useEffect(() => {
        if (!enableVoiceReplies || typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }

        const latestAssistant = [...messages].reverse().find((msg) => msg.role === 'assistant' && !msg.isHistory);
        if (!latestAssistant || lastSpokenMessageId.current === latestAssistant.id) {
            return;
        }

        lastSpokenMessageId.current = latestAssistant.id;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(latestAssistant.content.replace(/[#*_`>-]/g, ' ').trim());
        utterance.lang = speechLanguage || 'en';
        utterance.rate = 1;
        window.speechSynthesis.speak(utterance);

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [messages, enableVoiceReplies, speechLanguage]);

    return (
        <div 
            className="flex-1 min-h-0 overflow-y-auto p-6"
            ref={containerRef}
            onScroll={handleScroll}
            onWheelCapture={handleWheelCapture}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            <div className="space-y-8">
                {messages.map((msg) => (
                    <ChatMessage
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        agent={msg.agent}
                        timestamp={msg.timestamp}
                        files={msg.files}
                    />
                ))}

                {/* Streaming message */}
                {streamingContent && (
                    <ChatMessage
                        role="assistant"
                        content={streamingContent}
                        agent={streamingAgent}
                        isStreaming={true}
                    />
                )}

                {/* Thinking dots (before streaming starts) */}
                {isLoading && !streamingContent && (
                    <ThinkingBubble />
                )}
            </div>

            <div ref={messagesEndRef} />
        </div>
    );
}
