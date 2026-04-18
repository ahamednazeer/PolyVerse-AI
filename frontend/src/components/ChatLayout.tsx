'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
    Robot,
    SignOut,
    Plus,
    List,
    MagnifyingGlass,
    ChatCircleDots,
    Trash,
    PencilSimple,
    Check,
    X,
    Brain,
    Code,
    Eye,
    Heart,
    Globe,
    BookOpen,
    Sparkle,
} from '@phosphor-icons/react';

interface Conversation {
    _id: string;
    title: string;
    agent_type: string;
    updated_at: string;
    created_at: string;
}

interface ChatLayoutProps {
    children: ReactNode;
}

const MIN_WIDTH = 60;
const COLLAPSED_WIDTH = 64;
const DEFAULT_WIDTH = 280;
const MAX_WIDTH = 400;

const agentIcons: Record<string, { icon: React.ElementType; color: string }> = {
    teaching: { icon: BookOpen, color: 'text-purple-400' },
    coding: { icon: Code, color: 'text-green-400' },
    general: { icon: Brain, color: 'text-blue-400' },
    vision: { icon: Eye, color: 'text-amber-400' },
    wellness: { icon: Heart, color: 'text-pink-400' },
    multilingual: { icon: Globe, color: 'text-cyan-400' },
};

function getAgentInfo(agentType: string) {
    return agentIcons[agentType] || { icon: Sparkle, color: 'text-slate-400' };
}

