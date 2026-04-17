import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

interface JitsiEmbedProps {
    roomName: string;
    displayName: string;
    email?: string;
    userId: string;
    onLeave?: () => void;
}

export default function JitsiEmbed({ roomName, displayName, email, userId, onLeave }: JitsiEmbedProps) {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const jitsiApiRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load Jitsi script
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

        const initJitsi = async () => {
            try {
                await loadJitsiScript();

                if (!jitsiContainerRef.current) return;

                // Extract room name if full URL was passed
                // Handle cases where roomName might be "https://8x8.vc/vpaas.../RoomName"
                let cleanRoomName = roomName;
                if (roomName.includes('https://')) {
                    const url = new URL(roomName);
                    cleanRoomName = url.pathname.substring(1); // Remove leading slash
                }

                // Ensure magic cookie prefix is present (Fix for legacy URLs)
                const MAGIC_COOKIE = 'vpaas-magic-cookie-68b8aa6f9d0f4538953b86d65c058184';
                if (!cleanRoomName.startsWith(MAGIC_COOKIE)) {
                    // Check if it's a legacy "SC-" name and prepend cookie
                    cleanRoomName = `${MAGIC_COOKIE}/${cleanRoomName}`;
                }

                const options = {
                    roomName: cleanRoomName,
                    width: '100%',
                    height: '100%',
                    parentNode: jitsiContainerRef.current,
                    userInfo: {
                        id: userId,
                        displayName: displayName,
                        email: email,
                    },
                    configOverwrite: {
                        prejoinPageEnabled: false,
                        prejoinConfig: {
                            enabled: false,
                        },
                        startWithAudioMuted: true,
                        startWithVideoMuted: true,
                        startAudioOnly: true, // Force audio-only mode
                        disableModeratorIndicator: true,
                        enableWelcomePage: false,
                        enableClosePage: false,
                        // Skip lobby completely if possible for guests
                        lobby: {
                            autoKnock: true,
                            enableChat: false,
                        },
                        disableDeepLinking: true,
                        hideConferenceSubject: false,
                        hideConferenceTimer: false,
                        disableLocalVideoFlip: true,
                        toolbarButtons: [
                            'microphone', 'fodeviceselection', 'hangup',
                            'chat', 'raisehand', 'participants-pane',
                        ],
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_WATERMARK_FOR_GUESTS: false,
                        SHOW_BRAND_WATERMARK: false,
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                        HIDE_INVITE_MORE_HEADER: true,
                        TOOLBAR_BUTTONS: [
                            'microphone', 'hangup', 'chat', 'raisehand',
                        ],
                    },
                };

                // Cleanup previous instance if any
                if (jitsiApiRef.current) {
                    jitsiApiRef.current.dispose();
                }

                const domain = '8x8.vc';
                jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);

                jitsiApiRef.current.addEventListeners({
                    readyToClose: () => {
                        onLeave?.();
                    },
                    videoConferenceLeft: () => {
                        onLeave?.();
                    },
                });

                setLoading(false);
            } catch (error) {
                console.error('Failed to load Jitsi:', error);
                setLoading(false);
            }
        };

        initJitsi();

        return () => {
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
        };
    }, [roomName, displayName, email, userId, onLeave]);

    return (
        <div className="w-full h-full relative bg-slate-950">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
            )}
            <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>
    );
}
