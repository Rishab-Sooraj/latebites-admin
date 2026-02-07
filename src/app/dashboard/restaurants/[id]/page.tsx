"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Store, MapPin, Phone, Mail, ArrowLeft, Package,
    ShoppingBag, Clock, AlertTriangle, Trash2, Loader2, Shield,
    ExternalLink, Image as ImageIcon, Calendar, X, ZoomIn
} from "lucide-react";
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
    verified: boolean;
    is_active: boolean;
    strike_count?: number;
    menu_image_url?: string;
    created_at: string;
}

interface Bag {
    id: string;
    title: string;
    size: string;
    original_price: number;
    discounted_price: number;
    quantity_available: number;
    pickup_start_time: string;
    pickup_end_time: string;
    is_active: boolean;
    created_at: string;
}

interface Order {
    id: string;
    bag_title: string;
    customer_name: string;
    customer_phone: string;
    status: string;
    total_amount: number;
    created_at: string;
    pickup_time: string;
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

export default function RestaurantDetailPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [bags, setBags] = useState<Bag[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"ongoing" | "completed">("ongoing");

    // Deletion State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [bagToDelete, setBagToDelete] = useState<string | null>(null);
    const [deletingBagId, setDeletingBagId] = useState<string | null>(null);

    // Strike State
    const [showStrikeForm, setShowStrikeForm] = useState(false);
    const [strikeReason, setStrikeReason] = useState("");
    const [issuingStrike, setIssuingStrike] = useState(false);
    const [strikeError, setStrikeError] = useState<string | null>(null);

    // Menu Image Modal
    const [showMenuModal, setShowMenuModal] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchData();
            fetchCurrentAdmin();
            fetchStrikes(params.id as string);
        }
    }, [params.id]);

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

    const fetchStrikes = async (restaurantId: string) => {
        try {
            const response = await fetch(`/api/restaurants/strike?restaurantId=${restaurantId}`);
            const data = await response.json();
            if (data.success) {
                setStrikes(data.strikes);
            }
        } catch (error) {
            console.error('Error fetching strikes:', error);
        }
    };

    const fetchData = async () => {
        try {
            const { data: restaurantData, error: restaurantError } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', params.id)
                .single();

            if (restaurantError) throw restaurantError;
            setRestaurant(restaurantData);

            const { data: bagsData, error: bagsError } = await supabase
                .from('rescue_bags')
                .select('*')
                .eq('restaurant_id', params.id)
                .order('created_at', { ascending: false });

            if (bagsError) throw bagsError;
            setBags(bagsData || []);

            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select(`
                    id, status, total_amount, created_at, pickup_time,
                    rescue_bags!inner(title, restaurant_id),
                    customers(name, phone)
                `)
                .eq('rescue_bags.restaurant_id', params.id)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const transformedOrders = (ordersData || []).map((order: any) => ({
                id: order.id,
                bag_title: order.rescue_bags?.title || 'Unknown Bag',
                customer_name: order.customers?.name || 'Unknown',
                customer_phone: order.customers?.phone || '',
                status: order.status,
                total_amount: order.total_amount,
                created_at: order.created_at,
                pickup_time: order.pickup_time
            }));

            setOrders(transformedOrders);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteBag = (bagId: string) => {
        setBagToDelete(bagId);
        setShowDeleteModal(true);
    };

    const handleDeleteBag = async () => {
        if (!bagToDelete) return;
        setDeletingBagId(bagToDelete);
        try {
            const response = await fetch(`/api/bags/delete?id=${bagToDelete}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete bag');
            setBags(prev => prev.filter(b => b.id !== bagToDelete));
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Error deleting bag:', error);
            alert('Failed to delete bag');
        } finally {
            setDeletingBagId(null);
            setBagToDelete(null);
        }
    };

    const handleIssueStrike = async () => {
        if (!restaurant || !strikeReason.trim()) return;
        setIssuingStrike(true);
        setStrikeError(null);
        try {
            const response = await fetch('/api/restaurants/strike', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId: restaurant.id, reason: strikeReason }),
            });
            const data = await response.json();
            if (!response.ok) { setStrikeError(data.error); return; }
            await fetchStrikes(restaurant.id);
            setRestaurant(prev => prev ? { ...prev, strike_count: data.strikeCount, is_active: !data.isDeactivated } : null);
            setShowStrikeForm(false);
            setStrikeReason("");
        } catch (error) {
            setStrikeError('Failed to issue strike');
        } finally {
            setIssuingStrike(false);
        }
    };

    const canIssueStrike = () => {
        if (!restaurant || !currentAdmin) return false;
        const currentStrikes = restaurant.strike_count || 0;
        if (currentStrikes >= 3) return false;
        if (currentStrikes === 2 && currentAdmin.role !== 'super_admin') return false;
        return true;
    };

    const getStrikeColor = (count: number) => {
        if (count >= 3) return 'from-red-600 to-red-800';
        if (count === 2) return 'from-orange-500 to-orange-700';
        if (count === 1) return 'from-amber-500 to-amber-700';
        return 'from-emerald-500 to-emerald-700';
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${hour12}:${minutes} ${period}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'picked_up': case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
        }
    };

    const ongoingOrders = orders.filter(o => ['pending', 'confirmed'].includes(o.status));
    const completedOrders = orders.filter(o => ['picked_up', 'completed', 'cancelled'].includes(o.status));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-500 border-t-transparent"></div>
                    <p className="text-zinc-500 text-sm">Loading restaurant details...</p>
                </div>
            </div>
        );
    }

    if (!restaurant) {
        return (
            <div className="text-center py-12">
                <Store className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Restaurant not found</p>
            </div>
        );
    }

    const strikeCount = restaurant.strike_count || 0;

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl transition-all hover:scale-105"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{restaurant.name}</h1>
                        <p className="text-zinc-500 mt-0.5">Managed by {restaurant.owner_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${restaurant.verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {restaurant.verified ? '✓ Verified' : 'Pending'}
                    </span>
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${restaurant.is_active ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                        {restaurant.is_active ? 'Active' : 'Suspended'}
                    </span>
                </div>
            </div>

            {/* Top Section: Info + Strike + Menu */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Restaurant Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-5 bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Contact Info</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl">
                            <div className="p-2 bg-amber-500/10 rounded-lg"><Mail className="w-4 h-4 text-amber-500" /></div>
                            <div>
                                <p className="text-xs text-zinc-500">Email</p>
                                <p className="text-white text-sm">{restaurant.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl">
                            <div className="p-2 bg-emerald-500/10 rounded-lg"><Phone className="w-4 h-4 text-emerald-500" /></div>
                            <div>
                                <p className="text-xs text-zinc-500">Phone</p>
                                <p className="text-white text-sm">{restaurant.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl">
                            <div className="p-2 bg-blue-500/10 rounded-lg"><MapPin className="w-4 h-4 text-blue-500" /></div>
                            <div>
                                <p className="text-xs text-zinc-500">Location</p>
                                <p className="text-white text-sm">{restaurant.address_line1 ? `${restaurant.address_line1}, ` : ''}{restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl">
                            <div className="p-2 bg-purple-500/10 rounded-lg"><Calendar className="w-4 h-4 text-purple-500" /></div>
                            <div>
                                <p className="text-xs text-zinc-500">Joined</p>
                                <p className="text-white text-sm">{new Date(restaurant.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Strike Management Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4 bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col"
                >
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Strike Management</h3>

                    {/* Strike Meter */}
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${getStrikeColor(strikeCount)} mb-4`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-white" />
                                <span className="text-white font-bold text-lg">{strikeCount}/3</span>
                            </div>
                            {canIssueStrike() && (
                                <button
                                    onClick={() => setShowStrikeForm(true)}
                                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors backdrop-blur-sm"
                                >
                                    + Issue Strike
                                </button>
                            )}
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= strikeCount ? 'bg-white' : 'bg-white/30'}`}></div>
                            ))}
                        </div>
                        <p className="text-white/80 text-xs mt-2">
                            {strikeCount >= 3 ? 'Restaurant suspended' : strikeCount === 0 ? 'No violations' : `${3 - strikeCount} strike(s) until suspension`}
                        </p>
                    </div>

                    {/* Super Admin Warning */}
                    {strikeCount === 2 && currentAdmin?.role !== 'super_admin' && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs">
                            <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="text-amber-400">Only Super Admin can issue the final strike</span>
                        </div>
                    )}

                    {/* Strike Form or History */}
                    <div className="flex-1 overflow-hidden">
                        {showStrikeForm ? (
                            <div className="space-y-3">
                                <textarea
                                    value={strikeReason}
                                    onChange={(e) => setStrikeReason(e.target.value)}
                                    placeholder="Reason for issuing strike..."
                                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/50 resize-none"
                                    rows={3}
                                />
                                {strikeError && <p className="text-red-400 text-xs">{strikeError}</p>}
                                <div className="flex gap-2">
                                    <button onClick={handleIssueStrike} disabled={issuingStrike || !strikeReason.trim()} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                        {issuingStrike ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Strike'}
                                    </button>
                                    <button onClick={() => { setShowStrikeForm(false); setStrikeReason(""); setStrikeError(null); }} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-xl transition-colors">Cancel</button>
                                </div>
                            </div>
                        ) : strikes.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {strikes.map((strike) => (
                                    <div key={strike.id} className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-red-400 font-semibold text-xs">Strike #{strike.strike_number}</span>
                                            <span className="text-zinc-600 text-[10px]">{new Date(strike.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-zinc-300 text-sm line-clamp-2">{strike.reason}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                                <p>No strikes recorded</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Menu Image Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-3 bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col"
                >
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Menu</h3>
                    {restaurant.menu_image_url ? (
                        <div className="flex-1 relative group cursor-pointer" onClick={() => setShowMenuModal(true)}>
                            <img
                                src={restaurant.menu_image_url}
                                alt="Restaurant Menu"
                                className="w-full h-full object-cover rounded-xl border border-zinc-700"
                                style={{ minHeight: '180px', maxHeight: '220px' }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                <div className="flex items-center gap-2 text-white text-sm font-medium">
                                    <ZoomIn className="w-5 h-5" />
                                    View Full Menu
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-zinc-800/30 rounded-xl border border-dashed border-zinc-700" style={{ minHeight: '180px' }}>
                            <ImageIcon className="w-10 h-10 text-zinc-600 mb-2" />
                            <p className="text-zinc-500 text-sm">No menu uploaded</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Bags Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Package className="w-5 h-5 text-amber-500" /></div>
                        Bags Listed
                        <span className="ml-2 px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-sm font-semibold rounded-full">{bags.length}</span>
                    </h2>
                </div>
                {bags.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {bags.map((bag, i) => (
                            <motion.div
                                key={bag.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-white text-lg">{bag.title}</h3>
                                        <span className="text-xs text-zinc-500 uppercase tracking-wider">{bag.size} size</span>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${bag.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-600/20 text-zinc-400'}`}>
                                        {bag.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                    <div className="p-3 bg-zinc-800/40 rounded-xl">
                                        <p className="text-zinc-500 text-xs">Quantity</p>
                                        <p className="text-white font-semibold text-lg">{bag.quantity_available}</p>
                                    </div>
                                    <div className="p-3 bg-zinc-800/40 rounded-xl">
                                        <p className="text-zinc-500 text-xs">Price</p>
                                        <p className="text-amber-500 font-bold text-lg">₹{bag.discounted_price}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
                                    <Clock className="w-4 h-4 text-zinc-500" />
                                    <span>{formatTime(bag.pickup_start_time)} - {formatTime(bag.pickup_end_time)}</span>
                                </div>
                                <button onClick={() => confirmDeleteBag(bag.id)} className="w-full py-2.5 text-red-500 hover:bg-red-500/10 text-sm font-medium flex items-center justify-center gap-2 rounded-xl border border-transparent hover:border-red-500/20 transition-all">
                                    <Trash2 className="w-4 h-4" /> Remove Bag
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
                        <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500">No bags listed by this restaurant</p>
                    </div>
                )}
            </motion.div>

            {/* Orders Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg"><ShoppingBag className="w-5 h-5 text-blue-500" /></div>
                        Orders
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab("ongoing")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "ongoing" ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                            Ongoing ({ongoingOrders.length})
                        </button>
                        <button onClick={() => setActiveTab("completed")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "completed" ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                            Completed ({completedOrders.length})
                        </button>
                    </div>
                </div>
                {(activeTab === "ongoing" ? ongoingOrders : completedOrders).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(activeTab === "ongoing" ? ongoingOrders : completedOrders).map((order) => (
                            <div key={order.id} className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-white">{order.bag_title}</h3>
                                        <p className="text-sm text-zinc-500">{order.customer_name}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${getStatusColor(order.status)}`}>
                                        {order.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-3 bg-zinc-800/40 rounded-xl">
                                        <p className="text-zinc-500 text-xs">Amount</p>
                                        <p className="text-white font-semibold">₹{order.total_amount}</p>
                                    </div>
                                    <div className="p-3 bg-zinc-800/40 rounded-xl">
                                        <p className="text-zinc-500 text-xs">Ordered</p>
                                        <p className="text-white text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
                        <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500">No {activeTab} orders</p>
                    </div>
                )}
            </motion.div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-7 h-7 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Delete Bag?</h3>
                                    <p className="text-zinc-400 mt-2 text-sm">This action is permanent and cannot be undone.</p>
                                </div>
                                <div className="flex gap-3 w-full mt-2">
                                    <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors">Cancel</button>
                                    <button onClick={handleDeleteBag} disabled={deletingBagId !== null} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                                        {deletingBagId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Menu Image Full View Modal */}
            <AnimatePresence>
                {showMenuModal && restaurant.menu_image_url && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMenuModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setShowMenuModal(false)} className="absolute -top-12 right-0 p-2 text-white hover:text-zinc-300 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                            <img src={restaurant.menu_image_url} alt="Restaurant Menu" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-zinc-700" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
