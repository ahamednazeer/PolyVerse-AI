'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Message {
    id: number;
    channel_id: number;
    user_id: number;
    content: string;
    parent_id?: number;
    is_pinned: boolean;
    created_at: string;
}

interface UseCircleWebSocketOptions {
    circleId: number;
    channelId: number;
    userId: number;
    onMessage?: (message: Message) => void;
    onTyping?: (userId: number) => void;
    onStopTyping?: (userId: number) => void;
    onUserLeft?: (userId: number) => void;
}

export function useCircleWebSocket({
    circleId,
    channelId,
    userId,
    onMessage,
    onTyping,
    onStopTyping,
    onUserLeft,
}: UseCircleWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined);

    const connect = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('No authentication token');
            return;
        }

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/circles/${circleId}/channels/${channelId}?token=${token}`;

        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setConnected(true);
                setError(null);
                console.log('[WS] Connected to channel', channelId);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'new_message':
                            onMessage?.(data.message);
                            break;
                        case 'user_typing':
                            onTyping?.(data.user_id);
                            break;
                        case 'user_stop_typing':
                            onStopTyping?.(data.user_id);
                            break;
                        case 'user_left':
                            onUserLeft?.(data.user_id);
                            break;
                    }
                } catch (e) {
                    console.error('[WS] Failed to parse message:', e);
                }
            };

            ws.onerror = (event) => {
                console.error('[WS] Error:', event);
                setError('WebSocket connection error');
            };

            ws.onclose = (event) => {
                setConnected(false);
                console.log('[WS] Disconnected:', event.code, event.reason);

                // Attempt to reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (wsRef.current === ws) {
                        connect();
                    }
                }, 3000);
            };

            wsRef.current = ws;
        } catch (e) {
            console.error('[WS] Failed to connect:', e);
            setError('Failed to connect');
        }
    }, [circleId, channelId, onMessage, onTyping, onStopTyping, onUserLeft]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const sendMessage = useCallback((content: string, parentId?: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'send_message',
                content,
                parent_id: parentId,
                user_id: userId,
            }));
        }
    }, [userId]);

    const sendTyping = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                user_id: userId,
            }));
        }
    }, [userId]);

    const sendStopTyping = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'stop_typing',
                user_id: userId,
            }));
        }
    }, [userId]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        connected,
        error,
        sendMessage,
        sendTyping,
        sendStopTyping,
        reconnect: connect,
    };
}
