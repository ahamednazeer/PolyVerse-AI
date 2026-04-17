'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, Lock, User } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Check if user is already authenticated on mount
    useEffect(() => {
        async function checkExistingAuth() {
            try {
                // Only check if there's a token in localStorage
                const token = api.getToken();
                if (!token) {
                    setCheckingAuth(false);
                    return;
                }

                // Validate the token by fetching user data
                const userData = await api.getMe();

                // If we get here, the token is valid - redirect to dashboard
                const roleRoutes: Record<string, string> = {
                    ADMIN: '/admin',
                    STUDENT: '/dashboard/student',
                    HOSTELLER: '/dashboard/student',
                    DAY_SCHOLAR: '/dashboard/student',
                    STAFF: '/dashboard/staff',
                    WARDEN: '/admin/hostel',
                };

                const route = roleRoutes[userData.role] || '/dashboard/student';
                router.replace(route);
            } catch {
                // Token is invalid or expired, clear it and show login
                api.clearToken();
                setCheckingAuth(false);
            }
        }
        checkExistingAuth();
    }, [router]);

    // Show loading state while checking authentication
    if (checkingAuth) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
                style={{
                    backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
                }}
            >
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                <div className="relative z-10 text-center space-y-4">
                    <GraduationCap size={48} className="text-blue-500 animate-pulse mx-auto" />
                    <div className="text-slate-500 font-mono text-sm animate-pulse">VERIFYING SESSION...</div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.login(username, password);
            // Redirect based on role
            const roleRoutes: Record<string, string> = {
                ADMIN: '/admin',
                STUDENT: '/dashboard/student',
                HOSTELLER: '/dashboard/student',
                DAY_SCHOLAR: '/dashboard/student',
                STAFF: '/dashboard/staff',
            };

            const route = roleRoutes[response.user.role] || '/dashboard/student';
            router.push(route);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
            style={{
                backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
            }}
        >
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div className="scanlines" />

            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-slate-900/90 border border-slate-700 rounded-sm p-8 backdrop-blur-md">
                    <div className="flex flex-col items-center mb-8">
                        <GraduationCap size={48} weight="duotone" className="text-blue-400 mb-4" />
                        <h1 className="text-3xl font-chivo font-bold uppercase tracking-wider text-center">
                            Institution Mangement System
                        </h1>
                        <p className="text-slate-400 text-sm mt-2">Learning & Engagement Platform</p>
                    </div>

                    {error && (
                        <div className="bg-red-950/50 border border-red-800 rounded-sm p-3 mb-4 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-sm placeholder:text-slate-600 font-mono text-sm pl-10 pr-3 py-2.5 border outline-none"
                                    placeholder="Enter username"
                                    data-testid="username-input"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-sm placeholder:text-slate-600 font-mono text-sm pl-10 pr-3 py-2.5 border outline-none"
                                    placeholder="••••••••"
                                    data-testid="password-input"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-sm font-medium tracking-wide uppercase text-sm px-4 py-3 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            data-testid="login-submit-btn"
                        >
                            {loading ? 'Authenticating...' : 'Access System'}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-slate-950/50 border border-slate-800 rounded-sm">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-mono">Demo Accounts:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                            <div>Admin: admin / admin123</div>
                            <div>Student: student1 / student123</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
