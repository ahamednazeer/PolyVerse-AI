'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

// Module types matching backend
type AIModule =
    | 'dashboard'
    | 'reading'
    | 'quiz'
    | 'attendance'
    | 'hostel'
    | 'outpass'
    | 'queries'
    | 'complaints'
    | 'profile'
    | 'certificates'
    | 'streak';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ActionChip {
    label: string;
    url: string;
}

interface AIAssistantContextType {
    // State
    isOpen: boolean;
    isLoading: boolean;
    isBlocked: boolean;
    blockedReason: string | null;
    currentModule: AIModule;
    currentPdfId: number | null;
    messages: Message[];
    actionChips: ActionChip[];

    // Actions
    toggleOpen: () => void;
    sendMessage: (message: string) => Promise<void>;
    setPdfContext: (pdfId: number | null) => void;
    clearMessages: () => void;
    checkQuizStatus: () => Promise<void>;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

export const useAIAssistant = () => {
    const context = useContext(AIAssistantContext);
    if (!context) {
        throw new Error('useAIAssistant must be used within AIAssistantProvider');
    }
    return context;
};

// Map URL paths to AI modules
function getModuleFromPath(pathname: string): AIModule {
    if (pathname.includes('/read/')) return 'reading';
    if (pathname.includes('/quizzes/') && pathname.match(/\/quizzes\/\d+/)) return 'quiz';
    if (pathname.includes('/attendance')) return 'attendance';
    if (pathname.includes('/hostel')) return 'hostel';
    if (pathname.includes('/outpass')) return 'outpass';
    if (pathname.includes('/queries')) return 'queries';
    if (pathname.includes('/complaints')) return 'complaints';
    if (pathname.includes('/profile')) return 'profile';
    if (pathname.includes('/certificates')) return 'certificates';
    if (pathname.includes('/streak')) return 'streak';
    return 'dashboard';
}

interface AIAssistantProviderProps {
    children: ReactNode;
}

export function AIAssistantProvider({ children }: AIAssistantProviderProps) {
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockedReason, setBlockedReason] = useState<string | null>(null);
    const [currentModule, setCurrentModule] = useState<AIModule>('dashboard');
    const [currentPdfId, setCurrentPdfId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [actionChips, setActionChips] = useState<ActionChip[]>([]);

    // Update module based on current path
    useEffect(() => {
        const module = getModuleFromPath(pathname);
        setCurrentModule(module);

        // Extract PDF ID from reading path if present
        const readMatch = pathname.match(/\/read\/(\d+)/);
        if (readMatch) {
            setCurrentPdfId(parseInt(readMatch[1]));
        } else {
            setCurrentPdfId(null);
        }

        // Check if blocked (like during quiz)
        if (module === 'quiz') {
            setIsBlocked(true);
            setBlockedReason('AI Assistant is disabled during quizzes to maintain fairness.');
            setIsOpen(false); // Force close
        } else {
            setIsBlocked(false);
            setBlockedReason(null);
        }
    }, [pathname]);

    // Check quiz status on mount and when relevant
    const checkQuizStatus = useCallback(async () => {
        try {
            const status = await api.getAIQuizStatus();
            if (status.ai_blocked) {
                setIsBlocked(true);
                setBlockedReason(status.message || 'AI Assistant is disabled during quizzes.');
                setIsOpen(false);
            } else {
                // Only unblock if we're not on quiz page
                if (currentModule !== 'quiz') {
                    setIsBlocked(false);
                    setBlockedReason(null);
                }
            }
        } catch (error) {
            // If API fails, don't block
            console.error('Failed to check quiz status:', error);
        }
    }, [currentModule]);

    // Check quiz status periodically
    useEffect(() => {
        checkQuizStatus();
        const interval = setInterval(checkQuizStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [checkQuizStatus]);

    const toggleOpen = useCallback(() => {
        if (isBlocked) return; // Don't open if blocked
        setIsOpen(prev => !prev);
    }, [isBlocked]);

    const setPdfContext = useCallback((pdfId: number | null) => {
        setCurrentPdfId(pdfId);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setActionChips([]);
    }, []);

    const sendMessage = useCallback(async (message: string) => {
        if (isBlocked || !message.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setActionChips([]);

        try {
            const response = await api.aiChat(
                message.trim(),
                currentModule,
                currentPdfId || undefined,
                undefined,
                messages.slice(-10) // Send last 10 messages as history
            );

            if (response.is_blocked) {
                setIsBlocked(true);
                setBlockedReason(response.blocked_reason || 'AI is not available.');
                setIsOpen(false);
                return;
            }

            // Add AI response
            const aiMessage: Message = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: response.response,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMessage]);

            // Set action chips if any
            if (response.action_chips?.length > 0) {
                setActionChips(response.action_chips);
            }
        } catch (error: any) {
            // Add error message
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: error.message || 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isBlocked, currentModule, currentPdfId]);

    const value: AIAssistantContextType = {
        isOpen,
        isLoading,
        isBlocked,
        blockedReason,
        currentModule,
        currentPdfId,
        messages,
        actionChips,
        toggleOpen,
        sendMessage,
        setPdfContext,
        clearMessages,
        checkQuizStatus,
    };

    return (
        <AIAssistantContext.Provider value={value}>
            {children}
        </AIAssistantContext.Provider>
    );
}
