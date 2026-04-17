'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { X, Crop, MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowsClockwise, Check, Sparkle } from '@phosphor-icons/react';

interface ImageCropperProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
}

// Helper function to create a cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    // Set canvas size to desired output size
    const size = 300; // Output size 300x300
    canvas.width = size;
    canvas.height = size;

    // Draw the cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        size,
        size
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas is empty'));
                }
            },
            'image/jpeg',
            0.9
        );
    });
};

function ImageCropperContent({ image, onCropComplete, onCancel }: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = useCallback((location: Point) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropCompleteCallback = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;

        try {
            setIsProcessing(true);
            const croppedImage = await getCroppedImg(image, croppedAreaPixels);
            onCropComplete(croppedImage);
        } catch (error) {
            console.error('Error cropping image:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div
            className="fixed top-0 left-0 right-0 bottom-0 flex flex-col bg-slate-950"
            style={{
                zIndex: 99999,
                position: 'fixed',
                width: '100vw',
                height: '100vh'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/40 rounded-xl">
                        <Crop size={22} className="text-blue-400" weight="duotone" />
                    </div>
                    <div>
                        <h2 className="text-xl font-chivo font-bold text-white uppercase tracking-wider">Adjust Your Photo</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Drag to reposition, use sliders to zoom & rotate</p>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all hover:scale-105"
                    title="Cancel"
                >
                    <X size={22} className="text-slate-400" weight="bold" />
                </button>
            </div>

            {/* Cropper Area */}
            <div className="flex-1 relative bg-slate-900" style={{ minHeight: '300px' }}>
                <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={onCropChange}
                    onZoomChange={onZoomChange}
                    onCropComplete={onCropCompleteCallback}
                    style={{
                        containerStyle: {
                            backgroundColor: '#0f172a'
                        },
                        cropAreaStyle: {
                            border: '3px solid rgba(59, 130, 246, 0.7)',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)'
                        }
                    }}
                />
            </div>

            {/* Controls Panel */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-t border-slate-700/50 p-6 space-y-5 relative overflow-hidden">
                <Sparkle size={100} weight="duotone" className="absolute -right-6 -top-6 text-slate-800/30" />

                {/* Zoom Control */}
                <div className="relative z-10">
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-2">Zoom</label>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                        >
                            <MagnifyingGlassMinus size={20} className="text-blue-400" weight="duotone" />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                        >
                            <MagnifyingGlassPlus size={20} className="text-blue-400" weight="duotone" />
                        </button>
                        <span className="text-blue-400 text-sm font-mono font-bold w-14 text-right">{zoom.toFixed(1)}x</span>
                    </div>
                </div>

                {/* Rotation Control */}
                <div className="relative z-10">
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-2">Rotation</label>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setRotation((rotation - 90 + 360) % 360)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                            title="Rotate -90°"
                        >
                            <ArrowsClockwise size={20} className="text-purple-400 -scale-x-100" weight="duotone" />
                        </button>
                        <div className="flex-1">
                            <input
                                type="range"
                                min={0}
                                max={360}
                                step={1}
                                value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                        <button
                            onClick={() => setRotation((rotation + 90) % 360)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                            title="Rotate +90°"
                        >
                            <ArrowsClockwise size={20} className="text-purple-400" weight="duotone" />
                        </button>
                        <span className="text-purple-400 text-sm font-mono font-bold w-14 text-right">{rotation}°</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-2 relative z-10">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3.5 px-6 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/30"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Check size={20} weight="bold" />
                                Confirm & Upload
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Main component that uses portal to render at document.body level
export default function ImageCropper(props: ImageCropperProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    // Use createPortal to render the modal at the document.body level
    // This ensures it's above all other elements including the sidebar
    return createPortal(
        <ImageCropperContent {...props} />,
        document.body
    );
}
