'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useChatStore, Conversation } from '@/store/useChatStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Robot,
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
    CaretRight,
    ClockCounterClockwise,
    UserCircle,
    Gear,
    Lifebuoy,
    Sparkle as SparkleIcon,
    FloppyDisk,
} from '@phosphor-icons/react';



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

function TypewriterTitle({ title }: { title: string }) {
    const [displayedText, setDisplayedText] = useState(title);
    const prevTitleRef = useRef(title);

    useEffect(() => {
        if (title !== prevTitleRef.current) {
            prevTitleRef.current = title;
            let i = 0;
            setDisplayedText('');
            const interval = setInterval(() => {
                setDisplayedText(title.slice(0, i + 1));
                i++;
                if (i >= title.length) clearInterval(interval);
            }, 40);
            return () => clearInterval(interval);
        } else if (title === displayedText && prevTitleRef.current === title) {
             // Initial load, do not animate.
        }
    }, [title]);

    return <p className="truncate text-[13px] font-normal text-[#ececec]">{displayedText}</p>;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [menuMessage, setMenuMessage] = useState('');
    const [preferencesDraft, setPreferencesDraft] = useState({
        preferred_language: 'en',
        academic_level: '',
        course: '',
        syllabus_topics: '',
        learning_goals: '',
        response_style: 'balanced',
    });
    const [savingPreferences, setSavingPreferences] = useState(false);
    
    const { conversations, fetchConversations, deleteConversation, renameConversation } = useChatStore();

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
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!profileMenuRef.current) return;
            if (!profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auth check
    useEffect(() => {
        async function checkAuth() {
            try {
                const userData = await api.getMe();
                setUser(userData);
                setPreferencesDraft({
                    preferred_language: userData.preferences?.preferred_language || userData.language || 'en',
                    academic_level: userData.preferences?.academic_level || '',
                    course: userData.preferences?.course || '',
                    syllabus_topics: (userData.preferences?.syllabus_topics || []).join(', '),
                    learning_goals: (userData.preferences?.learning_goals || []).join(', '),
                    response_style: userData.preferences?.response_style || 'balanced',
                });
            } catch {
                router.replace('/');
                return;
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, [router]);

    useEffect(() => {
        if (user) fetchConversations();
    }, [user, fetchConversations]);

    const handleLogout = async () => {
        try {
            await api.logout();
        } catch (e) {
            console.error("Logout failed", e);
        }
        router.push('/');
    };

    const handleSavePreferences = async () => {
        setSavingPreferences(true);
        try {
            const updated = await api.updatePreferences({
                preferred_language: preferencesDraft.preferred_language,
                academic_level: preferencesDraft.academic_level,
                course: preferencesDraft.course,
                syllabus_topics: preferencesDraft.syllabus_topics.split(',').map((item) => item.trim()).filter(Boolean),
                learning_goals: preferencesDraft.learning_goals.split(',').map((item) => item.trim()).filter(Boolean),
                response_style: preferencesDraft.response_style,
            });
            setUser(updated);
            setMenuMessage('Personalization saved.');
            setIsPreferencesOpen(false);
            setIsProfileMenuOpen(false);
        } catch (error) {
            console.error('Failed to save preferences:', error);
            setMenuMessage('Failed to save personalization.');
        } finally {
            setSavingPreferences(false);
        }
    };

    const handleNewChat = () => {
        setActiveId(undefined);
        window.dispatchEvent(new Event('chat:new'));
        router.push('/chat');
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteConversation(id);
        if (activeId === id) {
            router.push('/chat');
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
        await renameConversation(id, editTitle);
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
        <div className="flex h-screen overflow-hidden bg-[#212121]">
            <div className="scanlines" />

            {/* Sidebar */}
            <motion.aside
                ref={sidebarRef}
                className={`bg-[#171717] h-screen sticky top-0 flex flex-col z-50 ${isHidden ? '' : ''}`}
                animate={{ width: isHidden ? 0 : sidebarWidth }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ overflow: isHidden ? 'hidden' : 'visible' }}
            >
                {/* Header */}
                <div className={`p-4 flex items-center justify-between`}>
                    <div className={`flex items-center text-slate-300 ${isCollapsed ? 'mx-auto' : ''}`}>
                        <Robot size={24} className="flex-shrink-0" />
                    </div>
                    {showLabels && (
                        <button onClick={() => setIsHidden(true)} className="p-1.5 hover:bg-[#212121] rounded-md text-slate-400 hover:text-slate-200 transition-colors">
                            <List size={20} />
                        </button>
                    )}
                </div>
                {/* New Chat Button */}
                <div className="px-3 py-2">
                    <button
                        onClick={handleNewChat}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-slate-200 rounded-[12px] transition-all duration-150 text-sm ${isCollapsed ? 'justify-center' : ''}`}
                        title="New Chat"
                    >
                        <PencilSimple size={18} className="flex-shrink-0" />
                        {showLabels && <span className="font-medium truncate text-[13px]">New chat</span>}
                    </button>
                </div>

                {/* Search & Main Links */}
                {showLabels && (
                    <div className="px-3 pb-4">
                        <div className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:bg-[#212121] rounded-lg cursor-pointer transition-colors text-sm">
                            <MagnifyingGlass size={18} className="text-slate-400 flex-shrink-0" />
                            <span className="text-[13px]">Search chats</span>
                        </div>
                    </div>
                )}

                {/* Conversation List */}
                <nav className="flex-1 px-3 mt-4 overflow-y-auto overflow-x-hidden">
                    {showLabels && filteredConversations.length > 0 && (
                        <h2 className="px-3 py-2 text-xs font-medium text-slate-400 mb-1">Recents</h2>
                    )}
                    <ul className="space-y-0.5">
                        <AnimatePresence>
                            {filteredConversations.map((conv, index) => {
                                const isActive = activeId === conv._id;

                                return (
                                    <motion.li 
                                        key={conv._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0, transition: { duration: 0.2, delay: index * 0.05 } }}
                                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                        layout
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="relative"
                                    >
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
                                                    className="flex-1 bg-[#212121] text-white rounded-md text-sm px-2 py-1.5 outline-none"
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
                                                className={`w-full cursor-pointer flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 group ${isCollapsed ? 'justify-center' : ''
                                                    } ${isActive
                                                        ? 'bg-[#212121] text-slate-100'
                                                        : 'text-slate-300 hover:bg-[#212121]'
                                                    }`}
                                                title={isCollapsed ? conv.title : undefined}
                                            >
                                                {showLabels && (
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <TypewriterTitle title={conv.title} />
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
                                    </motion.li>
                                );
                            })}
                        </AnimatePresence>

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

                {/* User Profile */}
                <div className="relative p-3" ref={profileMenuRef}>
                    <button
                        onClick={() => showLabels && setIsProfileMenuOpen((prev) => !prev)}
                        className={`w-full rounded-2xl text-left transition-colors ${showLabels ? 'flex items-center gap-3 bg-[#202020] px-3 py-3 hover:bg-[#262626]' : 'flex items-center justify-center p-2 hover:bg-[#212121] rounded-lg'}`}
                    >
                        <div className="h-10 w-10 shrink-0 rounded-full bg-teal-500 flex items-center justify-center text-white text-[12px] font-semibold">
                            {name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        {showLabels && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium text-[#f1f1f1]">{name || 'User'}</p>
                                    <p className="truncate text-[11px] text-[#9fb0d0]">{user?.preferences?.course || email || 'User'}</p>
                            </div>
                        )}
                    </button>

                    {showLabels && isProfileMenuOpen && (
                        <div className="absolute bottom-[calc(100%+12px)] left-3 right-3 rounded-[24px] border border-white/10 bg-[#2d2d2d] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                            <div className="flex items-center gap-3 pb-4">
                                <div className="h-11 w-11 shrink-0 rounded-full bg-teal-500 flex items-center justify-center text-white text-[12px] font-semibold">
                                    {name?.substring(0, 2).toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-white">{name || 'User'}</p>
                                    <p className="truncate text-[11px] text-[#c5d2ee]">{user?.preferences?.course || email || 'User'}</p>
                                </div>
                                <button
                                    onClick={() => setIsProfileMenuOpen(false)}
                                    className="rounded-lg p-1 text-slate-200 hover:bg-white/10"
                                    title="Close menu"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="my-1 h-px bg-white/12" />

                            <div className="py-2 space-y-1">
                                <button
                                    onClick={() => {
                                        setMenuMessage('');
                                        setIsPreferencesOpen(true);
                                        setIsProfileMenuOpen(false);
                                    }}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white transition-colors hover:bg-white/6"
                                >
                                    <ClockCounterClockwise size={20} />
                                    <span className="text-[13px]">Personalization</span>
                                </button>
                                <button
                                    onClick={() => setMenuMessage(`${name || 'User'} • ${email || 'No email'}`)}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white transition-colors hover:bg-white/6"
                                >
                                    <UserCircle size={20} />
                                    <span className="text-[13px]">Profile</span>
                                </button>
                            </div>

                            <div className="my-1 h-px bg-white/12" />

                            {menuMessage && (
                                <div className="rounded-xl bg-white/5 px-3 py-2 text-[12px] text-slate-300">
                                    {menuMessage}
                                </div>
                            )}

                            <div className="py-2 space-y-1">
                                <button
                                    onClick={() => setMenuMessage('Use Personalization to set language, course, syllabus topics, and learning goals.')}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-white transition-colors hover:bg-white/6"
                                >
                                    <span className="flex items-center gap-3">
                                        <Lifebuoy size={20} />
                                        <span className="text-[13px]">Help</span>
                                    </span>
                                    <CaretRight size={18} className="text-slate-300" />
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white hover:bg-white/6 transition-colors"
                                >
                                    <ChatCircleDots size={20} />
                                    <span className="text-[13px]">Log out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Resize Handle */}
                <div
                    className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-50"
                    onMouseDown={startResizing}
                    style={{ transform: 'translateX(50%)' }}
                />
            </motion.aside>

            {/* Main Content */}
            <main className="relative z-10 flex h-screen min-h-0 flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-[#212121] sticky top-0 z-40">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-4">
                            {isHidden && (
                                <button
                                    onClick={() => { setIsHidden(false); setSidebarWidth(DEFAULT_WIDTH); }}
                                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#2f2f2f] rounded-md transition-colors"
                                    title="Show Sidebar"
                                >
                                    <List size={20} />
                                </button>
                            )}
                            <button className="flex items-center gap-2 text-[#ececec] hover:text-white transition-colors">
                                <span className="font-semibold text-lg tracking-tight">PolyVerse</span>
                                <span className="text-[10px] opacity-70">∨</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {children}
                </div>
            </main>

            {/* Overlay when resizing */}
            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-ew-resize" />
            )}

            {isPreferencesOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#2d2d2d] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Personalization</h2>
                                <p className="mt-1 text-sm text-slate-300">Set your course, syllabus topics, and goals here.</p>
                            </div>
                            <button
                                onClick={() => setIsPreferencesOpen(false)}
                                className="rounded-lg p-1 text-slate-200 hover:bg-white/10"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-300">Preferred language</label>
                                <select
                                    value={preferencesDraft.preferred_language}
                                    onChange={(e) => setPreferencesDraft((prev) => ({ ...prev, preferred_language: e.target.value }))}
                                    className="w-full rounded-xl bg-[#232323] px-3 py-2 text-[13px] outline-none"
                                >
                                    <option value="ta">Tamil</option>
                                    <option value="ur">Urdu</option>
                                    <option value="en">English</option>
                                    <option value="hi">Hindi</option>
                                    <option value="te">Telugu</option>
                                    <option value="ml">Malayalam</option>
                                    <option value="kn">Kannada</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-300">Academic level</label>
                                <input
                                    value={preferencesDraft.academic_level}
                                    onChange={(e) => setPreferencesDraft((prev) => ({ ...prev, academic_level: e.target.value }))}
                                    className="w-full rounded-xl bg-[#232323] px-3 py-2 text-[13px] outline-none"
                                    placeholder="1st year, graduate, intermediate"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-300">Course</label>
                                <input
                                    value={preferencesDraft.course}
                                    onChange={(e) => setPreferencesDraft((prev) => ({ ...prev, course: e.target.value }))}
                                    className="w-full rounded-xl bg-[#232323] px-3 py-2 text-[13px] outline-none"
                                    placeholder="B.Tech CSE, Physics, DSA"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-300">Syllabus topics</label>
                                <input
                                    value={preferencesDraft.syllabus_topics}
                                    onChange={(e) => setPreferencesDraft((prev) => ({ ...prev, syllabus_topics: e.target.value }))}
                                    className="w-full rounded-xl bg-[#232323] px-3 py-2 text-[13px] outline-none"
                                    placeholder="arrays, recursion, DBMS"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-300">Learning goals</label>
                                <input
                                    value={preferencesDraft.learning_goals}
                                    onChange={(e) => setPreferencesDraft((prev) => ({ ...prev, learning_goals: e.target.value }))}
                                    className="w-full rounded-xl bg-[#232323] px-3 py-2 text-[13px] outline-none"
                                    placeholder="exam prep, interview prep"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-300">Response style</label>
                                <select
                                    value={preferencesDraft.response_style}
                                    onChange={(e) => setPreferencesDraft((prev) => ({ ...prev, response_style: e.target.value }))}
                                    className="w-full rounded-xl bg-[#232323] px-3 py-2 text-[13px] outline-none"
                                >
                                    <option value="balanced">Balanced</option>
                                    <option value="concise">Concise</option>
                                    <option value="detailed">Detailed</option>
                                    <option value="exam-focused">Exam-focused</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setIsPreferencesOpen(false)}
                                className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePreferences}
                                disabled={savingPreferences}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                            >
                                <FloppyDisk size={16} />
                                <span>{savingPreferences ? 'Saving...' : 'Save personalization'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
