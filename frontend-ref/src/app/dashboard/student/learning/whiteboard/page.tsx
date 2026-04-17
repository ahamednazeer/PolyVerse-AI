'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
    ArrowLeft, Save, Users, Mic, MicOff, Palette, Trash2,
    Square, Circle, Minus, Type, Download, Undo, Redo, MousePointer
} from 'lucide-react';
import Link from 'next/link';

// fabric.js is loaded dynamically to avoid SSR issues
let fabric: any = null;

interface WhiteboardSession {
    id: number;
    title: string;
    description?: string;
    topic?: string;
    status: string;
    voice_room_url?: string;
    canvas_data?: any;
}

interface Participant {
    id: number;
    user_id: number;
    permission: string;
    draw_color?: string;
}

type Tool = 'select' | 'pencil' | 'line' | 'rect' | 'circle' | 'text' | 'eraser';

const COLORS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
    '#000000', '#6B7280', '#FFFFFF'
];

export default function WhiteboardPage() {
    const [sessions, setSessions] = useState<WhiteboardSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<WhiteboardSession | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [tool, setTool] = useState<Tool>('pencil');
    const [color, setColor] = useState('#3B82F6');
    const [brushSize, setBrushSize] = useState(3);
    const [canDraw, setCanDraw] = useState(true);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSessions();
        // Load fabric.js dynamically
        import('fabric').then((module) => {
            fabric = module;
        });
    }, []);

    useEffect(() => {
        if (selectedSession && fabric && canvasRef.current && !fabricRef.current) {
            initCanvas();
        }
    }, [selectedSession, fabric]);

    useEffect(() => {
        if (fabricRef.current) {
            updateTool();
        }
    }, [tool, color, brushSize]);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const data = await api.getActiveWhiteboards();
            setSessions(data);
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const initCanvas = () => {
        if (!canvasRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: container.clientWidth,
            height: container.clientHeight - 100,
            backgroundColor: '#FFFFFF',
            isDrawingMode: true,
        });

        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = color;

        // Load existing canvas data
        if (selectedSession?.canvas_data) {
            canvas.loadFromJSON(selectedSession.canvas_data, () => {
                canvas.renderAll();
            });
        }

        fabricRef.current = canvas;

        // Handle window resize
        const handleResize = () => {
            canvas.setWidth(container.clientWidth);
            canvas.setHeight(container.clientHeight - 100);
            canvas.renderAll();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.dispose();
        };
    };

    const updateTool = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.isDrawingMode = tool === 'pencil' || tool === 'eraser';

        if (tool === 'pencil') {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = brushSize;
            canvas.freeDrawingBrush.color = color;
        } else if (tool === 'eraser') {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = brushSize * 5;
            canvas.freeDrawingBrush.color = '#FFFFFF';
        } else if (tool === 'select') {
            canvas.isDrawingMode = false;
        }
    };

    const addShape = (type: 'rect' | 'circle' | 'line' | 'text') => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        let shape;
        const center = { left: canvas.width / 2, top: canvas.height / 2 };

        switch (type) {
            case 'rect':
                shape = new fabric.Rect({
                    ...center,
                    width: 100,
                    height: 80,
                    fill: 'transparent',
                    stroke: color,
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center',
                });
                break;
            case 'circle':
                shape = new fabric.Circle({
                    ...center,
                    radius: 50,
                    fill: 'transparent',
                    stroke: color,
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center',
                });
                break;
            case 'line':
                shape = new fabric.Line([center.left - 50, center.top, center.left + 50, center.top], {
                    stroke: color,
                    strokeWidth: 2,
                });
                break;
            case 'text':
                shape = new fabric.IText('Double-click to edit', {
                    ...center,
                    fontSize: 20,
                    fill: color,
                    originX: 'center',
                    originY: 'center',
                });
                break;
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
        }
    };

    const handleSave = async () => {
        if (!fabricRef.current || !selectedSession) return;

        const canvasData = fabricRef.current.toJSON();
        try {
            await api.saveWhiteboardSnapshot(selectedSession.id, canvasData, `Snapshot ${Date.now()}`);
            alert('Snapshot saved!');
        } catch (error) {
            console.error('Error saving snapshot:', error);
            alert('Failed to save snapshot');
        }
    };

    const handleUndo = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const objects = canvas.getObjects();
        if (objects.length > 0) {
            canvas.remove(objects[objects.length - 1]);
            canvas.renderAll();
        }
    };

    const handleClear = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        if (confirm('Clear the entire canvas?')) {
            canvas.clear();
            canvas.backgroundColor = '#FFFFFF';
            canvas.renderAll();
        }
    };

    const handleDownload = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
        });

        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    // Session selection screen
    if (!selectedSession) {
        return (
            <div className="p-6 space-y-6">
                <Link href="/dashboard/student/learning" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Learning Hub
                </Link>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Collaborative Whiteboard</h1>

                {sessions.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <Square className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Sessions</h2>
                        <p className="text-gray-500">Join a session or create one to start drawing</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => setSelectedSession(session)}
                                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-lg transition-shadow"
                            >
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{session.title}</h3>
                                {session.topic && (
                                    <span className="text-sm text-purple-600">{session.topic}</span>
                                )}
                                {session.description && (
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{session.description}</p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Whiteboard canvas
    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedSession(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Tools */}
                <div className="flex gap-1">
                    {[
                        { id: 'select', icon: MousePointer, label: 'Select' },
                        { id: 'pencil', icon: Palette, label: 'Pencil' },
                        { id: 'line', icon: Minus, label: 'Line' },
                        { id: 'rect', icon: Square, label: 'Rectangle' },
                        { id: 'circle', icon: Circle, label: 'Circle' },
                        { id: 'text', icon: Type, label: 'Text' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (['line', 'rect', 'circle', 'text'].includes(t.id)) {
                                    addShape(t.id as any);
                                } else {
                                    setTool(t.id as Tool);
                                }
                            }}
                            className={`p-2 rounded-lg transition-colors ${tool === t.id
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                            title={t.label}
                        >
                            <t.icon className="w-5 h-5" />
                        </button>
                    ))}
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Colors */}
                <div className="flex gap-1">
                    {COLORS.slice(0, 6).map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-gray-900' : 'border-transparent hover:scale-105'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Brush size */}
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-20"
                />

                <div className="flex-1" />

                {/* Actions */}
                <button onClick={handleUndo} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Undo">
                    <Undo className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button onClick={handleClear} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Clear">
                    <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button onClick={handleDownload} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Download">
                    <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save
                </button>
            </div>

            {/* Canvas Container */}
            <div ref={containerRef} className="flex-1 overflow-hidden">
                <canvas ref={canvasRef} className="block" />
            </div>
        </div>
    );
}
