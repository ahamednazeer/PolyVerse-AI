'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Users, Clock, Video, PenTool, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

interface DoubtSession {
    id: number;
    title: string;
    description?: string;
    status: string;
    scheduled_at: string;
    duration_minutes: number;
}

export default function StudentSessionRoomPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = parseInt(params.id as string);
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const jitsiApiRef = useRef<any>(null);
    const [mounted, setMounted] = useState(false);
    const jitsiInitialized = useRef(false);

    const [session, setSession] = useState<DoubtSession | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participantCount, setParticipantCount] = useState(1);
    const [showWhiteboard, setShowWhiteboard] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData();

        return () => {
            // Clean up Jitsi on unmount
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
            jitsiInitialized.current = false;
        };
    }, [sessionId]);

    const loadData = async () => {
        try {
            const [sessionData, userData] = await Promise.all([
                api.getDoubtSession(sessionId),
                api.getMe(),
            ]);
            setSession(sessionData);
            setUser(userData);
            setLoading(false);

            if (sessionData.status !== 'LIVE') {
                alert('This session is not live yet.');
                router.push('/dashboard/student/learning');
                return;
            }

            setTimeout(() => initJitsi(sessionData, userData), 100);
        } catch (error) {
            console.error('Error loading session:', error);
            setLoading(false);
        }
    };

    const initJitsi = (sessionData: DoubtSession, userData: any) => {
        // Prevent duplicate initialization
        if (jitsiInitialized.current || jitsiApiRef.current) {
            console.log('Jitsi already initialized, skipping...');
            return;
        }
        if (!jitsiContainerRef.current) return;

        jitsiInitialized.current = true;

        const loadJitsiScript = () => {
            return new Promise<void>((resolve, reject) => {
                if (window.JitsiMeetExternalAPI) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://8x8.vc/external_api.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = reject;
                document.body.appendChild(script);
            });
        };

        loadJitsiScript().then(() => {
            const domain = '8x8.vc';
            const roomName = `vpaas-magic-cookie-68b8aa6f9d0f4538953b86d65c058184/SmartCampusDoubt${sessionId}`;

            const options = {
                roomName: roomName,
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                userInfo: {
                    id: `student-${userData.id}`,
                    displayName: `${userData.first_name} ${userData.last_name}`,
                    email: userData.email,
                },
                configOverwrite: {
                    prejoinPageEnabled: false,
                    prejoinConfig: {
                        enabled: false,
                    },
                    startWithAudioMuted: true,
                    startWithVideoMuted: true,
                    disableModeratorIndicator: true,
                    enableWelcomePage: false,
                    enableClosePage: false,
                    // Skip lobby completely
                    lobby: {
                        autoKnock: true,
                        enableChat: false,
                    },
                    // Disable pre-join video preview
                    disableDeepLinking: true,
                    hideConferenceSubject: false,
                    hideConferenceTimer: false,
                    disableLocalVideoFlip: true,
                    whiteboard: {
                        enabled: true,
                        collabServerBaseUrl: 'https://excalidraw-backend.jitsi.net',
                    },
                    toolbarButtons: [
                        'microphone', 'camera', 'desktop', 'fullscreen',
                        'fodeviceselection', 'hangup', 'chat', 'raisehand',
                        'videoquality', 'tileview', 'participants-pane', 'whiteboard',
                    ],
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    SHOW_BRAND_WATERMARK: false,
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                    HIDE_INVITE_MORE_HEADER: true,
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'desktop', 'fullscreen',
                        'hangup', 'chat', 'raisehand', 'tileview', 'whiteboard',
                    ],
                },
            };

            jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);

            jitsiApiRef.current.addListener('participantJoined', () => {
                setParticipantCount(prev => prev + 1);
            });

            jitsiApiRef.current.addListener('participantLeft', () => {
                setParticipantCount(prev => Math.max(1, prev - 1));
            });

            jitsiApiRef.current.addListener('videoConferenceLeft', () => {
                router.push('/dashboard/student/learning');
            });

            jitsiApiRef.current.addListener('readyToClose', () => {
                router.push('/dashboard/student/learning');
            });
        }).catch(err => {
            console.error('Failed to load Jitsi:', err);
        });
    };

    const handleExit = () => {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.dispose();
        }
        router.push('/dashboard/student/learning');
    };

    const roomContent = (
        <div
            className="fixed inset-0 flex flex-col bg-gray-900 overflow-hidden"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99999,
                width: '100vw',
                height: '100vh'
            }}
        >
            {/* Header Bar */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0 h-14">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExit}
                        className="text-gray-400 hover:text-white flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Exit
                    </button>
                    <div className="h-6 w-px bg-gray-700" />
                    <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-green-400" />
                        <span className="font-medium text-white truncate max-w-[200px]">{session?.title}</span>
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full animate-pulse whitespace-nowrap">
                            LIVE
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-gray-400 text-sm">
                    <button
                        onClick={() => setShowWhiteboard(!showWhiteboard)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${showWhiteboard ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        <PenTool className="w-4 h-4" />
                        Whiteboard
                    </button>
                    <div className="flex items-center gap-2 hidden sm:flex">
                        <Users className="w-4 h-4" />
                        <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 hidden sm:flex">
                        <Clock className="w-4 h-4" />
                        <span>{session?.duration_minutes} min</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative w-full flex" style={{ height: 'calc(100vh - 56px)' }}>
                {/* Jitsi Container */}
                <div className={`relative bg-black transition-all duration-300 ${showWhiteboard ? 'w-1/2' : 'w-full'}`}>
                    <div ref={jitsiContainerRef} className="absolute inset-0" />
                </div>

                {/* Whiteboard Panel */}
                {showWhiteboard && (
                    <div className="w-1/2 relative bg-white border-l border-gray-700">
                        <button
                            onClick={() => setShowWhiteboard(false)}
                            className="absolute top-2 right-2 z-10 p-1 bg-gray-800 text-white rounded-full hover:bg-gray-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <iframe
                            src={`https://excalidraw.com/#room=SmartCampus${sessionId},SmartCampusKey${String(sessionId).padStart(8, '0')}`}
                            className="w-full h-full border-0"
                            title="Whiteboard"
                            allow="clipboard-read; clipboard-write"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading session...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Session not found</p>
                    <button onClick={handleExit} className="text-blue-400 hover:underline">
                        Back to Learning Hub
                    </button>
                </div>
            </div>
        );
    }

    // Use portal to render outside the dashboard layout
    if (mounted && typeof document !== 'undefined') {
        return createPortal(roomContent, document.body);
    }

    return null;
}
