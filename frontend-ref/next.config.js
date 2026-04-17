// @ts-check
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development', // Disable PWA in development
    fallbacks: {
        document: '/offline',
        image: '/icons/icon-192x192.png',
        font: '',
        audio: '',
        video: '',
    },
    runtimeCaching: [
        // Handle navigation requests - show offline page on failure
        {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
                cacheName: 'pages',
                networkTimeoutSeconds: 10,
            }
        },
        // API cache
        {
            urlPattern: /^https?:\/\/localhost:8000\/.*$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'api-cache',
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 // 1 hour
                },
                networkTimeoutSeconds: 10,
            }
        },
        // Images
        {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'image-cache',
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
            }
        },
        // Static assets
        {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-resources',
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 // 1 day
                }
            }
        }
    ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Empty turbopack config to silence the webpack warning in dev mode
    turbopack: {},
    output: 'standalone',
};

export default withPWA(nextConfig);
