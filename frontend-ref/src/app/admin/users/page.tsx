'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User, Shield, Trash, PencilSimple, Plus, Buildings, Door, Pulse, Sparkle } from '@phosphor-icons/react';

interface UserData {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    // Optional fields for students
    student_id?: string; // register_number maps to student_id or register_number depending on backend
    register_number?: string;
    department?: string;
    batch?: string;
    student_category?: string;
}

interface HostelInfo {
    is_assigned: boolean;
    hostel_name: string | null;
    room_number: string | null;
    floor: number | null;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await api.getUsers();
            // Handle both array (legacy) and paginated object response
            if (Array.isArray(data)) {
                setUsers(data);
            } else if (data && data.users && Array.isArray(data.users)) {
                setUsers(data.users);
            } else {
                console.error('Unexpected response format:', data);
                setUsers([]);
            }
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [hostelInfo, setHostelInfo] = useState<HostelInfo | null>(null);
    const [loadingHostelInfo, setLoadingHostelInfo] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'STUDENT',
        register_number: '',
        department: '',
        batch: '',
        student_category: ''
    });

    const resetForm = () => {
        setEditingUser(null);
        setHostelInfo(null);
        setFormData({
            username: '',
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            role: 'STUDENT',
            register_number: '',
            department: '',
            batch: '',
            student_category: ''
        });
    };

    const handleEdit = async (user: UserData) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '', // Password not filled for security/logic
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            register_number: user.register_number || user.student_id || '',
            department: user.department || '',
            batch: user.batch || '',
            student_category: user.student_category || ''
        });
        setShowModal(true);

        // Fetch hostel info if user is a hosteller
        if (user.student_category === 'HOSTELLER') {
            setLoadingHostelInfo(true);
            try {
                // Try to get hostel info for this student
                const hostels = await api.getHostels(true);
                let foundInfo: HostelInfo = { is_assigned: false, hostel_name: null, room_number: null, floor: null };

                for (const hostel of hostels) {
                    try {
                        const students = await api.getHostelStudents(hostel.id);
                        const assignment = students.find((s: any) => s.student_id === user.id);
                        if (assignment) {
                            foundInfo = {
                                is_assigned: true,
                                hostel_name: hostel.name,
                                room_number: assignment.room_number || null,
                                floor: assignment.floor ?? null
                            };
                            break;
                        }
                    } catch (e) {
                        // Continue to next hostel
                    }
                }
                setHostelInfo(foundInfo);
            } catch (err) {
                console.error('Failed to fetch hostel info:', err);
                setHostelInfo({ is_assigned: false, hostel_name: null, room_number: null, floor: null });
            } finally {
                setLoadingHostelInfo(false);
            }
        } else {
            setHostelInfo(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Prepare payload
            const payload: any = { ...formData };

            // Remove empty password if editing (so it doesn't overwrite with empty string)
            if (editingUser && !payload.password) {
                delete payload.password;
            }

            // Remove internal optional fields if they are empty
            if (!payload.register_number) delete payload.register_number;
            if (!payload.department) delete payload.department;
            if (!payload.batch) delete payload.batch;
            if (!payload.student_category) delete payload.student_category;

            if (editingUser) {
                await api.updateUser(editingUser.id, payload);
                alert('User updated successfully');
            } else {
                await api.createUser(payload);
                alert('User created successfully');
            }

            setShowModal(false);
            resetForm();
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Failed to save user');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Users...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <User size={28} weight="duotone" className="text-blue-400" />
                        User Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage system users and roles</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl px-5 py-2.5 flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                >
                    <Plus size={20} weight="bold" /> Add User
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-xl font-chivo font-bold text-slate-100 mb-4 uppercase tracking-wider flex items-center gap-2">
                            {editingUser ? <PencilSimple size={24} weight="duotone" className="text-blue-400" /> : <Plus size={24} weight="duotone" className="text-blue-400" />}
                            {editingUser ? 'Edit User' : 'Add New User'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Username"
                                    required
                                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    required
                                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    required
                                    className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    required
                                    className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                />
                                <input
                                    type="password"
                                    placeholder={editingUser ? "Password (leave blank to keep)" : "Password"}
                                    required={!editingUser}
                                    className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <select
                                    className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="STUDENT">Student</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="STAFF">Staff</option>
                                    <option value="WARDEN">Warden</option>
                                    <option value="MAINTENANCE_STAFF">Maintenance Staff</option>
                                </select>
                            </div>
                            {formData.role === 'STUDENT' && (
                                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                    <input
                                        type="text"
                                        placeholder="Reg. Number"
                                        className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={formData.register_number}
                                        onChange={e => setFormData({ ...formData, register_number: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Department"
                                        className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Batch"
                                        className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={formData.batch}
                                        onChange={e => setFormData({ ...formData, batch: e.target.value })}
                                    />
                                    <select
                                        className="bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={formData.student_category}
                                        onChange={e => setFormData({ ...formData, student_category: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        <option value="HOSTELLER">Hosteller</option>
                                        <option value="DAY_SCHOLAR">Day Scholar</option>
                                    </select>
                                </div>
                            )}
                            {/* Department field for STAFF (Faculty) */}
                            {formData.role === 'STAFF' && (
                                <div className="border-t border-slate-800 pt-4">
                                    <p className="text-xs text-slate-500 mb-2">Faculty Details</p>
                                    <input
                                        type="text"
                                        placeholder="Department (e.g., Computer Science)"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-sm px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                            )}
                            {/* Read-only Hostel Assignment Info for Hostellers */}
                            {editingUser && formData.student_category === 'HOSTELLER' && (
                                <div className="border-t border-slate-800 pt-4 mt-4">
                                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                                        <Buildings size={16} />
                                        <span className="text-xs uppercase font-mono">Hostel Assignment (Read-Only)</span>
                                    </div>
                                    {loadingHostelInfo ? (
                                        <p className="text-slate-500 text-sm">Loading hostel info...</p>
                                    ) : hostelInfo?.is_assigned ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-900/60 border border-slate-700/60 rounded-sm px-3 py-2">
                                                <p className="text-xs text-slate-500">Hostel</p>
                                                <p className="text-slate-200 font-medium">{hostelInfo.hostel_name}</p>
                                            </div>
                                            <div className="bg-slate-900/60 border border-slate-700/60 rounded-sm px-3 py-2">
                                                <p className="text-xs text-slate-500">Room</p>
                                                <p className="text-slate-200 font-medium flex items-center gap-1">
                                                    <Door size={14} />
                                                    {hostelInfo.room_number || 'N/A'}
                                                    {hostelInfo.floor !== null && ` (Floor ${hostelInfo.floor})`}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-sm px-3 py-2 text-yellow-400 text-sm">
                                            Not assigned to any hostel. Use Admin → Hostels to assign.
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700/60 text-xs uppercase text-slate-400 font-mono">
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Joined</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                                                <User size={20} weight="fill" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-200">{user.first_name} {user.last_name}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono border ${user.role === 'ADMIN'
                                            ? 'bg-purple-950/30 border-purple-800/50 text-purple-400'
                                            : 'bg-blue-950/30 border-blue-800/50 text-blue-400'
                                            }`}>
                                            <Shield size={12} weight="fill" />
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-sm text-slate-300">{user.is_active ? 'Active' : 'Inactive'}</span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-400 font-mono">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-950/30 rounded-sm transition-colors"
                                            >
                                                <PencilSimple size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-sm transition-colors"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && !loading && (
                    <div className="p-8 text-center text-slate-500">
                        No users found.
                    </div>
                )}
            </div>
        </div>
    );
}
