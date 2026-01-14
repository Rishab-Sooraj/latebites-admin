"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCog, Plus, Mail, Shield, ShieldCheck, AlertCircle, Loader2, Check, X, Copy, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Admin {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'super_admin';
    is_active: boolean;
    must_change_password?: boolean;
    created_at: string;
}

interface CreatedCredentials {
    name: string;
    email: string;
    password: string;
    role: string;
}

export default function AdminsPage() {
    const supabase = createClient();
    const router = useRouter();

    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'admin' });
    const [addLoading, setAddLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        checkAccessAndFetch();
    }, []);

    const checkAccessAndFetch = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/');
                return;
            }

            // Check if current user is super_admin
            const { data: adminData } = await supabase
                .from('admins')
                .select('*')
                .eq('email', user.email)
                .single();

            if (!adminData || adminData.role !== 'super_admin') {
                router.push('/dashboard');
                return;
            }

            setCurrentAdmin(adminData);
            fetchAdmins();
        } catch {
            router.push('/dashboard');
        }
    };

    const fetchAdmins = async () => {
        try {
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAdmins(data || []);
        } catch (error) {
            console.error('Error fetching admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admins/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAdmin),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create admin');
            }

            // Show credentials
            setCredentials({
                name: data.name,
                email: data.email,
                password: data.temporaryPassword,
                role: data.role,
            });

            setNewAdmin({ name: '', email: '', role: 'admin' });
            fetchAdmins();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add admin';
            setError(errorMessage);
        } finally {
            setAddLoading(false);
        }
    };

    const copyCredentials = () => {
        if (!credentials) return;

        const text = `Admin Account Created!\n\nName: ${credentials.name}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.password}\nRole: ${credentials.role}\n\nPlease change your password after first login.`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const closeCredentialsModal = () => {
        setCredentials(null);
        setShowAddModal(false);
    };

    const toggleAdminStatus = async (admin: Admin) => {
        if (admin.role === 'super_admin') return;

        try {
            await supabase
                .from('admins')
                .update({ is_active: !admin.is_active })
                .eq('id', admin.id);

            fetchAdmins();
        } catch (error) {
            console.error('Error toggling admin status:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif text-white">Manage Admins</h1>
                    <p className="text-zinc-500 mt-1">Add and manage admin accounts</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Admin
                </button>
            </div>

            {/* Admins List */}
            <div className="grid gap-4">
                {admins.map((admin, index) => (
                    <motion.div
                        key={admin.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-zinc-900/50 border rounded-xl p-6 ${admin.is_active ? 'border-zinc-800' : 'border-red-500/20 opacity-60'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${admin.role === 'super_admin' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                                    }`}>
                                    {admin.role === 'super_admin' ? (
                                        <ShieldCheck className="w-6 h-6 text-amber-500" />
                                    ) : (
                                        <Shield className="w-6 h-6 text-blue-500" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-medium">{admin.name}</h3>
                                        {admin.must_change_password && (
                                            <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded">
                                                Pending Password Change
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                        <Mail className="w-4 h-4" />
                                        <span>{admin.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${admin.role === 'super_admin'
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-blue-500/10 text-blue-500'
                                    }`}>
                                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                </span>

                                {admin.role !== 'super_admin' && (
                                    <button
                                        onClick={() => toggleAdminStatus(admin)}
                                        className={`p-2 rounded-lg transition-colors ${admin.is_active
                                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                            }`}
                                        title={admin.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {admin.is_active ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Add Admin Modal */}
            <AnimatePresence>
                {showAddModal && !credentials && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddModal(false)}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md"
                        >
                            <div className="p-6 border-b border-zinc-800">
                                <h2 className="text-xl font-semibold text-white">Add New Admin</h2>
                                <p className="text-sm text-zinc-500 mt-1">
                                    A temporary password will be auto-generated
                                </p>
                            </div>

                            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-zinc-500">Name</label>
                                    <input
                                        type="text"
                                        value={newAdmin.name}
                                        onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nimai Krishna"
                                        required
                                        className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-zinc-500">Email</label>
                                    <input
                                        type="email"
                                        value={newAdmin.email}
                                        onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="admin@latebites.in"
                                        required
                                        className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-zinc-500">Role</label>
                                    <select
                                        value={newAdmin.role}
                                        onChange={(e) => setNewAdmin(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>

                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-amber-500 font-medium text-sm">Temporary Password</p>
                                            <p className="text-zinc-400 text-sm mt-1">
                                                A secure password will be generated. The admin will be prompted to change it on first login.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addLoading}
                                        className="flex-1 px-4 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {addLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Admin'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Credentials Success Modal */}
            <AnimatePresence>
                {credentials && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCredentialsModal}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md"
                        >
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-serif text-white mb-2">Admin Created!</h2>
                                <p className="text-zinc-400 mb-6">Share these credentials with the new admin</p>

                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-left mb-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Name</p>
                                            <p className="text-white font-medium">{credentials.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Email</p>
                                            <p className="text-white font-mono">{credentials.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Role</p>
                                            <p className="text-blue-400 capitalize">{credentials.role.replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Temporary Password</p>
                                            <p className="text-amber-500 font-mono text-lg">{credentials.password}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                                    <p className="text-yellow-500 text-sm">
                                        ⚠️ The admin will be prompted to change this password on first login.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={copyCredentials}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button
                                        onClick={closeCredentialsModal}
                                        className="flex-1 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
