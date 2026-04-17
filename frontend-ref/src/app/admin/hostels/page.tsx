'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Buildings,
    Plus,
    PencilSimple,
    Trash,
    Users,
    Door,
    UserPlus,
    Warning,
    CheckCircle,
    XCircle,
    Pulse,
    CaretDown,
    CaretUp,
    MagnifyingGlass,
    Shield,
    Sparkle
} from '@phosphor-icons/react';

interface Hostel {
    id: number;
    name: string;
    address: string | null;
    capacity: number;
    warden_id: number | null;
    is_active: boolean;
    room_count: number;
    occupied_beds: number;
    warden_name: string | null;
    created_at: string;
    updated_at: string;
}

interface Room {
    id: number;
    hostel_id: number;
    room_number: string;
    floor: number;
    capacity: number;
    is_active: boolean;
    current_occupancy: number;
    available_beds: number;
}

interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    student_category: string | null;
    register_number: string | null;
}

export default function AdminHostelsPage() {
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showHostelModal, setShowHostelModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showWardenModal, setShowWardenModal] = useState(false);
    const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
    const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);
    const [expandedHostelId, setExpandedHostelId] = useState<number | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    // Form states
    const [hostelForm, setHostelForm] = useState({ name: '', address: '', capacity: 100 });
    const [roomForm, setRoomForm] = useState({ room_number: '', floor: 0, capacity: 2 });
    const [assignForm, setAssignForm] = useState({ student_id: '', room_id: '' });
    const [wardenForm, setWardenForm] = useState({ warden_id: '' });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Users for assignment
    const [users, setUsers] = useState<User[]>([]);
    const [wardens, setWardens] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingWardens, setLoadingWardens] = useState(false);

    useEffect(() => {
        fetchHostels();
    }, []);

    async function fetchHostels() {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getHostels(true);
            setHostels(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load hostels');
        } finally {
            setLoading(false);
        }
    }

    async function fetchRooms(hostelId: number) {
        setLoadingRooms(true);
        try {
            const data = await api.getHostelRooms(hostelId, true);
            setRooms(data);
        } catch (err: any) {
            console.error('Failed to load rooms:', err);
        } finally {
            setLoadingRooms(false);
        }
    }

    async function fetchUsers() {
        setLoadingUsers(true);
        try {
            const data = await api.getUsers();
            // Filter to only show hostellers not assigned
            setUsers(data.users?.filter((u: User) =>
                u.role === 'STUDENT' && u.student_category === 'HOSTELLER'
            ) || []);
        } catch (err: any) {
            console.error('Failed to load users:', err);
        } finally {
            setLoadingUsers(false);
        }
    }

    async function fetchWardens() {
        setLoadingWardens(true);
        try {
            const data = await api.getUsers();
            // Filter to only show users with WARDEN role
            setWardens(data.users?.filter((u: User) => u.role === 'WARDEN') || []);
        } catch (err: any) {
            console.error('Failed to load wardens:', err);
        } finally {
            setLoadingWardens(false);
        }
    }

    async function handleCreateHostel(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        try {
            await api.createHostel(hostelForm);
            setShowHostelModal(false);
            setHostelForm({ name: '', address: '', capacity: 100 });
            await fetchHostels();
        } catch (err: any) {
            setFormError(err.message || 'Failed to create hostel');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAddRoom(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedHostelId) return;
        setSubmitting(true);
        setFormError(null);
        try {
            await api.addHostelRoom(selectedHostelId, roomForm);
            setShowRoomModal(false);
            setRoomForm({ room_number: '', floor: 0, capacity: 2 });
            await fetchRooms(selectedHostelId);
            await fetchHostels();
        } catch (err: any) {
            setFormError(err.message || 'Failed to add room');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAssignStudent(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedHostelId) return;
        setSubmitting(true);
        setFormError(null);
        try {
            await api.assignStudentToHostel({
                student_id: parseInt(assignForm.student_id),
                hostel_id: selectedHostelId,
                room_id: parseInt(assignForm.room_id)
            });
            setShowAssignModal(false);
            setAssignForm({ student_id: '', room_id: '' });
            await fetchRooms(selectedHostelId);
            await fetchHostels();
        } catch (err: any) {
            setFormError(err.message || 'Failed to assign student');
        } finally {
            setSubmitting(false);
        }
    }

    function openRoomsPanel(hostelId: number) {
        if (expandedHostelId === hostelId) {
            setExpandedHostelId(null);
        } else {
            setExpandedHostelId(hostelId);
            setSelectedHostelId(hostelId);
            fetchRooms(hostelId);
        }
    }

    function openAssignModal(hostelId: number) {
        setSelectedHostelId(hostelId);
        fetchRooms(hostelId);
        fetchUsers();
        setShowAssignModal(true);
    }

    function openWardenModal(hostelId: number) {
        setSelectedHostelId(hostelId);
        setWardenForm({ warden_id: '' });
        fetchWardens();
        setShowWardenModal(true);
    }

    async function handleAssignWarden(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedHostelId) return;
        setSubmitting(true);
        setFormError(null);
        try {
            await api.assignWarden(selectedHostelId, parseInt(wardenForm.warden_id));
            setShowWardenModal(false);
            setWardenForm({ warden_id: '' });
            await fetchHostels();
        } catch (err: any) {
            setFormError(err.message || 'Failed to assign warden');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Hostels...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Buildings size={28} weight="duotone" className="text-indigo-400" />
                        Hostel Management
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage hostels, rooms, and student assignments
                    </p>
                </div>
                <button
                    onClick={() => setShowHostelModal(true)}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-2.5 px-5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                    <Plus size={18} weight="bold" />
                    Add Hostel
                </button>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl p-3 flex items-center gap-2">
                    <Warning size={18} weight="duotone" />
                    {error}
                </div>
            )}

            {/* Hostels List */}
            {hostels.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700/60 rounded-xl p-12 text-center relative overflow-hidden">
                    <Sparkle size={100} weight="duotone" className="absolute -right-4 -bottom-4 text-slate-800/30" />
                    <Buildings size={56} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-300 mb-2 uppercase tracking-wider">No Hostels</h3>
                    <p className="text-slate-500">Click "Add Hostel" to create your first hostel.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {hostels.map((hostel) => (
                        <div key={hostel.id} className="bg-slate-800/40 border border-slate-700/60 rounded-lg overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${hostel.is_active ? 'bg-indigo-900/40 border-indigo-700/30' : 'bg-slate-900/40 border-slate-700/30'} border`}>
                                            <Buildings size={24} className={hostel.is_active ? 'text-indigo-400' : 'text-slate-500'} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                                                {hostel.name}
                                                {!hostel.is_active && (
                                                    <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">Inactive</span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-slate-500">{hostel.address || 'No address'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xl font-mono font-bold text-slate-200">{hostel.room_count}</p>
                                            <p className="text-xs text-slate-500">Rooms</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-mono font-bold text-slate-200">{hostel.occupied_beds}/{hostel.capacity}</p>
                                            <p className="text-xs text-slate-500">Occupied</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-slate-300">{hostel.warden_name || '-'}</p>
                                            <p className="text-xs text-slate-500">Warden</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openWardenModal(hostel.id)}
                                                className="p-2 text-purple-400 hover:bg-purple-900/30 rounded transition-colors"
                                                title="Assign Warden"
                                            >
                                                <Shield size={20} />
                                            </button>
                                            <button
                                                onClick={() => openAssignModal(hostel.id)}
                                                className="p-2 text-green-400 hover:bg-green-900/30 rounded transition-colors"
                                                title="Assign Student"
                                            >
                                                <UserPlus size={20} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedHostelId(hostel.id);
                                                    setShowRoomModal(true);
                                                }}
                                                className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                                                title="Add Room"
                                            >
                                                <Door size={20} />
                                            </button>
                                            <button
                                                onClick={() => openRoomsPanel(hostel.id)}
                                                className="p-2 text-slate-400 hover:bg-slate-700/50 rounded transition-colors"
                                                title="View Rooms"
                                            >
                                                {expandedHostelId === hostel.id ? <CaretUp size={20} /> : <CaretDown size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rooms Panel */}
                            {expandedHostelId === hostel.id && (
                                <div className="border-t border-slate-700/40 bg-slate-900/30 p-4">
                                    <h4 className="font-medium text-slate-300 mb-3 flex items-center gap-2">
                                        <Door size={16} />
                                        Rooms ({rooms.length})
                                    </h4>
                                    {loadingRooms ? (
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-indigo-400 animate-spin" />
                                            Loading rooms...
                                        </div>
                                    ) : rooms.length === 0 ? (
                                        <p className="text-slate-500 text-sm">No rooms added yet.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                            {rooms.map((room) => (
                                                <div
                                                    key={room.id}
                                                    className={`p-3 rounded-lg border text-center ${room.available_beds > 0
                                                        ? 'bg-green-900/20 border-green-700/30'
                                                        : 'bg-red-900/20 border-red-700/30'
                                                        }`}
                                                >
                                                    <p className="font-mono font-bold text-slate-200">{room.room_number}</p>
                                                    <p className="text-xs text-slate-400">Floor {room.floor}</p>
                                                    <p className={`text-xs mt-1 ${room.available_beds > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {room.current_occupancy}/{room.capacity} beds
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Hostel Modal */}
            {showHostelModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Create New Hostel</h3>
                        {formError && (
                            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-2 text-sm mb-4">{formError}</div>
                        )}
                        <form onSubmit={handleCreateHostel} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Hostel Name *</label>
                                <input
                                    type="text"
                                    value={hostelForm.name}
                                    onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={hostelForm.address}
                                    onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Capacity</label>
                                <input
                                    type="number"
                                    value={hostelForm.capacity}
                                    onChange={(e) => setHostelForm({ ...hostelForm, capacity: parseInt(e.target.value) })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    min={1}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowHostelModal(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {submitting ? <div className="w-4 h-4 rounded-full border-2 border-blue-300/40 border-t-white animate-spin" /> : <Plus size={18} weight="duotone" />}
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Room Modal */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Add New Room</h3>
                        {formError && (
                            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-2 text-sm mb-4">{formError}</div>
                        )}
                        <form onSubmit={handleAddRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Room Number *</label>
                                <input
                                    type="text"
                                    value={roomForm.room_number}
                                    onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                    placeholder="e.g., 101, A-12"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Floor</label>
                                    <input
                                        type="number"
                                        value={roomForm.floor}
                                        onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) })}
                                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Beds</label>
                                    <input
                                        type="number"
                                        value={roomForm.capacity}
                                        onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        min={1}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRoomModal(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {submitting ? <div className="w-4 h-4 rounded-full border-2 border-blue-300/40 border-t-white animate-spin" /> : <Plus size={18} weight="duotone" />}
                                    Add Room
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Student Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Assign Student to Room</h3>
                        {formError && (
                            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-2 text-sm mb-4">{formError}</div>
                        )}
                        <form onSubmit={handleAssignStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Select Student *</label>
                                <select
                                    value={assignForm.student_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select a student...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.first_name} {user.last_name} ({user.register_number || user.username})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Select Room *</label>
                                <select
                                    value={assignForm.room_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, room_id: e.target.value })}
                                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select a room...</option>
                                    {rooms.filter(r => r.available_beds > 0).map((room) => (
                                        <option key={room.id} value={room.id}>
                                            Room {room.room_number} (Floor {room.floor}) - {room.available_beds} beds available
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || loadingUsers || loadingRooms}
                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {submitting ? <div className="w-4 h-4 rounded-full border-2 border-green-300/40 border-t-white animate-spin" /> : <UserPlus size={18} weight="duotone" />}
                                    Assign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Warden Modal */}
            {showWardenModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <Shield size={20} className="text-purple-400" />
                            Assign Warden to Hostel
                        </h3>
                        {formError && (
                            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-2 text-sm mb-4">{formError}</div>
                        )}
                        <form onSubmit={handleAssignWarden} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Select Warden *</label>
                                {loadingWardens ? (
                                    <div className="flex items-center gap-2 text-slate-500 py-2">
                                        <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-purple-400 animate-spin" />
                                        Loading wardens...
                                    </div>
                                ) : wardens.length === 0 ? (
                                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 text-yellow-400 text-sm">
                                        No wardens available. Create a user with WARDEN role first in Admin → Users.
                                    </div>
                                ) : (
                                    <select
                                        value={wardenForm.warden_id}
                                        onChange={(e) => setWardenForm({ warden_id: e.target.value })}
                                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                                        required
                                    >
                                        <option value="">Select a warden...</option>
                                        {wardens.map((warden) => (
                                            <option key={warden.id} value={warden.id}>
                                                {warden.first_name} {warden.last_name} ({warden.username})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWardenModal(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || loadingWardens || wardens.length === 0}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {submitting ? <div className="w-4 h-4 rounded-full border-2 border-purple-300/40 border-t-white animate-spin" /> : <Shield size={18} weight="duotone" />}
                                    Assign Warden
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
