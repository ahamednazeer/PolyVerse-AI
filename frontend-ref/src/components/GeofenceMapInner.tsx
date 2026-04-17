'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with webpack
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface GeofenceMapInnerProps {
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

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// Component to recenter map when center changes
function MapRecenter({ center }: { center: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        if (center[0] !== 0 && center[1] !== 0) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);

    return null;
}

export default function GeofenceMapInner({
    center,
    radius,
    onLocationSelect,
    existingGeofences = []
}: GeofenceMapInnerProps) {
    // Default to a location in India if no center is provided
    const defaultCenter: [number, number] = center[0] !== 0 ? center : [13.0827, 80.2707]; // Chennai

    return (
        <div className="space-y-4">
            <div className="relative">
                <MapContainer
                    center={defaultCenter}
                    zoom={16}
                    style={{ height: '400px', width: '100%' }}
                    className="rounded-lg z-10"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapClickHandler onLocationSelect={onLocationSelect} />
                    <MapRecenter center={center} />

                    {/* Current selection marker and radius */}
                    {center[0] !== 0 && center[1] !== 0 && (
                        <>
                            <Marker position={center} />
                            <Circle
                                center={center}
                                radius={radius}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.2,
                                    weight: 2
                                }}
                            />
                        </>
                    )}

                    {/* Existing geofences */}
                    {existingGeofences.map((geofence) => (
                        <Circle
                            key={geofence.id}
                            center={[geofence.latitude, geofence.longitude]}
                            radius={geofence.radius_meters}
                            pathOptions={{
                                color: geofence.is_primary ? '#10b981' : '#6b7280',
                                fillColor: geofence.is_primary ? '#10b981' : '#6b7280',
                                fillOpacity: 0.1,
                                weight: 1,
                                dashArray: '5, 5'
                            }}
                        />
                    ))}
                </MapContainer>

                {/* Instructions overlay */}
                <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg z-[1000] text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                        Click on the map to set geofence center
                    </p>
                </div>
            </div>

            {/* Coordinates display */}
            {center[0] !== 0 && center[1] !== 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Selected Location:</strong> {center[0].toFixed(6)}, {center[1].toFixed(6)}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        <strong>Radius:</strong> {radius} meters
                    </p>
                </div>
            )}
        </div>
    );
}
