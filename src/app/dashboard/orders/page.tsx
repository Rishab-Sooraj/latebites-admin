"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Search, User, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Order {
    id: string;
    bag_title: string;
    restaurant_name: string;
    customer_name: string;
    customer_phone: string;
    status: string;
    total_amount: number;
    created_at: string;
    pickup_time: string;
}

export default function OrdersPage() {
    const supabase = createClient();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/orders');

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-500';
            case 'confirmed':
                return 'bg-blue-500/10 text-blue-500';
            case 'picked_up':
            case 'completed':
                return 'bg-emerald-500/10 text-emerald-500';
            case 'cancelled':
                return 'bg-red-500/10 text-red-500';
            default:
                return 'bg-zinc-500/10 text-zinc-500';
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.bag_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalCount = orders.length;
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const completedCount = orders.filter(o => ['picked_up', 'completed'].includes(o.status)).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif text-white">Orders</h1>
                <p className="text-zinc-500 mt-1">Track and manage all customer orders</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-500 text-sm">Total Orders</p>
                    <p className="text-3xl font-semibold text-white mt-1">{totalCount}</p>
                </div>
                <div className="bg-zinc-900/50 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-amber-500 text-sm">Pending</p>
                    <p className="text-3xl font-semibold text-white mt-1">{pendingCount}</p>
                </div>
                <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-emerald-500 text-sm">Completed</p>
                    <p className="text-3xl font-semibold text-white mt-1">{completedCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by customer, restaurant, or bag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                    <option value="all">All Status</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-pulse">
                            <div className="h-6 w-1/3 bg-zinc-800 rounded mb-4" />
                            <div className="h-4 w-1/2 bg-zinc-800 rounded mb-2" />
                            <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                        </div>
                    ))}
                </div>
            ) : filteredOrders.length > 0 ? (
                <div className="space-y-4">
                    {filteredOrders.map((order, index) => (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-white text-lg">{order.bag_title}</h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                                        <div className="flex items-center gap-2">
                                            <Store className="w-4 h-4" />
                                            <span>{order.restaurant_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            <span>{order.customer_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 text-sm font-medium rounded ${getStatusColor(order.status)}`}>
                                    {order.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="block text-zinc-500 mb-1">Amount</span>
                                    <span className="text-white font-medium text-lg">₹{order.total_amount}</span>
                                </div>
                                <div>
                                    <span className="block text-zinc-500 mb-1">Customer Phone</span>
                                    <span className="text-white">{order.customer_phone}</span>
                                </div>
                                <div>
                                    <span className="block text-zinc-500 mb-1">Order Date</span>
                                    <span className="text-white">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="block text-zinc-500 mb-1">Order Time</span>
                                    <span className="text-white">{new Date(order.created_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
                    <p className="text-zinc-500">
                        {searchQuery || statusFilter !== "all"
                            ? 'Try adjusting your filters'
                            : 'Orders will appear here when customers make purchases'}
                    </p>
                </div>
            )}
        </div>
    );
}
