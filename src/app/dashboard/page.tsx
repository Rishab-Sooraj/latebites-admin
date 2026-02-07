"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Store, ShoppingBag, Users, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Stats {
    totalRestaurants: number;
    totalOrders: number;
    totalCustomers: number;
    pendingApplications: number;
}

export default function AdminDashboard() {
    const supabase = createClient();
    const [stats, setStats] = useState<Stats>({
        totalRestaurants: 0,
        totalOrders: 0,
        totalCustomers: 0,
        pendingApplications: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/dashboard/stats');

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();

            setStats({
                totalRestaurants: data.restaurants,
                totalOrders: data.orders,
                totalCustomers: data.customers,
                pendingApplications: data.pendingApplications,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'Total Restaurants', value: stats.totalRestaurants, icon: Store, color: 'amber' },
        { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'emerald' },
        { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'blue' },
        { label: 'Pending Applications', value: stats.pendingApplications, icon: TrendingUp, color: 'purple' },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif text-white">Dashboard</h1>
                    <p className="text-zinc-500 mt-1">Overview of your platform</p>
                </div>
                <Link
                    href="/dashboard/restaurants/new"
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Restaurant
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
                    >
                        <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center mb-4`}>
                            <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
                        </div>
                        <p className="text-zinc-500 text-sm mb-1">{stat.label}</p>
                        {loading ? (
                            <div className="h-9 w-20 bg-zinc-800 animate-pulse rounded" />
                        ) : (
                            <p className="text-3xl font-semibold text-white">{stat.value}</p>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-white mb-2">Add New Restaurant</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                        Create login credentials for a new restaurant partner
                    </p>
                    <Link
                        href="/dashboard/restaurants/new"
                        className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 font-medium"
                    >
                        Get Started <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-white mb-2">Manage Orders</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                        Search, track, and modify customer orders
                    </p>
                    <Link
                        href="/dashboard/orders"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium"
                    >
                        View Orders <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
