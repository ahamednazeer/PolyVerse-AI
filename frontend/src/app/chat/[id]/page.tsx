'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ChatLayout from '@/components/ChatLayout';
import ChatMessages, { Message } from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import { api } from '@/lib/api';
import { Robot } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/useChatStore';

export default function ConversationPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.id as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingAgent, setStreamingAgent] = useState('');
    const [responseVoiceEnabled, setResponseVoiceEnabled] = useState(false);
    const [activeLanguage, setActiveLanguage] = useState('en');
    const modelToastIdRef = React.useRef<string | number | null>(null);

    const stopModelProgressToast = React.useCallback(() => {
        if (modelToastIdRef.current !== null) {
            toast.dismiss(modelToastIdRef.current);
            modelToastIdRef.current = null;
        }
    }, []);

    // Load conversation history
    useEffect(() => {
        async function loadHistory() {
            try {
                const result = await api.getConversation(conversationId);
                const loadedMessages: Message[] = (result.messages || []).map((msg: any) => ({
                    id: msg._id,
                    role: msg.role,
                    content: msg.content,
                    agent: msg.agent || undefined,
                    timestamp: new Date(msg.created_at),
                    isHistory: true,
                    files: (msg.files || []).map((file: any) => ({
                        ...file,
                        url: file.url ? api.getUploadUrl(file.url) : undefined,
                    })),
                }));
                setMessages(loadedMessages);
            } catch (err: any) {
                console.error('Failed to load conversation:', err);
                toast.error(err.message || 'Unable to load this conversation.');
                router.push('/chat');
            } finally {
                setLoadingHistory(false);
            }
        }
        loadHistory();
    }, [conversationId]);

    const handleSendMessage = useCallback(async (
        message: string,
        fileIds?: string[],
        files?: { id: string; name: string; type: string; url?: string }[],
        options?: { language: string; voice: boolean; responseVoice: boolean },
    ) => {
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

        let fullContent = '';
        let agentName = '';

        try {
            await api.chatStream(
                message,
                conversationId,
                fileIds,
                options?.language || 'en',
                options?.voice || false,
                options?.responseVoice || false,
                (event) => {
                    switch (event.type) {
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
                            setStreamingContent('');
                            setMessages(prev => [...prev, {
                                id: `ai-${Date.now()}`,
                                role: 'assistant',
                                content: fullContent,
                                agent: agentName,
                                timestamp: new Date(),
                            }]);
                            setIsLoading(false);
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
    }, [conversationId, stopModelProgressToast]);

    if (loadingHistory) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                    <Robot size={48} className="text-blue-500 animate-pulse mx-auto" />
                    <div className="text-slate-500 font-mono text-sm animate-pulse">LOADING CONVERSATION...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ChatMessages
                messages={messages}
                isLoading={isLoading}
                streamingContent={streamingContent}
                streamingAgent={streamingAgent}
                enableVoiceReplies={responseVoiceEnabled}
                speechLanguage={activeLanguage}
            />
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
    );
}
