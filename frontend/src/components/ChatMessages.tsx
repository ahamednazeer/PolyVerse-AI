'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Brain,
    Copy,
    Check,
    BookOpen,
    Code,
    Eye,
    Heart,
    Globe,
    Sparkle,
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

const agentLabels: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    teaching: { label: 'Teaching', className: 'agent-teaching', icon: BookOpen },
    coding: { label: 'Coding', className: 'agent-coding', icon: Code },
    general: { label: 'General', className: 'agent-general', icon: Brain },
    vision: { label: 'Vision', className: 'agent-vision', icon: Eye },
    wellness: { label: 'Wellness', className: 'agent-wellness', icon: Heart },
    multilingual: { label: 'Multilingual', className: 'agent-multilingual', icon: Globe },
};

function getAttachmentLabel(file: NonNullable<Message["files"]>[number]) {
    if (file.type.startsWith('audio/')) return 'Voice note';
    return file.name || 'Attachment';
}

// AI Avatar — same design from AIAssistant.tsx
const AIAvatar = ({ isThinking, agent }: { isThinking: boolean; agent?: string }) => {
    const info = agent ? agentLabels[agent] : null;
    const Icon = info?.icon || Brain;

    return (
        <div className="relative flex-shrink-0">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30 ${isThinking ? 'animate-pulse' : ''}`}>
                <Icon size={18} className="text-blue-400" weight="duotone" />
            </div>
            {isThinking && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
            )}
        </div>
    );
};

// Thinking dots — same from AIAssistant.tsx
const ThinkingBubble = () => (
    <div className="flex items-start gap-3 animate-slide-in">
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
                <div className="max-w-[75%] px-4 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm leading-relaxed rounded-2xl rounded-br-sm shadow-lg shadow-blue-900/20">
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
                                        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-50">
                                            <ImageIcon size={12} />
                                            <span className="max-w-[96px] truncate">{getAttachmentLabel(file)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={file.id} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-blue-50 border border-white/10">
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

    const agentInfo = agent ? agentLabels[agent] : null;
    const AgentBadgeIcon = agentInfo?.icon || Sparkle;

    return (
        <div className="flex items-start gap-3 group">
            <AIAvatar isThinking={false} agent={agent} />
            <div className="flex-1 max-w-[85%]">
                {/* Agent badge */}
                {agentInfo && (
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-md border mb-1.5 ${agentInfo.className}`}>
                        <AgentBadgeIcon size={10} />
                        {agentInfo.label} Agent
                    </div>
                )}

                <div className="bg-slate-800/60 backdrop-blur-sm px-5 py-3.5 rounded-2xl rounded-tl-md border border-slate-700/50 text-sm text-slate-200 leading-relaxed relative">
                    {isStreaming ? (
                        <div className="chat-markdown text-[13.5px] leading-[1.6]">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props;
                                    const match = /language-(\w+)/.exec(className || '');
                                    return match ? (
                                        <SyntaxHighlighter
                                            {...(rest as any)}
                                            PreTag="div"
                                            children={String(children).replace(/\n$/, '')}
                                            language={match[1]}
                                            style={vscDarkPlus}
                                            customStyle={{ margin: '1em 0', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #334155' }}
                                        />
                                    ) : (
                                        <code {...rest} className={className}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}>{content}</ReactMarkdown>
                            <span className="inline-block w-2.5 h-4 ml-1 bg-slate-400 animate-pulse align-middle mb-0.5" />
                        </div>
                    ) : (
                        <div className="chat-markdown text-[13.5px] leading-[1.6]">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props;
                                    const match = /language-(\w+)/.exec(className || '');
                                    return match ? (
                                        <SyntaxHighlighter
                                            {...(rest as any)}
                                            PreTag="div"
                                            children={String(children).replace(/\n$/, '')}
                                            language={match[1]}
                                            style={vscDarkPlus}
                                            customStyle={{ margin: '1em 0', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #334155' }}
                                        />
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

// Main Messages Container
interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
    streamingContent: string;
    streamingAgent: string;
}

export default function ChatMessages({ messages, isLoading, streamingContent, streamingAgent }: ChatMessagesProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg, idx) => (
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

            <div ref={messagesEndRef} />
        </div>
    );
}
