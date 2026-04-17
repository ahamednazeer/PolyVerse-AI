'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ChatLayout from '@/components/ChatLayout';
import ChatMessages, { Message } from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import { api } from '@/lib/api';
import { Robot } from '@phosphor-icons/react';

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.id as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingAgent, setStreamingAgent] = useState('');

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
            } catch (err) {
                console.error('Failed to load conversation:', err);
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

        let fullContent = '';
        let agentName = '';

        try {
            await api.chatStream(
                message,
                conversationId,
                fileIds,
                'en',
                false,
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
                        case 'done':
                            setStreamingContent('');
                            setMessages(prev => [...prev, {
                                id: `ai-${Date.now()}`,
                                role: 'assistant',
                                content: fullContent,
                                agent: agentName,
                                timestamp: new Date(),
                            }]);
                            setIsLoading(false);
                            break;
                        case 'error':
                            setStreamingContent('');
                            setMessages(prev => [...prev, {
                                id: `error-${Date.now()}`,
                                role: 'assistant',
                                content: event.content || 'An error occurred.',
                                timestamp: new Date(),
                            }]);
                            setIsLoading(false);
                            break;
                    }
                }
            );
        } catch (err: any) {
            setStreamingContent('');
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: err.message || 'Failed to connect.',
                timestamp: new Date(),
            }]);
            setIsLoading(false);
        }
    }, [conversationId]);

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
        <div className="flex flex-col h-full">
            <ChatMessages
                messages={messages}
                isLoading={isLoading}
                streamingContent={streamingContent}
                streamingAgent={streamingAgent}
            />
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
    );
}
