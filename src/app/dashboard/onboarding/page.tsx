"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, MapPin, Phone, Mail, Check, X, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OnboardingRestaurant {
    id: string;
    restaurant_name: string;
    contact_person: string;
    email: string;
    phone_number: string;
    city: string;
    status?: string;
    created_at: string;
}

export default function OnboardingPage() {
    const supabase = createClient();
    const [restaurants, setRestaurants] = useState<OnboardingRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [selectedRestaurant, setSelectedRestaurant] = useState<OnboardingRestaurant | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchRestaurants = async () => {
        try {
            const { data, error } = await supabase
                .from('Resturant Onboarding')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRestaurants(data || []);
        } catch (error) {
            console.error('Error fetching onboarding requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (restaurantId: string, newStatus: 'approved' | 'rejected') => {
        setActionLoading(restaurantId);
        try {
            const response = await fetch('/api/restaurants/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, status: newStatus }),
            });

            const data = await response.json();

            if (!response.ok) {
                setToast({ message: data.error || 'Failed to update status', type: 'error' });
                return;
            }

            if (newStatus === 'approved') {
                if (data.emailSent) {
                    setToast({ message: 'Restaurant approved and notified via email! 📧', type: 'success' });
                } else {
                    setToast({ message: 'Restaurant approved, but email notification failed. ⚠️', type: 'warning' });
                }
            } else {
                setToast({ message: 'Restaurant rejected.', type: 'success' });
            }

            await fetchRestaurants();
            setSelectedRestaurant(null);
        } catch (error) {
            console.error('Error updating status:', error);
            setToast({ message: 'Failed to update status. Please try again.', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'approved':
                return { color: 'bg-emerald-500/10 text-emerald-500', icon: <CheckCircle className="w-4 h-4" />, label: 'Approved' };
            case 'rejected':
                return { color: 'bg-red-500/10 text-red-500', icon: <XCircle className="w-4 h-4" />, label: 'Rejected' };
            default:
                return { color: 'bg-amber-500/10 text-amber-500', icon: <Clock className="w-4 h-4" />, label: 'Pending' };
        }
    };

    const filteredRestaurants = restaurants.filter(restaurant => {
        const matchesSearch =
            restaurant.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            restaurant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            restaurant.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            restaurant.contact_person?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'all') return matchesSearch;
        if (filter === 'pending') return matchesSearch && (!restaurant.status || restaurant.status === 'pending');
        return matchesSearch && restaurant.status === filter;
    });

    const pendingCount = restaurants.filter(r => !r.status || r.status === 'pending').length;
    const approvedCount = restaurants.filter(r => r.status === 'approved').length;
    const rejectedCount = restaurants.filter(r => r.status === 'rejected').length;

    return (
        <div className="space-y-6 relative">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-full shadow-lg border backdrop-blur-md flex items-center gap-3 font-medium whitespace-nowrap
                        ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                    'bg-red-500/10 border-red-500/20 text-red-500'}`}
                    >
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                            toast.type === 'warning' ? <Store className="w-5 h-5" /> :
                                <XCircle className="w-5 h-5" />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif text-white">Restaurant Onboarding</h1>
                <p className="text-zinc-500 mt-1">Review and manage restaurant applications</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                    <p className="text-zinc-500 text-sm">Total Applications</p>
                    <p className="text-2xl font-semibold text-white">{restaurants.length}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                    <p className="text-amber-500 text-sm">Pending Review</p>
                    <p className="text-2xl font-semibold text-white">{pendingCount}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                    <p className="text-emerald-500 text-sm">Approved</p>
                    <p className="text-2xl font-semibold text-white">{approvedCount}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                    <p className="text-red-500 text-sm">Rejected</p>
                    <p className="text-2xl font-semibold text-white">{rejectedCount}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === tab
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                    >
                        {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'pending' && pendingCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-black/20 rounded-full text-xs">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Search by name, email, owner, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
            </div>

            {/* Applications List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-pulse">
                            <div className="h-6 w-1/3 bg-zinc-800 rounded mb-4" />
                            <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                        </div>
                    ))}
                </div>
            ) : filteredRestaurants.length > 0 ? (
                <div className="space-y-4">
                    {filteredRestaurants.map((restaurant, index) => {
                        const statusBadge = getStatusBadge(restaurant.status);
                        return (
                            <motion.div
                                key={restaurant.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedRestaurant(restaurant)}
                                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                            <Store className="w-6 h-6 text-amber-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{restaurant.restaurant_name}</h3>
                                            <p className="text-sm text-zinc-500">{restaurant.contact_person} • {restaurant.email}</p>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                                                <MapPin className="w-3 h-3" />
                                                <span>{restaurant.city}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${statusBadge.color}`}>
                                            {statusBadge.icon}
                                            {statusBadge.label}
                                        </span>
                                        <span className="text-xs text-zinc-600">
                                            {new Date(restaurant.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <Store className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No applications found</h3>
                    <p className="text-zinc-500">
                        {searchQuery ? 'Try a different search term' : 'No restaurant applications yet'}
                    </p>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedRestaurant && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedRestaurant(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                            <Store className="w-7 h-7 text-amber-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-white">{selectedRestaurant.restaurant_name}</h2>
                                            <p className="text-zinc-500">{selectedRestaurant.contact_person}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedRestaurant(null)}
                                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-zinc-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-4">
                                {/* Status */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs uppercase tracking-widest text-zinc-500">Status</span>
                                    <span className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2 ${getStatusBadge(selectedRestaurant.status).color}`}>
                                        {getStatusBadge(selectedRestaurant.status).icon}
                                        {getStatusBadge(selectedRestaurant.status).label}
                                    </span>
                                </div>

                                {/* Contact Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-800/50 rounded-lg p-4">
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Email</p>
                                        <p className="text-white">{selectedRestaurant.email}</p>
                                    </div>
                                    <div className="bg-zinc-800/50 rounded-lg p-4">
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Phone</p>
                                        <p className="text-white">{selectedRestaurant.phone_number}</p>
                                    </div>
                                </div>

                                {/* City */}
                                <div className="bg-zinc-800/50 rounded-lg p-4">
                                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">City</p>
                                    <p className="text-white">{selectedRestaurant.city}</p>
                                </div>

                                {/* Date */}
                                <div className="bg-zinc-800/50 rounded-lg p-4">
                                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Applied On</p>
                                    <p className="text-white">
                                        {new Date(selectedRestaurant.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            {(!selectedRestaurant.status || selectedRestaurant.status === 'pending') && (
                                <div className="p-6 border-t border-zinc-800 flex gap-4">
                                    <button
                                        onClick={() => handleStatusChange(selectedRestaurant.id, 'approved')}
                                        disabled={actionLoading === selectedRestaurant.id}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-black font-medium rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50"
                                    >
                                        <Check className="w-5 h-5" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(selectedRestaurant.id, 'rejected')}
                                        disabled={actionLoading === selectedRestaurant.id}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/30 font-medium rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5" />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
