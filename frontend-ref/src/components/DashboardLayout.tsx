'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import {
    GraduationCap,
    SignOut,
    Gauge,
    Users,
    FileText,
    ChartLineUp,
    Fire,
    Question,
    ClipboardText,
    Books,
    Lock,
    Trophy,
    List,
    MapPin,
    Buildings,
    DoorOpen,
    Certificate,
    ChatCircle,
    Wrench
} from '@phosphor-icons/react';
import { AIAssistantProvider } from './AIAssistantContext';
import AIAssistant from './AIAssistant';
import { OfflineProvider } from './OfflineContext';
import OfflineBanner from './OfflineBanner';
import { WalkthroughProvider } from './WalkthroughContext';
import WalkthroughOverlay from './WalkthroughOverlay';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
}

interface DashboardLayoutProps {
    children: ReactNode;
    userRole?: string;
    userName?: string;
    userEmail?: string;
}

const MIN_WIDTH = 60;
const COLLAPSED_WIDTH = 64;
const DEFAULT_WIDTH = 64;  // Default to narrow/collapsed
const MAX_WIDTH = 320;

const menuItemsByRole: Record<string, MenuItem[]> = {
    ADMIN: [
        { icon: Gauge, label: 'Overview', path: '/admin' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        // { icon: FileText, label: 'PDFs', path: '/admin/pdfs' }, // COMMENTED OUT - PDF feature disabled
        { icon: Question, label: 'Quizzes', path: '/admin/quizzes' },
        { icon: Trophy, label: 'Quiz Results', path: '/admin/results' },
        // { icon: Fire, label: 'Streaks', path: '/admin/streaks' }, // COMMENTED OUT - Reading Streak feature disabled
        { icon: MapPin, label: 'Attendance', path: '/admin/attendance' },
        { icon: Buildings, label: 'Hostels', path: '/admin/hostels' },
        { icon: Certificate, label: 'Certificates', path: '/admin/certificates' },
        { icon: ClipboardText, label: 'Audit Logs', path: '/admin/audit' },
        { icon: Users, label: 'Faculty Locations', path: '/admin/faculty-locations' },
        { icon: ChatCircle, label: 'Queries', path: '/admin/queries' },
        { icon: Wrench, label: 'Complaints', path: '/admin/complaints' },
    ],
    WARDEN: [
        { icon: Gauge, label: 'Hostel Dashboard', path: '/admin/hostel' },
        { icon: ChatCircle, label: 'Queries', path: '/admin/warden-queries' },
        { icon: Wrench, label: 'Complaints', path: '/admin/warden-complaints' },
    ],
    STUDENT: [
        { icon: Gauge, label: 'Overview', path: '/dashboard/student' },
        // { icon: Books, label: 'My PDFs', path: '/dashboard/student/pdfs' }, // COMMENTED OUT - PDF feature disabled
        { icon: Question, label: 'Quizzes', path: '/dashboard/student/quizzes' },
        // { icon: Fire, label: 'My Streak', path: '/dashboard/student/streak' }, // COMMENTED OUT - Reading Streak feature disabled
        { icon: MapPin, label: 'Attendance', path: '/dashboard/student/attendance' },
        { icon: Users, label: 'Faculty Locator', path: '/dashboard/student/faculty' },
        { icon: ChatCircle, label: 'Queries', path: '/dashboard/student/queries' },
        { icon: Wrench, label: 'Complaints', path: '/dashboard/student/complaints' },
        { icon: Users, label: 'Profile', path: '/dashboard/student/profile' },
    ],
    HOSTELLER: [
        { icon: Gauge, label: 'Overview', path: '/dashboard/student' },
        // { icon: Books, label: 'My PDFs', path: '/dashboard/student/pdfs' }, // COMMENTED OUT - PDF feature disabled
        { icon: Question, label: 'Quizzes', path: '/dashboard/student/quizzes' },
        // { icon: Fire, label: 'My Streak', path: '/dashboard/student/streak' }, // COMMENTED OUT - Reading Streak feature disabled
        { icon: MapPin, label: 'Attendance', path: '/dashboard/student/attendance' },
        { icon: Buildings, label: 'Hostel', path: '/dashboard/student/hostel' },
        { icon: Users, label: 'Faculty Locator', path: '/dashboard/student/faculty' },
        { icon: ChatCircle, label: 'Queries', path: '/dashboard/student/queries' },
        { icon: Wrench, label: 'Complaints', path: '/dashboard/student/complaints' },
        { icon: Users, label: 'Profile', path: '/dashboard/student/profile' },
    ],
    DAY_SCHOLAR: [
        { icon: Gauge, label: 'Overview', path: '/dashboard/student' },
        // { icon: Books, label: 'My PDFs', path: '/dashboard/student/pdfs' }, // COMMENTED OUT - PDF feature disabled
        { icon: Question, label: 'Quizzes', path: '/dashboard/student/quizzes' },
        // { icon: Fire, label: 'My Streak', path: '/dashboard/student/streak' }, // COMMENTED OUT - Reading Streak feature disabled
        { icon: MapPin, label: 'Attendance', path: '/dashboard/student/attendance' },
        { icon: Users, label: 'Faculty Locator', path: '/dashboard/student/faculty' },
        { icon: Certificate, label: 'Certificates', path: '/dashboard/student/certificates' },
        { icon: ChatCircle, label: 'Queries', path: '/dashboard/student/queries' },
        { icon: Wrench, label: 'Complaints', path: '/dashboard/student/complaints' },
        { icon: Users, label: 'Profile', path: '/dashboard/student/profile' },
    ],
    STAFF: [
        { icon: Gauge, label: 'Overview', path: '/dashboard/staff' },
        { icon: MapPin, label: 'Availability', path: '/dashboard/staff/availability' },
        { icon: Books, label: 'Learning Hub', path: '/dashboard/staff/learning' },
        { icon: ChatCircle, label: 'Study Circles', path: '/dashboard/student/learning/circles' },
    ],
};

export default function DashboardLayout({
    children,
    userRole: propRole,
    userName: propName,
    userEmail: propEmail,
}: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<any>(null);
    const [profilePhoto, setProfilePhoto] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Load saved width from localStorage
    useEffect(() => {
        const savedWidth = localStorage.getItem('sidebarWidth');
        const savedHidden = localStorage.getItem('sidebarHidden');
        if (savedWidth) {
            setSidebarWidth(parseInt(savedWidth));
        }
        if (savedHidden === 'true') {
            setIsHidden(true);
        }
    }, []);

    // Save width to localStorage
    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem('sidebarWidth', sidebarWidth.toString());
            localStorage.setItem('sidebarHidden', isHidden.toString());
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

            // Snap to hidden if dragged very small
            if (newWidth < MIN_WIDTH) {
                setIsHidden(true);
                setSidebarWidth(COLLAPSED_WIDTH);
            } else {
                setIsHidden(false);
                // Clamp between min and max
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
        async function checkAuth() {
            if (propRole) {
                setUser({ role: propRole, first_name: propName, email: propEmail });
                setLoading(false);
                return;
            }

            try {
                const userData = await api.getMe();
                setUser(userData);

                // Fetch profile photo for students
                if (!pathname.startsWith('/admin')) {
                    try {
                        const photoData = await api.getProfilePhotoStatus();
                        if (photoData && photoData.status?.toLowerCase() === 'approved') {
                            setProfilePhoto(photoData);
                        }
                    } catch { }
                }

                // Allow WARDEN to access /admin/hostel, /admin/warden-queries, /admin/warden-complaints
                if (pathname.startsWith('/admin')) {
                    if (userData.role === 'WARDEN') {
                        // Wardens can only access specific /admin/ routes
                        const allowedWardenPaths = ['/admin/hostel', '/admin/warden-queries', '/admin/warden-complaints'];
                        const isAllowed = allowedWardenPaths.some(p => pathname.startsWith(p));
                        if (!isAllowed) {
                            router.replace('/admin/hostel');
                            return;
                        }
                    } else if (userData.role !== 'ADMIN') {
                        // Non-admin and non-warden go to student dashboard
                        router.replace('/dashboard/student');
                        return;
                    }
                }

                if (pathname.startsWith('/dashboard/student') && userData.role === 'ADMIN') {
                    router.replace('/admin');
                    return;
                }

                if (pathname.startsWith('/dashboard/student') && userData.role === 'WARDEN') {
                    router.replace('/admin/hostel');
                    return;
                }

            } catch (error) {
                console.error('Auth check failed', error);
                router.replace('/');
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, [pathname, propRole, propName, propEmail, router]);

    const handleLogout = () => {
        api.clearToken();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <GraduationCap size={48} className="text-blue-500 animate-pulse mx-auto" />
                    <div className="text-slate-500 font-mono text-sm animate-pulse">VERIFYING CREDENTIALS...</div>
                </div>
            </div>
        );
    }

    const role = propRole || user?.role || 'STUDENT';
    const studentCategory = user?.student_category;
    const name = propName || (user ? `${user.first_name} ${user.last_name || ''}` : 'User');
    const email = propEmail || user?.email || 'user@campus.edu';

    // Use student_category for students to show correct menu (HOSTELLER gets hostel link)
    let menuKey = role;
    if (role === 'STUDENT' && studentCategory) {
        menuKey = studentCategory; // Will be HOSTELLER or DAY_SCHOLAR
    }
    const menuItems = menuItemsByRole[menuKey] || menuItemsByRole.STUDENT;

    const isCollapsed = sidebarWidth < 150;
    const showLabels = sidebarWidth >= 150 && !isHidden;

    // Check if user is a student (can use AI Assistant)
    const isStudent = ['STUDENT', 'HOSTELLER', 'DAY_SCHOLAR'].includes(role);

    // Wrap content with AI provider for students
    const content = (
        <div className="min-h-screen bg-slate-950 flex">
            <div className="scanlines" />

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                data-walkthrough="sidebar"
                className={`print:hidden bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex flex-col z-50 transition-all ${isResizing ? 'transition-none' : 'duration-200'
                    } ${isHidden ? 'w-0 overflow-hidden border-0' : ''}`}
                style={{ width: isHidden ? 0 : sidebarWidth }}
            >
                {/* Header */}
                <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <GraduationCap size={28} weight="duotone" className="text-blue-400 flex-shrink-0" />
                    {showLabels && (
                        <div className="overflow-hidden">
                            <h1 className="font-chivo font-bold text-sm uppercase tracking-wider whitespace-nowrap">Institution Mangement System</h1>
                            <p className="text-xs text-slate-500 font-mono">{role.replace('_', ' ')}</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            return (
                                <li key={item.path}>
                                    <button
                                        onClick={() => router.push(item.path)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''
                                            } ${isActive
                                                ? 'text-blue-400 bg-blue-950/50 border-l-2 border-blue-400'
                                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                            }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon size={20} weight="duotone" className="flex-shrink-0" />
                                        {showLabels && <span className="truncate">{item.label}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Logout */}
                <div className="p-2 border-t border-slate-800">
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
            <main className="flex-1 overflow-auto relative z-10">
                {/* Header */}
                <div data-walkthrough="header" className="print:hidden backdrop-blur-md bg-slate-950/80 border-b border-slate-700 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            {/* Show toggle button when sidebar is hidden */}
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
                                <h2 className="font-chivo font-bold text-xl uppercase tracking-wider">Dashboard</h2>
                                <p className="text-xs text-slate-400 font-mono mt-1">Welcome back, {name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-mono">Logged in as</p>
                                <p className="text-sm font-mono text-slate-300">{email}</p>
                            </div>
                            <button
                                onClick={() => router.push('/dashboard/student/profile')}
                                className="h-9 w-9 rounded-full flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-lg overflow-hidden"
                                title="View Profile"
                            >
                                {profilePhoto?.filename ? (
                                    <img
                                        src={`http://localhost:8000/static/profile_photos/${profilePhoto.filename}`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">
                                        {name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>

            {/* AI Assistant - Only for students */}
            {isStudent && <AIAssistant />}

            {/* Walkthrough Overlay - Only for students */}
            {isStudent && <WalkthroughOverlay />}

            {/* Offline Banner - Only for students */}
            {isStudent && <OfflineBanner />}

            {/* Overlay when resizing to prevent iframe capturing mouse */}
            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-ew-resize" />
            )}
        </div>
    );

    // Wrap with AI provider, Offline provider, and Walkthrough provider for students
    if (isStudent) {
        return (
            <WalkthroughProvider>
                <AIAssistantProvider>
                    <OfflineProvider userRole={role}>
                        {content}
                    </OfflineProvider>
                </AIAssistantProvider>
            </WalkthroughProvider>
        );
    }

    return content;
}
