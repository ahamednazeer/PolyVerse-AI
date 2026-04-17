'use client';

import React from 'react';
import {
    Brain,
    Code,
    Eye,
    Heart,
    Globe,
    BookOpen,
    Sparkle,
    Lightning,
} from '@phosphor-icons/react';

interface WelcomeScreenProps {
    onSendMessage: (message: string) => void;
}

const agentCards = [
    {
        icon: BookOpen,
        name: 'Teaching',
        description: 'Learn concepts with RAG-powered explanations',
        color: 'from-purple-500/20 to-purple-900/10',
        borderColor: 'border-purple-500/30',
        iconColor: 'text-purple-400',
    },
    {
        icon: Code,
        name: 'Coding',
        description: 'Write, debug, and review code',
        color: 'from-green-500/20 to-green-900/10',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400',
    },
    {
        icon: Eye,
        name: 'Vision',
        description: 'Analyze images and visual content',
        color: 'from-amber-500/20 to-amber-900/10',
        borderColor: 'border-amber-500/30',
        iconColor: 'text-amber-400',
    },
    {
        icon: Globe,
        name: 'Multilingual',
        description: 'Chat in multiple languages',
        color: 'from-cyan-500/20 to-cyan-900/10',
        borderColor: 'border-cyan-500/30',
        iconColor: 'text-cyan-400',
    },
    {
        icon: Heart,
        name: 'Wellness',
        description: 'Mental health & wellness support',
        color: 'from-pink-500/20 to-pink-900/10',
        borderColor: 'border-pink-500/30',
        iconColor: 'text-pink-400',
    },
    {
        icon: Brain,
        name: 'General',
        description: 'Everyday questions & conversation',
        color: 'from-blue-500/20 to-blue-900/10',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
    },
];

const suggestions = [
    "Explain quantum computing simply",
    "Write a Python REST API",
    "Help me debug this error",
    "Translate this to Hindi",
    "How to manage stress?",
    "What can you help with?",
];

export default function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
    return (
        <div className="flex-1 overflow-y-auto w-full">
            <div className="flex flex-col items-center justify-center min-h-full space-y-8 py-12 px-4 max-w-3xl mx-auto">
                {/* Hero */}
            <div className="relative animate-float">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-2xl animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center border border-slate-700/50 shadow-2xl">
                    <Brain size={48} className="text-blue-400" weight="duotone" />
                </div>
            </div>

            <div className="text-center space-y-3">
                <h2 className="text-3xl font-chivo font-bold uppercase tracking-wider">
                    <span className="text-gradient">PolyVerse</span> AI
                </h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                    Your intelligent multi-agent platform. I automatically route your questions to the best specialized agent — teaching, coding, vision, and more.
                </p>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                {agentCards.map((agent) => {
                    const Icon = agent.icon;
                    return (
                        <div
                            key={agent.name}
                            className={`bg-gradient-to-br ${agent.color} border ${agent.borderColor} rounded-lg p-3 transition-all duration-200 hover:scale-[1.02] cursor-default group`}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <Icon size={18} className={agent.iconColor} weight="duotone" />
                                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{agent.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{agent.description}</p>
                        </div>
                    );
                })}
            </div>

            {/* Suggestions */}
            <div className="space-y-3 w-full max-w-2xl">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-mono text-center">Try asking</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((text, i) => (
                        <button
                            key={i}
                            onClick={() => onSendMessage(text)}
                            className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/30 rounded-full text-xs text-slate-400 hover:text-white transition-all flex items-center gap-1.5 group"
                        >
                            <Sparkle size={10} className="text-blue-400 group-hover:text-yellow-400 transition-colors" weight="fill" />
                            {text}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <Lightning size={10} weight="fill" />
                Powered by Groq • Llama 3.3
            </p>
            </div>
        </div>
    );
}
