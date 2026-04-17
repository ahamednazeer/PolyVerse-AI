'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
    ArrowLeft, Hash, Pin, Send, Users, Volume2, Search,
    MoreVertical, Reply, Trash2, MessageCircle, Plus, Lock, MessageSquare, X
} from 'lucide-react';
import JitsiEmbed from '@/components/JitsiEmbed';
import Link from 'next/link';

interface Circle {
    id: number;
    name: string;
    description?: string;
    subject_code?: string;
    has_voice_room: boolean;
    voice_room_url?: string;
}

interface Channel {
    id: number;
    circle_id: number;
    name: string;
    description?: string;
    channel_type: string;
    is_readonly: boolean;
}

interface Message {
    id: number;
    channel_id: number;
    user_id: number;
    content: string;
    parent_id?: number;
    thread_count: number;
    is_pinned: boolean;
    created_at: string;
    user_name?: string;
    user_initials?: string;
}

export default function StudyCirclesPage() {
    const [circles, setCircles] = useState<Circle[]>([]);
    const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [currentMemberRole, setCurrentMemberRole] = useState<string | null>(null);
    const [showVoiceEmbed, setShowVoiceEmbed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadCircles();
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await api.getMe();
            setCurrentUser(data);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    useEffect(() => {
        if (selectedCircle) {
            loadChannels(selectedCircle.id);
            loadMembership(selectedCircle.id);
        }
    }, [selectedCircle]);

    const loadMembership = async (circleId: number) => {
        if (!currentUser) return;
        try {
            const members = await api.getCircleMembers(circleId);
            const me = members.find((m: any) => m.user_id === currentUser.id);
            setCurrentMemberRole(me?.role || null);
        } catch (error) {
            console.error('Error loading membership:', error);
        }
    };

    useEffect(() => {
        if (selectedChannel) {
            loadMessages(selectedChannel.id);
        }
    }, [selectedChannel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadCircles = async () => {
        try {
            setLoading(true);
            const data = await api.getMyStudyCircles();
            setCircles(data);
            if (data.length > 0 && !selectedCircle) {
                setSelectedCircle(data[0]);
            }
        } catch (error) {
            console.error('Error loading circles:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChannels = async (circleId: number) => {
        try {
            const data = await api.getCircleChannels(circleId);
            setChannels(data);
            if (data.length > 0) {
                setSelectedChannel(data[0]);
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    };

    const loadMessages = async (channelId: number) => {
        try {
            const circle = selectedCircle;
            if (!circle) return;
            const data = await api.getChannelMessages(circle.id, channelId);
            setMessages(data.reverse());
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedCircle || !selectedChannel) return;

        try {
            await api.postMessage(
                selectedCircle.id,
                selectedChannel.id,
                newMessage,
                replyTo?.id
            );
            setNewMessage('');
            setReplyTo(null);
            loadMessages(selectedChannel.id);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handlePin = async (messageId: number) => {
        if (!selectedCircle) return;
        const canPin = currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN' || currentMemberRole === 'MODERATOR';
        if (!canPin) {
            console.warn('Unauthorized: Only moderators can pin messages');
            return;
        }
        try {
            await api.pinMessage(selectedCircle.id, messageId);
            if (selectedChannel) loadMessages(selectedChannel.id);
        } catch (error) {
            console.error('Error pinning message:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const response = await api.uploadFile(file);
            const fileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${response.url}`;
            const linkMarkdown = `[${response.original_name}](${fileUrl})`;

            setNewMessage(prev => prev ? `${prev}\n${linkMarkdown}` : linkMarkdown);

            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload file');
        }
    };

    const handleReply = (message: Message) => {
        setReplyTo(message);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    if (circles.length === 0) {
        return (
            <div className="p-6">
                <Link href="/dashboard/student/learning" className="flex items-center gap-2 text-slate-400 hover:text-slate-100 mb-6 font-mono text-sm group">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    BACK_TO_HUB
                </Link>
                <div className="text-center py-24 bg-slate-900/50 border border-slate-800 border-dashed rounded-sm">
                    <Users className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                    <h2 className="text-xl font-chivo font-black text-slate-100 mb-2 uppercase tracking-tight">Access Denied: No Circles</h2>
                    <p className="text-slate-500 font-mono text-xs mb-8 uppercase">Join a study network to initiate communication protocols</p>
                    <button
                        onClick={() => api.autoEnrollCircles().then(loadCircles)}
                        className="btn-primary"
                    >
                        Auto-Initialize Networks
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] flex bg-slate-950 border border-slate-800 rounded-sm overflow-hidden animate-scale-in">
            {/* Sidebar Pane 1: Circles */}
            <div className="w-16 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/50 flex flex-col items-center py-4 gap-4 overflow-y-auto scrollbar-none">
                {circles.map(circle => (
                    <button
                        key={circle.id}
                        onClick={() => setSelectedCircle(circle)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative group border ${selectedCircle?.id === circle.id
                            ? 'bg-blue-600 text-white border-blue-400/50 shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                            : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        title={circle.name}
                    >
                        {circle.name.substring(0, 2).toUpperCase()}
                        {selectedCircle?.id === circle.id && (
                            <div className="absolute -left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                        )}
                        <div className="absolute left-16 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-slate-700">
                            {circle.name}
                        </div>
                    </button>
                ))}
            </div>

            {/* Sidebar Pane 2: Channels */}
            <div className="w-60 bg-slate-950/40 backdrop-blur-md border-r border-slate-800/50 flex flex-col">
                <div className="p-4 border-b border-slate-800">
                    <h2 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Circle Network</h2>
                    <div className="text-sm font-chivo font-bold text-slate-100 truncate">
                        {selectedCircle?.name}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex items-center gap-2 px-2 py-2 mb-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                        <MessageSquare className="w-3 h-3" />
                        Comm-Links
                    </div>
                    {channels.filter(c => c.channel_type !== 'VOICE').map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => setSelectedChannel(channel)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm mb-0.5 transition-all text-sm font-medium ${selectedChannel?.id === channel.id
                                ? 'bg-blue-900/30 text-blue-400 border-l-2 border-blue-500'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                        >
                            <Hash className="w-4 h-4 flex-shrink-0 opacity-60" />
                            <span className="truncate">{channel.name}</span>
                            {channel.is_readonly && (
                                <Lock className="w-3 h-3 text-slate-600 ml-auto" />
                            )}
                        </button>
                    ))}

                    {selectedCircle?.has_voice_room && (
                        <>
                            <div className="flex items-center gap-2 px-2 py-2 mt-4 mb-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                                <Volume2 className="w-3 h-3" />
                                Audio-Node
                            </div>
                            <button
                                onClick={() => {
                                    if (selectedCircle.voice_room_url) {
                                        setShowVoiceEmbed(!showVoiceEmbed);
                                    } else {
                                        alert('Voice room interface not initialized. Please contact support.');
                                    }
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm transition-all text-sm font-medium ${showVoiceEmbed
                                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                    }`}
                            >
                                <Volume2 className={`w-4 h-4 ${showVoiceEmbed ? 'opacity-100' : 'opacity-60'}`} />
                                <span>Voice Interface</span>
                                {showVoiceEmbed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                        </>
                    )}
                </div>

                {/* Profile Peek */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                            {currentUser?.first_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200 truncate">{currentUser?.first_name} {currentUser?.last_name}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate uppercase">{currentUser?.role}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-950">
                {/* Channel Header */}
                <div className="h-14 flex items-center justify-between px-6 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/50 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Hash className="w-5 h-5 text-blue-500/60" />
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-chivo font-bold text-slate-100 uppercase tracking-wide">
                                    {selectedChannel?.name || 'TERMINAL_IDLE'}
                                </span>
                                {(selectedChannel?.is_readonly && currentUser?.role !== 'STAFF' && currentUser?.role !== 'ADMIN') && (
                                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-sm">READ_ONLY</span>
                                )}
                            </div>
                            {selectedChannel?.description && (
                                <span className="text-xs font-mono text-slate-500 truncate max-w-sm block">#{selectedChannel.description}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                            <input
                                type="text"
                                placeholder="SEARCH_BUFFERS..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-sm text-xs font-mono focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all w-32 focus:w-48 outline-none"
                            />
                        </div>
                        <button className="p-2 hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors rounded-sm">
                            <Users size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hud">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <div className="w-16 h-16 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center mb-4">
                                <MessageCircle className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-sm font-mono uppercase tracking-[0.2em] text-slate-500">Signal Not Detected</p>
                        </div>
                    ) : (
                        messages.map((message, idx) => {
                            const showDate = idx === 0 ||
                                formatDate(message.created_at) !== formatDate(messages[idx - 1].created_at);
                            const isOwn = message.user_id === currentUser?.id;

                            return (
                                <React.Fragment key={message.id}>
                                    {showDate && (
                                        <div className="flex items-center gap-4 py-2">
                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                                            <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-[0.3em]">{formatDate(message.created_at)}</span>
                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                                        </div>
                                    )}
                                    <div className={`group flex w-full animate-slide-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-4 max-w-[85%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-9 h-9 rounded-sm flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 transition-all ${isOwn
                                                ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30'
                                                : 'bg-slate-800 border border-slate-700'
                                                }`}>
                                                {message.user_initials || 'U'}
                                            </div>
                                            <div className={`min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                                    <span className={`text-xs font-bold ${isOwn ? 'text-blue-400' : 'text-slate-200'}`}>
                                                        {isOwn ? 'YOU' : (message.user_name || `NODE_${message.user_id}`)}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-600">{formatTime(message.created_at)}</span>
                                                </div>
                                                <div className={`relative max-w-[85%] px-4 py-2.5 rounded-sm border transition-all ${isOwn
                                                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-50 shadow-[0_0_15px_rgba(37,99,235,0.05)]'
                                                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                                                    }`}>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-inter">{message.content}</p>
                                                    {message.is_pinned && (
                                                        <Pin className="absolute -right-1 -top-1 w-3 h-3 text-amber-500 bg-slate-950 rounded-full p-0.5 border border-slate-700" />
                                                    )}
                                                </div>
                                                {message.thread_count > 0 && (
                                                    <button className={`mt-1.5 text-[10px] font-mono font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase flex items-center gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                                        <Reply className="w-3 h-3" />
                                                        {message.thread_count} LINKED_THREADS
                                                    </button>
                                                )}
                                            </div>
                                            {/* Actions reveal on hover */}
                                            <div className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 self-center transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
                                                <button
                                                    onClick={() => handleReply(message)}
                                                    className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-colors rounded-sm border border-transparent hover:border-slate-700"
                                                    title="Reply"
                                                >
                                                    <Reply size={14} />
                                                </button>
                                                {(currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN' || currentMemberRole === 'MODERATOR') && (
                                                    <button
                                                        onClick={() => handlePin(message.id)}
                                                        className={`p-1.5 hover:bg-slate-800 transition-colors rounded-sm border border-transparent hover:border-slate-700 ${message.is_pinned ? 'text-amber-500' : 'text-slate-500 hover:text-amber-500'}`}
                                                        title={message.is_pinned ? "Unpin" : "Pin"}
                                                    >
                                                        <Pin size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Voice Embed HUD */}
                {showVoiceEmbed && selectedCircle?.voice_room_url && (
                    <div className="absolute right-6 top-20 w-[400px] h-[500px] bg-slate-950/80 backdrop-blur-2xl border border-blue-500/30 rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.5)] z-50 flex flex-col animate-slide-in overflow-hidden">
                        <div className="h-10 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/50">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">AUDIO_LINK_ACTIVE</span>
                            </div>
                            <button
                                onClick={() => setShowVoiceEmbed(false)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <Plus className="w-4 h-4 rotate-45" />
                            </button>
                        </div>
                        <div className="flex-1 bg-black relative">
                            <JitsiEmbed
                                roomName={selectedCircle.voice_room_url}
                                displayName={currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : 'HUD_USER'}
                                email={currentUser?.email}
                                userId={`student-${currentUser?.id}`}
                                onLeave={() => setShowVoiceEmbed(false)}
                            />
                        </div>
                        <div className="p-2 border-t border-slate-800 bg-slate-900/30 flex justify-center">
                            <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">STATION_ID: {selectedCircle.id} // SECURE_LINE</span>
                        </div>
                    </div>
                )}

                {/* Message Input */}
                {selectedChannel && (!selectedChannel.is_readonly || currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN') ? (
                    <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-800/80 bg-slate-950/50 backdrop-blur-md">
                        {replyTo && (
                            <div className="mb-3 flex items-center justify-between bg-blue-900/20 border border-blue-500/30 px-3 py-2 rounded-sm animate-slide-in">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Reply className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                    <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider">Replying to {replyTo.user_name || 'NODE'}</span>
                                    <span className="text-[10px] text-slate-500 truncate italic">"{replyTo.content}"</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReplyTo(null)}
                                    className="p-1 hover:text-white text-slate-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-sm px-4 py-1.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/10 transition-all shadow-inner">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-slate-500 hover:text-blue-400 transition-colors rounded-sm hover:bg-slate-800"
                            >
                                <Plus size={20} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={`TRANSMIT TO #${selectedChannel?.name.toUpperCase()}...`}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 text-sm font-mono placeholder:text-slate-600 outline-none py-2"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-20 disabled:text-slate-600 transition-all hover:scale-110 active:scale-95"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <div className="mt-2 flex justify-between items-center px-1">
                            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                Connection Stable
                            </span>
                            <span className="text-[10px] font-mono text-slate-700 italic">Press [Enter] to transmit signal</span>
                        </div>
                    </form>
                ) : (
                    selectedChannel && (
                        <div className="p-6 bg-slate-900/30 border-t border-slate-800/50 text-center backdrop-blur-sm">
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-sm border border-slate-800 bg-slate-950/50">
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">
                                    Secure Link: <span className="text-blue-500/80">Receiver_Only_Mode</span>
                                </span>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
