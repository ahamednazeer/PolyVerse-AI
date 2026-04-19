'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatLayout from '@/components/ChatLayout';
import ChatMessages, { Message } from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import WelcomeScreen from '@/components/WelcomeScreen';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/useChatStore';
import { toast } from 'sonner';

export default function ChatPage() {
    const fetchConversations = useChatStore(s => s.fetchConversations);
    const setActiveId = useChatStore(s => s.setActiveId);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingAgent, setStreamingAgent] = useState('');
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [responseVoiceEnabled, setResponseVoiceEnabled] = useState(false);
    const [activeLanguage, setActiveLanguage] = useState('en');
    const modelToastIdRef = React.useRef<string | number | null>(null);

    const stopModelProgressToast = React.useCallback(() => {
        if (modelToastIdRef.current !== null) {
            toast.dismiss(modelToastIdRef.current);
            modelToastIdRef.current = null;
        }
    }, []);

    useEffect(() => {
        setActiveId(undefined);

        const handleNewChat = () => {
            setMessages([]);
            setIsLoading(false);
            setStreamingContent('');
            setStreamingAgent('');
            setActiveConversationId(null);
        };

        window.addEventListener('chat:new', handleNewChat);
        return () => window.removeEventListener('chat:new', handleNewChat);
    }, [setActiveId]);

    const handleSendMessage = useCallback(async (
        message: string,
        fileIds?: string[],
        files?: { id: string; name: string; type: string; url?: string }[],
        options?: { language: string; voice: boolean; responseVoice: boolean },
    ) => {
        // Add user message
        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date(),
            files,
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setStreamingContent('');
        setStreamingAgent('');
        setResponseVoiceEnabled(Boolean(options?.responseVoice));
        setActiveLanguage(options?.language || 'en');

        let currentConvId = activeConversationId;
        let fullContent = '';
        let agentName = '';

        try {
            await api.chatStream(
                message,
                currentConvId || undefined,
                fileIds,
                options?.language || 'en',
                options?.voice || false,
                options?.responseVoice || false,
                (event) => {
                    switch (event.type) {
                        case 'conversation_id':
                            currentConvId = event.conversation_id;
                            if (!activeConversationId) {
                                setActiveConversationId(event.conversation_id);
                                setActiveId(event.conversation_id);
                                fetchConversations();
                            }
                            break;
                        case 'agent':
                            agentName = event.agent;
                            setStreamingAgent(event.agent);
                            break;
                        case 'content':
                            fullContent += event.content;
                            setStreamingContent(fullContent);
                            break;
                        case 'status':
                            if (event.status === 'loading_model' && event.message) {
                                modelToastIdRef.current = toast.loading(event.message, {
                                    id: modelToastIdRef.current ?? undefined,
                                });
                            } else if (event.status === 'loading_model_progress') {
                                modelToastIdRef.current = toast.loading('Downloading model. Please wait.', {
                                    id: modelToastIdRef.current ?? undefined,
                                });
                            }
                            break;
                        case 'done':
                            stopModelProgressToast();
                            // Finalize the message
                            setStreamingContent('');
                            setMessages(prev => [...prev, {
                                id: `ai-${Date.now()}`,
                                role: 'assistant',
                                content: fullContent,
                                agent: agentName,
                                timestamp: new Date(),
                            }]);
                            setIsLoading(false);
                            // Refresh conversations so the background-generated title updates natively!
                            useChatStore.getState().fetchConversations();
                            break;
                        case 'error':
                            stopModelProgressToast();
                            setStreamingContent('');
                            toast.error('The agent encountered an issue.');
                            setMessages(prev => [...prev, {
                                id: `error-${Date.now()}`,
                                role: 'assistant',
                                content: event.content || 'I encountered an error processing your request. Please try again.',
                                timestamp: new Date(),
                            }]);
                            setIsLoading(false);
                            break;
                    }
                }
            );
        } catch (err: any) {
            stopModelProgressToast();
            setStreamingContent('');
            toast.error('Network connection failed.');
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Network connection failed. Please check your internet and server connection, then try again.',
                timestamp: new Date(),
            }]);
            setIsLoading(false);
        }
    }, [activeConversationId, stopModelProgressToast]);

    const hasMessages = messages.length > 0 || isLoading;

    return (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#212121]">
            <div className={`flex-1 min-h-0 flex flex-col ${!hasMessages ? 'justify-center items-center py-10' : ''}`}>
                <AnimatePresence mode="popLayout">
                    {!hasMessages && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -40, scale: 0.98 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="w-full flex flex-col justify-center max-w-3xl mx-auto px-4 mb-4 z-0"
                        >
                            <WelcomeScreen onSendMessage={handleSendMessage} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {hasMessages && (
                    <motion.div
                        key="messages"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className="flex-1 min-h-0 w-full overflow-hidden flex flex-col"
                    >
                        <ChatMessages
                            messages={messages}
                            isLoading={isLoading}
                            streamingContent={streamingContent}
                            streamingAgent={streamingAgent}
                            enableVoiceReplies={responseVoiceEnabled}
                            speechLanguage={activeLanguage}
                        />
                    </motion.div>
                )}

                <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`w-full z-10 shrink-0 ${!hasMessages ? 'max-w-3xl mx-auto px-4 pb-12' : ''}`}
                >
                    <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
                </motion.div>
            </div>
        </div>
    );
}