function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatLayout({ children }: ChatLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const routerId = params.id as string | undefined;
    const [activeId, setActiveId] = useState<string | undefined>(routerId);

    // Sync state with router when it changes natively
    useEffect(() => {
        setActiveId(routerId);
    }, [routerId]);

    // Sidebar state
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Load saved width
    useEffect(() => {
        const savedWidth = localStorage.getItem('polyverse_sidebarWidth');
        const savedHidden = localStorage.getItem('polyverse_sidebarHidden');
        if (savedWidth) setSidebarWidth(parseInt(savedWidth));
        if (savedHidden === 'true') setIsHidden(true);
    }, []);

    // Save width
    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem('polyverse_sidebarWidth', sidebarWidth.toString());
            localStorage.setItem('polyverse_sidebarHidden', isHidden.toString());
        }
    }, [sidebarWidth, isHidden, isResizing]);

    // Mouse resize handlers
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            const newWidth = e.clientX;
            if (newWidth < MIN_WIDTH) {
                setIsHidden(true);
                setSidebarWidth(COLLAPSED_WIDTH);
            } else {
                setIsHidden(false);
                const clampedWidth = Math.min(MAX_WIDTH, Math.max(COLLAPSED_WIDTH, newWidth));
                setSidebarWidth(clampedWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    // Auth check
    useEffect(() => {
        async function checkAuth() {
            try {
                const userData = await api.getMe();
                setUser(userData);
            } catch {
                router.replace('/');
                return;
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, [router]);

    // Load conversations
    const loadConversations = useCallback(async () => {
        try {
            const result = await api.listConversations(1, 50);
            setConversations(result.conversations || []);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    }, []);

    useEffect(() => {
        if (user) loadConversations();
    }, [user, loadConversations]);

    useEffect(() => {
        if (user) loadConversations();
        
        const handleRefresh = (e: any) => {
            if (user) loadConversations();
            if (e.detail?.id) setActiveId(e.detail.id);
        };

        window.addEventListener('chat:refreshList', handleRefresh);
        return () => window.removeEventListener('chat:refreshList', handleRefresh);
    }, [pathname, user, loadConversations]);

    const handleLogout = () => {
        api.clearToken();
        router.push('/');
    };

    const handleNewChat = () => {
        setActiveId(undefined);
        window.dispatchEvent(new Event('chat:new'));
        router.push('/chat');
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.deleteConversation(id);
            setConversations(prev => prev.filter(c => c._id !== id));
            if (activeId === id) {
                router.push('/chat');
            }
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    const handleRenameStart = (conv: Conversation, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(conv._id);
        setEditTitle(conv.title);
    };

    const handleRenameSubmit = async (id: string) => {
        if (!editTitle.trim()) {
            setEditingId(null);
            return;
        }
        try {
            await api.updateConversation(id, editTitle.trim());
            setConversations(prev => prev.map(c =>
                c._id === id ? { ...c, title: editTitle.trim() } : c
            ));
        } catch (err) {
            console.error('Failed to rename conversation:', err);
        }
        setEditingId(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Robot size={48} className="text-blue-500 animate-pulse mx-auto" />
                    <div className="text-slate-500 font-mono text-sm animate-pulse">LOADING POLYVERSE AI...</div>
                </div>
            </div>
        );
    }

    const isCollapsed = sidebarWidth < 150;
    const showLabels = sidebarWidth >= 150 && !isHidden;
    const name = user?.name || 'User';
    const email = user?.email || '';

    const filteredConversations = conversations.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <div className="scanlines" />

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex flex-col z-50 transition-all ${isResizing ? 'transition-none' : 'duration-200'
                    } ${isHidden ? 'w-0 overflow-hidden border-0' : ''}`}
                style={{ width: isHidden ? 0 : sidebarWidth }}
            >
                {/* Header */}
                <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="relative flex-shrink-0">
                        <Robot size={28} weight="duotone" className="text-blue-400" />
                    </div>
                    {showLabels && (
                        <div className="overflow-hidden">
                            <h1 className="font-chivo font-bold text-sm uppercase tracking-wider whitespace-nowrap">
                                <span className="text-gradient">PolyVerse</span> AI
                            </h1>
                            <p className="text-xs text-slate-500 font-mono">Multi-Agent</p>
                        </div>
                    )}
                </div>

                {/* New Chat Button */}
                <div className="p-2">
                    <button
                        onClick={handleNewChat}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-sm transition-all duration-150 text-sm font-medium shadow-[0_0_10px_rgba(59,130,246,0.3)] ${isCollapsed ? 'justify-center' : ''}`}
                        title="New Chat"
                    >
                        <Plus size={18} weight="bold" className="flex-shrink-0" />
                        {showLabels && <span className="uppercase tracking-wide text-xs">New Chat</span>}
                    </button>
                </div>

                {/* Search */}
                {showLabels && (
                    <div className="px-2 pb-2">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search chats..."
                                className="w-full bg-slate-950 border border-slate-700/50 text-slate-300 rounded-sm text-xs pl-8 pr-3 py-2 outline-none focus:border-blue-500/50 placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                )}

                {/* Conversation List */}
                <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                    <ul className="space-y-0.5">
                        {filteredConversations.map((conv) => {
                            const isActive = activeId === conv._id;
                            const agentInfo = getAgentInfo(conv.agent_type);
                            const AgentIcon = agentInfo.icon;

                            return (
                                <li key={conv._id}>
                                    {editingId === conv._id ? (
                                        <div className="flex items-center gap-1 px-2 py-1.5">
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRenameSubmit(conv._id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                className="flex-1 bg-slate-950 border border-blue-500/50 text-slate-100 rounded-sm text-xs px-2 py-1.5 outline-none"
                                                autoFocus
                                            />
                                            <button onClick={() => handleRenameSubmit(conv._id)} className="p-1 text-green-400 hover:text-green-300">
                                                <Check size={14} />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-slate-300">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => router.push(`/chat/${conv._id}`)}
                                            className={`w-full cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-sm transition-all duration-150 text-sm group ${isCollapsed ? 'justify-center' : ''
                                                } ${isActive
                                                    ? 'text-blue-400 bg-blue-950/50 border-l-2 border-blue-400'
                                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                                }`}
                                            title={isCollapsed ? conv.title : undefined}
                                        >
                                            <AgentIcon size={16} weight="duotone" className={`flex-shrink-0 ${agentInfo.color}`} />
                                            {showLabels && (
                                                <div className="flex-1 min-w-0 text-left">
                                                    <p className="truncate text-xs font-medium">{conv.title}</p>
                                                    <p className="text-[10px] text-slate-600 font-mono">{formatTimeAgo(conv.updated_at)}</p>
                                                </div>
                                            )}
                                            {showLabels && (
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleRenameStart(conv, e)}
                                                        className="p-1 text-slate-500 hover:text-slate-300 rounded"
                                                        title="Rename"
                                                    >
                                                        <PencilSimple size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteConversation(conv._id, e)}
                                                        className="p-1 text-slate-500 hover:text-red-400 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}

                        {filteredConversations.length === 0 && showLabels && (
                            <div className="text-center py-8 px-2">
                                <ChatCircleDots size={32} className="text-slate-700 mx-auto mb-2" />
                                <p className="text-xs text-slate-600">
                                    {searchQuery ? 'No matching chats' : 'No conversations yet'}
                                </p>
                            </div>
                        )}
                    </ul>
                </nav>

                {/* User & Logout */}
                <div className="p-2 border-t border-slate-800 space-y-1">
                    {showLabels && (
                        <div className="px-3 py-2">
                            <p className="text-xs text-slate-500 truncate font-mono">{email}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? 'Sign Out' : undefined}
                    >
                        <SignOut size={20} className="flex-shrink-0" />
                        {showLabels && 'Sign Out'}
                    </button>
                </div>

                {/* Resize Handle */}
                <div
                    className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-50"
                    onMouseDown={startResizing}
                    style={{ transform: 'translateX(50%)' }}
                />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
                {/* Header */}
                <div className="backdrop-blur-md bg-slate-950/80 border-b border-slate-700 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-4">
                            {isHidden && (
                                <button
                                    onClick={() => { setIsHidden(false); setSidebarWidth(DEFAULT_WIDTH); }}
                                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                    title="Show Sidebar"
                                >
                                    <List size={24} />
                                </button>
                            )}
                            <div>
                                <h2 className="font-chivo font-bold text-lg uppercase tracking-wider">
                                    <span className="text-gradient">PolyVerse</span> AI
                                </h2>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">Welcome back, {name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Logged in as</p>
                                <p className="text-sm font-mono text-slate-300">{email}</p>
                            </div>
                            <div className="h-9 w-9 rounded-full flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-br from-blue-600 to-purple-800">
                                <span className="text-white font-bold text-sm">{name?.charAt(0).toUpperCase() || 'U'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </main>

            {/* Overlay when resizing */}
            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-ew-resize" />
            )}
        </div>
    );
}
