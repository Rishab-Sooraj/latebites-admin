"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCog, Plus, Mail, Shield, ShieldCheck, AlertCircle, Loader2, Check, X, Copy, Lock, Snowflake, Ban, Eye, Calendar, Activity } from "lucide-react";
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
    frozen_at?: string | null;
    revoked_at?: string | null;
    frozen_by?: string | null;
    revoked_by?: string | null;
    last_login_at?: string | null;
    issues_resolved_count?: number;
    notes?: string | null;
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
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState<{ type: 'freeze' | 'revoke'; admin: Admin } | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'frozen' | 'revoked'>('all');

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

    const handleFreeze = async (admin: Admin) => {
        setActionLoading(admin.id);
        try {
            const response = await fetch('/api/admins/freeze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: admin.id,
                    freeze: !admin.frozen_at, // Toggle freeze status
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to freeze admin');
            }

            fetchAdmins();
            setShowConfirmModal(null);
        } catch (err) {
            console.error('Error freezing admin:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevoke = async (admin: Admin) => {
        setActionLoading(admin.id);
        try {
            const response = await fetch('/api/admins/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: admin.id }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to revoke admin');
            }

            fetchAdmins();
            setShowConfirmModal(null);
        } catch (err) {
            console.error('Error revoking admin:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const openAdminDetail = (admin: Admin) => {
        setSelectedAdmin(admin);
        setShowDetailModal(true);
    };

    const getAdminStatus = (admin: Admin): 'active' | 'frozen' | 'revoked' => {
        if (admin.revoked_at) return 'revoked';
        if (admin.frozen_at) return 'frozen';
        return 'active';
    };

    const filteredAdmins = admins.filter(admin => {
        if (filter === 'all') return true;
        return getAdminStatus(admin) === filter;
    });

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {(['all', 'active', 'frozen', 'revoked'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === tab
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                    >
                        {tab}
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-black/20 text-xs">
                            {admins.filter(a => tab === 'all' ? true : getAdminStatus(a) === tab).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Admins List */}
            <div className="grid gap-4">
                {filteredAdmins.map((admin, index) => {
                    const status = getAdminStatus(admin);
                    return (
                        <motion.div
                            key={admin.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-zinc-900/50 border rounded-xl p-6 cursor-pointer hover:border-zinc-700 transition-colors ${status === 'revoked' ? 'border-red-500/30 opacity-60' :
                                status === 'frozen' ? 'border-blue-500/30' :
                                    'border-zinc-800'
                                }`}
                            onClick={() => openAdminDetail(admin)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${status === 'revoked' ? 'bg-red-500/10' :
                                        status === 'frozen' ? 'bg-blue-500/10' :
                                            admin.role === 'super_admin' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                                        }`}>
                                        {status === 'revoked' ? (
                                            <Ban className="w-6 h-6 text-red-500" />
                                        ) : status === 'frozen' ? (
                                            <Snowflake className="w-6 h-6 text-blue-500" />
                                        ) : admin.role === 'super_admin' ? (
                                            <ShieldCheck className="w-6 h-6 text-amber-500" />
                                        ) : (
                                            <Shield className="w-6 h-6 text-emerald-500" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-white font-medium">{admin.name}</h3>
                                            {status === 'frozen' && (
                                                <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded">
                                                    Frozen
                                                </span>
                                            )}
                                            {status === 'revoked' && (
                                                <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded">
                                                    Revoked
                                                </span>
                                            )}
                                            {admin.must_change_password && status === 'active' && (
                                                <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded">
                                                    Pending Password
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-zinc-500 text-sm mt-1">
                                            <div className="flex items-center gap-1">
                                                <Mail className="w-4 h-4" />
                                                <span>{admin.email}</span>
                                            </div>
                                            {admin.issues_resolved_count !== undefined && admin.issues_resolved_count > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Activity className="w-4 h-4" />
                                                    <span>{admin.issues_resolved_count} issues</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${admin.role === 'super_admin'
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-emerald-500/10 text-emerald-500'
                                        }`}>
                                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                    </span>

                                    {admin.role !== 'super_admin' && !admin.revoked_at && (
                                        <>
                                            <button
                                                onClick={() => setShowConfirmModal({ type: 'freeze', admin })}
                                                disabled={actionLoading === admin.id}
                                                className={`p-2 rounded-lg transition-colors ${admin.frozen_at
                                                    ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                    : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                                                    }`}
                                                title={admin.frozen_at ? 'Unfreeze account' : 'Freeze account'}
                                            >
                                                <Snowflake className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setShowConfirmModal({ type: 'revoke', admin })}
                                                disabled={actionLoading === admin.id}
                                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                                title="Revoke account permanently"
                                            >
                                                <Ban className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => openAdminDetail(admin)}
                                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                        title="View details"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {filteredAdmins.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                        No admins found with the selected filter.
                    </div>
                )}
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

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowConfirmModal(null)}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6"
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${showConfirmModal.type === 'revoke' ? 'bg-red-500/20' : 'bg-blue-500/20'
                                }`}>
                                {showConfirmModal.type === 'revoke' ? (
                                    <Ban className="w-8 h-8 text-red-500" />
                                ) : showConfirmModal.admin.frozen_at ? (
                                    <Check className="w-8 h-8 text-emerald-500" />
                                ) : (
                                    <Snowflake className="w-8 h-8 text-blue-500" />
                                )}
                            </div>

                            <h2 className="text-xl font-semibold text-white text-center mb-2">
                                {showConfirmModal.type === 'revoke'
                                    ? 'Revoke Admin Account?'
                                    : showConfirmModal.admin.frozen_at
                                        ? 'Unfreeze Admin Account?'
                                        : 'Freeze Admin Account?'}
                            </h2>

                            <p className="text-zinc-400 text-center mb-6">
                                {showConfirmModal.type === 'revoke'
                                    ? `This will permanently revoke ${showConfirmModal.admin.name}'s access. This action cannot be undone.`
                                    : showConfirmModal.admin.frozen_at
                                        ? `This will restore ${showConfirmModal.admin.name}'s access to the admin portal.`
                                        : `This will temporarily suspend ${showConfirmModal.admin.name}'s access. You can unfreeze later.`}
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(null)}
                                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => showConfirmModal.type === 'revoke'
                                        ? handleRevoke(showConfirmModal.admin)
                                        : handleFreeze(showConfirmModal.admin)}
                                    disabled={actionLoading === showConfirmModal.admin.id}
                                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${showConfirmModal.type === 'revoke'
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : showConfirmModal.admin.frozen_at
                                                ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                >
                                    {actionLoading === showConfirmModal.admin.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : showConfirmModal.type === 'revoke' ? (
                                        'Revoke'
                                    ) : showConfirmModal.admin.frozen_at ? (
                                        'Unfreeze'
                                    ) : (
                                        'Freeze'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Admin Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowDetailModal(false)}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${getAdminStatus(selectedAdmin) === 'revoked' ? 'bg-red-500/20' :
                                            getAdminStatus(selectedAdmin) === 'frozen' ? 'bg-blue-500/20' :
                                                selectedAdmin.role === 'super_admin' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                                        }`}>
                                        {getAdminStatus(selectedAdmin) === 'revoked' ? (
                                            <Ban className="w-8 h-8 text-red-500" />
                                        ) : getAdminStatus(selectedAdmin) === 'frozen' ? (
                                            <Snowflake className="w-8 h-8 text-blue-500" />
                                        ) : selectedAdmin.role === 'super_admin' ? (
                                            <ShieldCheck className="w-8 h-8 text-amber-500" />
                                        ) : (
                                            <Shield className="w-8 h-8 text-emerald-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-white">{selectedAdmin.name}</h2>
                                        <p className="text-zinc-400">{selectedAdmin.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Role</p>
                                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${selectedAdmin.role === 'super_admin'
                                                ? 'bg-amber-500/10 text-amber-500'
                                                : 'bg-emerald-500/10 text-emerald-500'
                                            }`}>
                                            {selectedAdmin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Status</p>
                                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getAdminStatus(selectedAdmin) === 'revoked' ? 'bg-red-500/10 text-red-500' :
                                                getAdminStatus(selectedAdmin) === 'frozen' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-emerald-500/10 text-emerald-500'
                                            }`}>
                                            {getAdminStatus(selectedAdmin).charAt(0).toUpperCase() + getAdminStatus(selectedAdmin).slice(1)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Created</p>
                                        <div className="flex items-center gap-2 text-white">
                                            <Calendar className="w-4 h-4 text-zinc-500" />
                                            <span>{formatDate(selectedAdmin.created_at)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Last Login</p>
                                        <div className="flex items-center gap-2 text-white">
                                            <Calendar className="w-4 h-4 text-zinc-500" />
                                            <span>{formatDate(selectedAdmin.last_login_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Issues Resolved</p>
                                    <div className="flex items-center gap-2 text-white">
                                        <Activity className="w-4 h-4 text-zinc-500" />
                                        <span className="text-2xl font-semibold">{selectedAdmin.issues_resolved_count || 0}</span>
                                    </div>
                                </div>

                                {selectedAdmin.frozen_at && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                        <p className="text-blue-400 text-sm">
                                            <Snowflake className="w-4 h-4 inline mr-2" />
                                            Frozen on {formatDate(selectedAdmin.frozen_at)}
                                        </p>
                                    </div>
                                )}

                                {selectedAdmin.revoked_at && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                        <p className="text-red-400 text-sm">
                                            <Ban className="w-4 h-4 inline mr-2" />
                                            Revoked on {formatDate(selectedAdmin.revoked_at)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-6 border-t border-zinc-800 flex gap-3">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                {selectedAdmin.role !== 'super_admin' && !selectedAdmin.revoked_at && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowConfirmModal({ type: 'freeze', admin: selectedAdmin });
                                            }}
                                            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${selectedAdmin.frozen_at
                                                    ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                                }`}
                                        >
                                            <Snowflake className="w-5 h-5" />
                                            {selectedAdmin.frozen_at ? 'Unfreeze' : 'Freeze'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                setShowConfirmModal({ type: 'revoke', admin: selectedAdmin });
                                            }}
                                            className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                                        >
                                            <Ban className="w-5 h-5" />
                                            Revoke
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
