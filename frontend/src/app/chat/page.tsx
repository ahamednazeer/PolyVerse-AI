'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChatLayout from '@/components/ChatLayout';
import ChatMessages, { Message } from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import WelcomeScreen from '@/components/WelcomeScreen';
import { api } from '@/lib/api';

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingAgent, setStreamingAgent] = useState('');
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    useEffect(() => {
        const handleNewChat = () => {
            setMessages([]);
            setIsLoading(false);
            setStreamingContent('');
            setStreamingAgent('');
            setActiveConversationId(null);
        };

        const handleRefresh = (event: Event) => {
            const customEvent = event as CustomEvent<{ id?: string }>;
            if (customEvent.detail?.id) {
                setActiveConversationId(customEvent.detail.id);
            }
        };

        window.addEventListener('chat:new', handleNewChat);
        window.addEventListener('chat:refreshList', handleRefresh as EventListener);
        return () => {
            window.removeEventListener('chat:new', handleNewChat);
            window.removeEventListener('chat:refreshList', handleRefresh as EventListener);
        };
    }, []);

    const handleSendMessage = useCallback(async (
        message: string,
        fileIds?: string[],
        files?: { id: string; name: string; type: string; url?: string }[],
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

        let currentConvId = activeConversationId;
        let fullContent = '';
        let agentName = '';

        try {
            await api.chatStream(
                message,
                currentConvId || undefined,
                fileIds,
                'en',
                false,
                (event) => {
                    switch (event.type) {
                        case 'conversation_id':
                            currentConvId = event.conversation_id;
                            if (!activeConversationId) {
                                setActiveConversationId(event.conversation_id);
                                window.dispatchEvent(new CustomEvent('chat:refreshList', {
                                    detail: { id: event.conversation_id },
                                }));
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
                        case 'done':
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
                            break;
                        case 'error':
                            setStreamingContent('');
                            setMessages(prev => [...prev, {
                                id: `error-${Date.now()}`,
                                role: 'assistant',
                                content: event.content || 'An error occurred. Please try again.',
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
                content: err.message || 'Failed to connect. Please try again.',
                timestamp: new Date(),
            }]);
            setIsLoading(false);
        }
    }, [activeConversationId]);

    const hasMessages = messages.length > 0 || isLoading;

    return (
        <div className="flex flex-col h-full">
            {hasMessages ? (
                <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    streamingContent={streamingContent}
                    streamingAgent={streamingAgent}
                />
            ) : (
                <WelcomeScreen onSendMessage={handleSendMessage} />
            )}
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
    );
}
