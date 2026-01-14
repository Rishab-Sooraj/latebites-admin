"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Store, Plus, MapPin, Phone, Mail, Check, X, ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Restaurant {
    id: string;
    name: string;
    owner_name: string;
    email: string;
    phone: string;
    city: string;
    verified: boolean;
    is_active: boolean;
    created_at: string;
}

export default function RestaurantsPage() {
    const supabase = createClient();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchRestaurants();
    }, []);

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

    const filteredRestaurants = restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-white">Restaurants</h1>
                    <p className="text-zinc-500 mt-1">Manage restaurant partners</p>
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
                    placeholder="Search by name, email, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
            </div>

            {/* Restaurant List */}
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
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                        <Store className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-amber-500 transition-colors">
                                            {restaurant.name}
                                        </h3>
                                        <p className="text-sm text-zinc-500">{restaurant.owner_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${restaurant.verified
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-yellow-500/10 text-yellow-500'
                                        }`}>
                                        {restaurant.verified ? 'Verified' : 'Pending'}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${restaurant.is_active
                                        ? 'bg-blue-500/10 text-blue-500'
                                        : 'bg-zinc-500/10 text-zinc-500'
                                        }`}>
                                        {restaurant.is_active ? 'Active' : 'Inactive'}
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

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                                <span className="text-xs text-zinc-600">
                                    Added {new Date(restaurant.created_at).toLocaleDateString()}
                                </span>
                                <Link
                                    href={`/dashboard/restaurants/${restaurant.id}`}
                                    className="flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400"
                                >
                                    View Details <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <Store className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No restaurants found</h3>
                    <p className="text-zinc-500 mb-6">
                        {searchQuery ? 'Try a different search term' : 'Add your first restaurant partner'}
                    </p>
                    {!searchQuery && (
                        <Link
                            href="/dashboard/restaurants/new"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Add Restaurant
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
