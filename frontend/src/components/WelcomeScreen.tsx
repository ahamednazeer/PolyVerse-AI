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
        <div className="flex-1 w-full flex items-center justify-center">
            <h2 className="text-[28px] font-medium text-white/90 tracking-tight">
                Where should we begin?
            </h2>
        </div>
    );
}
