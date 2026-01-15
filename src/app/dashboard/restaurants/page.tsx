"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Store, Plus, MapPin, Phone, Mail, Search, X, Eye, CheckCircle, User, Calendar, FileCheck, Image as ImageIcon, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Restaurant {
    id: string;
    name: string;
    owner_name: string;
    email: string;
    phone: string;
    address_line1?: string;
    city: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    verified: boolean;
    is_active: boolean;
    strike_count?: number;
    menu_image_url?: string;
    // Verification tracking
    onboarded_by?: string;
    onboarded_by_name?: string;
    onboarded_by_email?: string;
    onboarded_at?: string;
    location_confirmed?: boolean;
    quality_checked?: boolean;
    explanation_provided?: boolean;
    created_at: string;
}

interface Strike {
    id: string;
    strike_number: number;
    reason: string;
    issued_by_name: string;
    issued_by_role: string;
    created_at: string;
}

interface AdminUser {
    role: string;
}

export default function RestaurantsPage() {
    const supabase = createClient();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [strikeLoading, setStrikeLoading] = useState(false);
    const [showStrikeForm, setShowStrikeForm] = useState(false);
    const [strikeReason, setStrikeReason] = useState("");
    const [issuingStrike, setIssuingStrike] = useState(false);
    const [strikeError, setStrikeError] = useState<string | null>(null);
    const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);

    useEffect(() => {
        fetchRestaurants();
        fetchCurrentAdmin();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            fetchStrikes(selectedRestaurant.id);
        }
    }, [selectedRestaurant]);

    const fetchCurrentAdmin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('admins')
                    .select('role')
                    .ilike('email', user.email || '')
                    .single();
                if (data) {
                    setCurrentAdmin(data);
                }
            }
        } catch (error) {
            console.error('Error fetching admin:', error);
        }
    };

    const fetchRestaurants = async () => {
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRestaurants(data || []);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStrikes = async (restaurantId: string) => {
        setStrikeLoading(true);
        try {
            const response = await fetch(`/api/restaurants/strike?restaurantId=${restaurantId}`);
            const data = await response.json();
            if (data.success) {
                setStrikes(data.strikes);
            }
        } catch (error) {
            console.error('Error fetching strikes:', error);
        } finally {
            setStrikeLoading(false);
        }
    };

    const handleIssueStrike = async () => {
        if (!selectedRestaurant || !strikeReason.trim()) return;

        setIssuingStrike(true);
        setStrikeError(null);

        try {
            const response = await fetch('/api/restaurants/strike', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: selectedRestaurant.id,
                    reason: strikeReason,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setStrikeError(data.error);
                return;
            }

            // Refresh data
            await fetchRestaurants();
            await fetchStrikes(selectedRestaurant.id);

            // Update selected restaurant
            setSelectedRestaurant(prev => prev ? {
                ...prev,
                strike_count: data.strikeCount,
                is_active: !data.isDeactivated,
            } : null);

            setShowStrikeForm(false);
            setStrikeReason("");
        } catch (error) {
            setStrikeError('Failed to issue strike');
        } finally {
            setIssuingStrike(false);
        }
    };

    const filteredRestaurants = restaurants.filter(restaurant =>
        restaurant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStrikeColor = (count: number) => {
        if (count >= 3) return 'text-red-500 bg-red-500/10';
        if (count === 2) return 'text-orange-500 bg-orange-500/10';
        if (count === 1) return 'text-amber-500 bg-amber-500/10';
        return 'text-emerald-500 bg-emerald-500/10';
    };

    const canIssueStrike = () => {
        if (!selectedRestaurant || !currentAdmin) return false;
        const currentStrikes = selectedRestaurant.strike_count || 0;
        if (currentStrikes >= 3) return false;
        // 3rd strike (when current is 2) requires super_admin
        if (currentStrikes === 2 && currentAdmin.role !== 'super_admin') return false;
        return true;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-white">Restaurants</h1>
                    <p className="text-zinc-500 mt-1">Active restaurant partners</p>
                </div>
                <Link
                    href="/dashboard/restaurants/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Restaurant
                </Link>
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

            {/* Restaurant Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-pulse">
                            <div className="h-6 w-1/2 bg-zinc-800 rounded mb-4" />
                            <div className="h-4 w-3/4 bg-zinc-800 rounded mb-2" />
                            <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                        </div>
                    ))}
                </div>
            ) : filteredRestaurants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRestaurants.map((restaurant, index) => (
                        <motion.div
                            key={restaurant.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setSelectedRestaurant(restaurant)}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                        <Store className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-amber-500 transition-colors">
                                            {restaurant.name}
                                        </h3>
                                        <p className="text-sm text-zinc-500">{restaurant.owner_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Strike Badge */}
                                    {(restaurant.strike_count || 0) > 0 && (
                                        <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${getStrikeColor(restaurant.strike_count || 0)}`}>
                                            <AlertTriangle className="w-3 h-3" />
                                            {restaurant.strike_count}/3
                                        </span>
                                    )}
                                    {/* Active Badge */}
                                    <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${restaurant.is_active
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        <CheckCircle className="w-3 h-3" />
                                        {restaurant.is_active ? 'Active' : 'Suspended'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Mail className="w-4 h-4" />
                                    <span>{restaurant.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Phone className="w-4 h-4" />
                                    <span>{restaurant.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <MapPin className="w-4 h-4" />
                                    <span>{restaurant.city}</span>
                                </div>
                            </div>

                            {restaurant.onboarded_by_name && (
                                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-500">
                                    <User className="w-3 h-3" />
                                    <span>Onboarded by {restaurant.onboarded_by_name}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                                <span className="text-xs text-zinc-600">
                                    {restaurant.onboarded_at
                                        ? `Added ${new Date(restaurant.onboarded_at).toLocaleDateString()}`
                                        : `Added ${new Date(restaurant.created_at).toLocaleDateString()}`
                                    }
                                </span>
                                <div className="flex items-center gap-1 text-sm text-amber-500">
                                    <Eye className="w-4 h-4" />
                                    View
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <Store className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No restaurants yet</h3>
                    <p className="text-zinc-500 mb-6">
                        {searchQuery ? 'Try a different search term' : 'Add restaurants from approved onboarding applications'}
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            href="/dashboard/restaurants/new"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Add Restaurant
                        </Link>
                        <Link
                            href="/dashboard/onboarding"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                            View Onboarding
                        </Link>
                    </div>
                </div>
            )}

            {/* Restaurant Detail Modal */}
            <AnimatePresence>
                {selectedRestaurant && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            setSelectedRestaurant(null);
                            setShowStrikeForm(false);
                            setStrikeReason("");
                            setStrikeError(null);
                        }}
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
                                        <div className="w-14 h-14 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                            <Store className="w-7 h-7 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-white">{selectedRestaurant.name}</h2>
                                            <p className="text-zinc-500">{selectedRestaurant.owner_name}</p>
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
                            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
                                {/* Strike Status */}
                                <div className={`rounded-lg p-4 ${getStrikeColor(selectedRestaurant.strike_count || 0)}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-5 h-5" />
                                            <div>
                                                <p className="font-medium">
                                                    {(selectedRestaurant.strike_count || 0) >= 3
                                                        ? 'Restaurant Suspended'
                                                        : `${selectedRestaurant.strike_count || 0} of 3 Strikes`}
                                                </p>
                                                <p className="text-sm opacity-75">
                                                    {(selectedRestaurant.strike_count || 0) >= 3
                                                        ? 'This restaurant has been deactivated due to 3 strikes'
                                                        : (selectedRestaurant.strike_count || 0) === 0
                                                            ? 'No violations recorded'
                                                            : `${3 - (selectedRestaurant.strike_count || 0)} strike(s) remaining before suspension`}
                                                </p>
                                            </div>
                                        </div>
                                        {canIssueStrike() && (
                                            <button
                                                onClick={() => setShowStrikeForm(true)}
                                                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                                Issue Strike
                                            </button>
                                        )}
                                    </div>

                                    {/* Super Admin Warning for 3rd Strike */}
                                    {(selectedRestaurant.strike_count || 0) === 2 && currentAdmin?.role !== 'super_admin' && (
                                        <div className="mt-3 p-3 bg-zinc-800/50 rounded flex items-center gap-2 text-sm">
                                            <Shield className="w-4 h-4 text-amber-500" />
                                            <span className="text-zinc-400">Only Super Admin can issue the final strike</span>
                                        </div>
                                    )}

                                    {/* Strike Form */}
                                    {showStrikeForm && (
                                        <div className="mt-4 p-4 bg-zinc-800 rounded-lg space-y-3">
                                            <p className="text-white font-medium">Issue Strike #{(selectedRestaurant.strike_count || 0) + 1}</p>
                                            <textarea
                                                value={strikeReason}
                                                onChange={(e) => setStrikeReason(e.target.value)}
                                                placeholder="Enter reason for the strike..."
                                                className="w-full p-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-red-500/50 resize-none"
                                                rows={3}
                                            />
                                            {strikeError && (
                                                <p className="text-red-400 text-sm">{strikeError}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleIssueStrike}
                                                    disabled={issuingStrike || !strikeReason.trim()}
                                                    className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {issuingStrike ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Issuing...
                                                        </>
                                                    ) : (
                                                        'Confirm Strike'
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowStrikeForm(false);
                                                        setStrikeReason("");
                                                        setStrikeError(null);
                                                    }}
                                                    className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-500 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Strike History */}
                                {strikes.length > 0 && (
                                    <div className="bg-zinc-800/50 rounded-lg p-4">
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Strike History</p>
                                        <div className="space-y-3">
                                            {strikes.map((strike) => (
                                                <div key={strike.id} className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg">
                                                    <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-red-500 font-bold text-sm">{strike.strike_number}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white text-sm">{strike.reason}</p>
                                                        <p className="text-zinc-500 text-xs mt-1">
                                                            By {strike.issued_by_name} ({strike.issued_by_role}) • {new Date(strike.created_at).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Contact Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-800/50 rounded-lg p-4">
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Email</p>
                                        <p className="text-white text-sm">{selectedRestaurant.email}</p>
                                    </div>
                                    <div className="bg-zinc-800/50 rounded-lg p-4">
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Phone</p>
                                        <p className="text-white text-sm">{selectedRestaurant.phone}</p>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="bg-zinc-800/50 rounded-lg p-4">
                                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Address</p>
                                    <p className="text-white">{selectedRestaurant.address_line1 || 'No address'}</p>
                                    <p className="text-zinc-400 text-sm">
                                        {selectedRestaurant.city}, {selectedRestaurant.state} - {selectedRestaurant.pincode}
                                    </p>
                                </div>

                                {/* Menu Image */}
                                {selectedRestaurant.menu_image_url && (
                                    <div className="bg-zinc-800/50 rounded-lg p-4">
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" />
                                            Menu Image
                                        </p>
                                        <img
                                            src={selectedRestaurant.menu_image_url}
                                            alt="Menu"
                                            className="w-full max-h-48 object-contain rounded-lg"
                                        />
                                    </div>
                                )}

                                {/* Admin Onboarding Details */}
                                {selectedRestaurant.onboarded_by_name && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                        <p className="text-xs uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Onboarded By
                                        </p>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-zinc-400 text-sm">Admin Name</span>
                                                <span className="text-white font-medium">{selectedRestaurant.onboarded_by_name}</span>
                                            </div>
                                            {selectedRestaurant.onboarded_at && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-400 text-sm">Onboarded On</span>
                                                    <span className="text-white text-sm">
                                                        {new Date(selectedRestaurant.onboarded_at).toLocaleDateString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
