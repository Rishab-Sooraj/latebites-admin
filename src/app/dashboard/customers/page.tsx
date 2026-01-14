"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Phone, Calendar, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Customer {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
}

export default function CustomersPage() {
    const supabase = createClient();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        (customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (customer.phone?.includes(searchQuery) || false)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif text-white">Customers</h1>
                <p className="text-zinc-500 mt-1">View and manage customer accounts</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
            </div>

            {/* Customers Table */}
            {loading ? (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-zinc-800 rounded" />
                        ))}
                    </div>
                </div>
            ) : filteredCustomers.length > 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-zinc-500">Customer</th>
                                <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-zinc-500">Email</th>
                                <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-zinc-500">Phone</th>
                                <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-zinc-500">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer, index) => (
                                <motion.tr
                                    key={customer.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                                <span className="text-emerald-500 font-medium">
                                                    {customer.name?.[0]?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <span className="text-white font-medium">
                                                {customer.name || 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Mail className="w-4 h-4" />
                                            <span>{customer.email || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Phone className="w-4 h-4" />
                                            <span>{customer.phone || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date(customer.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                    <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No customers found</h3>
                    <p className="text-zinc-500">
                        {searchQuery ? 'Try a different search term' : 'No customers have signed up yet'}
                    </p>
                </div>
            )}
        </div>
    );
}
