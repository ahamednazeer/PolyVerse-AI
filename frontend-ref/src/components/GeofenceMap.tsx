'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Define types for the map component props
interface GeofenceMapProps {
    center: [number, number];
    radius: number;
    onLocationSelect: (lat: number, lng: number) => void;
    onRadiusChange?: (radius: number) => void;
    existingGeofences?: Array<{
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        radius_meters: number;
        is_primary: boolean;
    }>;
}

// We need to dynamically import the map component to avoid SSR issues with Leaflet
const GeofenceMapInner = dynamic(
    () => import('./GeofenceMapInner'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[400px] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
            </div>
        )
    }
);

export default function GeofenceMap(props: GeofenceMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="w-full h-[400px] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Loading map...</p>
            </div>
        );
    }

    return <GeofenceMapInner {...props} />;
}
