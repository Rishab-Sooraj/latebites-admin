"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Mail, Phone, Calendar, Search, X, Package, Clock, MapPin, IndianRupee, ChevronRight, ArrowLeft, Store, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Lock, Loader2, RotateCcw, AlertTriangle, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Customer {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
}

interface Order {
    id: string;
    customer_id: string;
    restaurant_id: string;
    status: string;
    total_amount: number;
    quantity: number;
    pickup_otp: string;
    created_at: string;
    updated_at: string;
    payment_method?: string;
    payment_status?: string;
    razorpay_payment_id?: string;
    refund_status?: string | null;
    refund_amount?: number | null;
    rescue_bags?: {
        id: string;
        title: string;
        description: string;
        original_price: number;
        discounted_price: number;
        pickup_start_time: string;
        pickup_end_time: string;
    };
    restaurant_onboarding?: {
        id: string;
        name: string;
        address: string;
    };
}

export default function CustomersPage() {
    const supabase = createClient();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [adminRole, setAdminRole] = useState<string>('admin');

    // Customer detail modal
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Order detail view
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // OTP visibility state
    const [showOtp, setShowOtp] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");

    // Refund modal state
    const [refundModal, setRefundModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
    const [refundReason, setRefundReason] = useState("");
    const [refundAmount, setRefundAmount] = useState<number | null>(null);
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundResult, setRefundResult] = useState<{ success: boolean; message: string } | null>(null);
    const [verifyingPassword, setVerifyingPassword] = useState(false);

    useEffect(() => {
        fetchCustomers();
        fetchAdminRole();
    }, []);

    const fetchAdminRole = async () => {
        try {
            // Read from localStorage (set by layout)
            if (typeof window !== 'undefined') {
                const storedRole = localStorage.getItem('adminRole');
                if (storedRole) {
                    setAdminRole(storedRole);
                }
            }
        } catch (error) {
            console.error('Error fetching admin role:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await fetch('/api/customers');

            if (!response.ok) {
                throw new Error('Failed to fetch customers');
            }

            const data = await response.json();
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomerOrders = async (customerId: string) => {
        setLoadingOrders(true);
        try {
            const response = await fetch(`/api/customers/${customerId}/orders`);

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            setCustomerOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setCustomerOrders([]);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleCustomerClick = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedOrder(null);
        setShowOtp(false);
        fetchCustomerOrders(customer.id);
    };

    const handleOrderClick = (order: Order) => {
        setSelectedOrder(order);
        setShowOtp(false); // Reset OTP visibility when changing orders
    };

    const closeModal = () => {
        setSelectedCustomer(null);
        setSelectedOrder(null);
        setCustomerOrders([]);
        setShowOtp(false);
        setPassword("");
        setPasswordError("");
    };

    const handleRevealOtp = () => {
        setShowPasswordModal(true);
        setPassword("");
        setPasswordError("");
    };

    const verifyPassword = async () => {
        setVerifyingPassword(true);
        setPasswordError("");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                setPasswordError("User not found");
                return;
            }

            // Try to sign in with the password to verify
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            });

            if (error) {
                setPasswordError("Incorrect password");
                return;
            }

            // Password verified - show OTP
            setShowOtp(true);
            setShowPasswordModal(false);
            setPassword("");
        } catch (error) {
            setPasswordError("Verification failed");
        } finally {
            setVerifyingPassword(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-500';
            case 'pending': return 'bg-amber-500/10 text-amber-500';
            case 'confirmed': return 'bg-blue-500/10 text-blue-500';
            case 'cancelled': return 'bg-red-500/10 text-red-500';
            default: return 'bg-zinc-500/10 text-zinc-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4" />;
            case 'cancelled': return <XCircle className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    // Refund helper functions
    const canRefund = (order: Order) => {
        return order.payment_method === 'online' &&
            order.payment_status === 'paid' &&
            order.refund_status !== 'full';
    };

    const openRefundModal = (order: Order) => {
        setRefundModal({ open: true, order });
        setRefundReason("");
        setRefundAmount(null);
        setRefundResult(null);
    };

    const closeRefundModal = () => {
        setRefundModal({ open: false, order: null });
        setRefundReason("");
        setRefundAmount(null);
        setRefundResult(null);
    };

    const handleRefund = async () => {
        if (!refundModal.order) return;

        setRefundLoading(true);
        setRefundResult(null);

        try {
            const adminId = localStorage.getItem('adminId');

            const response = await fetch('/api/orders/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: refundModal.order.id,
                    reason: refundReason || 'Refund requested by admin',
                    amount: refundAmount,
                    adminId: adminId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process refund');
            }

            setRefundResult({
                success: true,
                message: data.message || `Refund of ₹${data.refund?.amount} processed successfully!`,
            });

            // Refresh orders
            if (selectedCustomer) {
                fetchCustomerOrders(selectedCustomer.id);
            }

        } catch (error: any) {
            setRefundResult({
                success: false,
                message: error.message || 'Failed to process refund',
            });
        } finally {
            setRefundLoading(false);
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
                                <th className="text-left px-6 py-4 text-xs uppercase tracking-widest text-zinc-500"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer, index) => (
                                <motion.tr
                                    key={customer.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    onClick={() => handleCustomerClick(customer)}
                                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
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
                                    <td className="px-6 py-4">
                                        <ChevronRight className="w-5 h-5 text-zinc-600" />
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

            {/* Customer Detail Modal */}
            <AnimatePresence>
                {selectedCustomer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                                {selectedOrder ? (
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>Back to Orders</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                            <span className="text-emerald-500 text-xl font-medium">
                                                {selectedCustomer.name?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-white">
                                                {selectedCustomer.name || 'Unknown Customer'}
                                            </h2>
                                            <p className="text-zinc-500 text-sm">{selectedCustomer.email}</p>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={closeModal}
                                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
                                {selectedOrder ? (
                                    /* Order Detail View */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-zinc-500 uppercase tracking-widest">Order ID</p>
                                                <p className="text-white font-mono">{selectedOrder.id.slice(0, 8)}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2 ${getStatusColor(selectedOrder.status)}`}>
                                                {getStatusIcon(selectedOrder.status)}
                                                {selectedOrder.status}
                                            </span>
                                        </div>

                                        {/* Restaurant Info */}
                                        <div className="bg-zinc-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Store className="w-5 h-5 text-amber-500" />
                                                <span className="text-xs uppercase tracking-widest text-zinc-500">Restaurant</span>
                                            </div>
                                            <p className="text-white font-medium">{selectedOrder.restaurant_onboarding?.name || 'Unknown Restaurant'}</p>
                                            <p className="text-zinc-400 text-sm mt-1">{selectedOrder.restaurant_onboarding?.address || 'No address'}</p>
                                        </div>

                                        {/* Rescue Bag Info */}
                                        <div className="bg-zinc-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Package className="w-5 h-5 text-emerald-500" />
                                                <span className="text-xs uppercase tracking-widest text-zinc-500">Rescue Bag</span>
                                            </div>
                                            <p className="text-white font-medium">{selectedOrder.rescue_bags?.title || 'Rescue Bag'}</p>
                                            <p className="text-zinc-400 text-sm mt-1">{selectedOrder.rescue_bags?.description || 'No description'}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div>
                                                    <p className="text-xs text-zinc-500">Original Price</p>
                                                    <p className="text-zinc-400 line-through">₹{selectedOrder.rescue_bags?.original_price || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-zinc-500">Discounted Price</p>
                                                    <p className="text-emerald-500 font-medium">₹{selectedOrder.rescue_bags?.discounted_price || 0}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Details Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-zinc-800/50 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                    <IndianRupee className="w-4 h-4" />
                                                    <span className="text-xs uppercase tracking-widest">Total Amount</span>
                                                </div>
                                                <p className="text-2xl font-semibold text-white">₹{selectedOrder.total_amount}</p>
                                            </div>
                                            <div className="bg-zinc-800/50 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                    <Package className="w-4 h-4" />
                                                    <span className="text-xs uppercase tracking-widest">Quantity</span>
                                                </div>
                                                <p className="text-2xl font-semibold text-white">{selectedOrder.quantity}</p>
                                            </div>
                                            <div className="bg-zinc-800/50 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-xs uppercase tracking-widest">Pickup Time</span>
                                                </div>
                                                <p className="text-white">
                                                    {selectedOrder.rescue_bags?.pickup_start_time?.slice(0, 5) || '--'} - {selectedOrder.rescue_bags?.pickup_end_time?.slice(0, 5) || '--'}
                                                </p>
                                            </div>
                                            <div className="bg-zinc-800/50 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-xs uppercase tracking-widest">Order Date</span>
                                                </div>
                                                <p className="text-white">
                                                    {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* OTP - Only visible to super_admin with password verification */}
                                        {adminRole === 'super_admin' && (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs uppercase tracking-widest text-amber-500">Pickup OTP</p>
                                                    {!showOtp ? (
                                                        <button
                                                            onClick={handleRevealOtp}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 rounded-lg text-sm transition-colors"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                            <span>Reveal</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setShowOtp(false)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm transition-colors"
                                                        >
                                                            <EyeOff className="w-4 h-4" />
                                                            <span>Hide</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {showOtp ? (
                                                    <p className="text-3xl font-mono font-bold text-white tracking-widest">{selectedOrder.pickup_otp || '----'}</p>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Eye className="w-5 h-5 text-zinc-500" />
                                                        <p className="text-xl font-mono text-zinc-500 tracking-widest">• • • •</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Refund Button */}
                                        {canRefund(selectedOrder) && (
                                            <div className="mt-4 pt-4 border-t border-zinc-800">
                                                <button
                                                    onClick={() => openRefundModal(selectedOrder)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>Process Refund</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Refund Status Badge */}
                                        {selectedOrder.refund_status && selectedOrder.refund_status !== 'none' && (
                                            <div className="mt-4 p-3 bg-purple-500/10 rounded-lg">
                                                <p className="text-sm text-purple-400">
                                                    {selectedOrder.refund_status === 'full' ? '✅ Fully Refunded' :
                                                        selectedOrder.refund_status === 'partial' ? `⚠️ Partial Refund: ₹${selectedOrder.refund_amount}` :
                                                            `Refund Status: ${selectedOrder.refund_status}`}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Orders List View */
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-medium text-white">Order History</h3>
                                            <span className="text-sm text-zinc-500">{customerOrders.length} orders</span>
                                        </div>

                                        {loadingOrders ? (
                                            <div className="space-y-3">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
                                                ))}
                                            </div>
                                        ) : customerOrders.length > 0 ? (
                                            customerOrders.map((order) => (
                                                <motion.div
                                                    key={order.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    onClick={() => handleOrderClick(order)}
                                                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 cursor-pointer hover:border-amber-500/50 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-amber-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-medium">{order.rescue_bags?.title || 'Rescue Bag'}</p>
                                                                <p className="text-zinc-500 text-sm">{order.restaurant_onboarding?.name || 'Restaurant'}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                                                                {order.status}
                                                            </span>
                                                            <span className="text-zinc-400">
                                                                {new Date(order.created_at).toLocaleDateString('en-IN', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <span className="text-white font-medium">₹{order.total_amount}</span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12">
                                                <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                                <p className="text-zinc-500">No orders found for this customer</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Password Verification Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowPasswordModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                    <Lock className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Verify Identity</h3>
                                    <p className="text-sm text-zinc-500">Enter your password to reveal OTP</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                                        autoFocus
                                    />
                                    {passwordError && (
                                        <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {passwordError}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPasswordModal(false)}
                                        className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={verifyPassword}
                                        disabled={!password || verifyingPassword}
                                        className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {verifyingPassword ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="w-4 h-4" />
                                                Reveal OTP
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Refund Modal */}
            <AnimatePresence>
                {refundModal.open && refundModal.order && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={closeRefundModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                                        <RotateCcw className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Process Refund</h2>
                                        <p className="text-sm text-zinc-500">Order #{refundModal.order.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeRefundModal}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {refundResult ? (
                                    <div className={`p-4 rounded-lg ${refundResult.success ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                        <div className="flex items-start gap-3">
                                            {refundResult.success ? (
                                                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <h4 className={`font-medium ${refundResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {refundResult.success ? 'Refund Successful' : 'Refund Failed'}
                                                </h4>
                                                <p className="text-sm text-zinc-400 mt-1">{refundResult.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Order Summary */}
                                        <div className="bg-zinc-800/50 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-zinc-400 mb-3">Order Details</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Bag</span>
                                                    <span className="text-white">{refundModal.order.rescue_bags?.title || 'Rescue Bag'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Order Total</span>
                                                    <span className="text-white font-medium">₹{refundModal.order.total_amount}</span>
                                                </div>
                                                {refundModal.order.refund_amount && refundModal.order.refund_amount > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-500">Already Refunded</span>
                                                        <span className="text-orange-400">-₹{refundModal.order.refund_amount}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-2 border-t border-zinc-700">
                                                    <span className="text-zinc-400 font-medium">Refundable Amount</span>
                                                    <span className="text-emerald-400 font-semibold">
                                                        ₹{refundModal.order.total_amount - (refundModal.order.refund_amount || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Refund Amount */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                                Refund Amount (optional)
                                            </label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="number"
                                                    value={refundAmount || ''}
                                                    onChange={(e) => setRefundAmount(e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder={`Full refund: ₹${refundModal.order.total_amount - (refundModal.order.refund_amount || 0)}`}
                                                    max={refundModal.order.total_amount - (refundModal.order.refund_amount || 0)}
                                                    className="w-full pl-9 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                                                />
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-1">Leave empty for full refund</p>
                                        </div>

                                        {/* Reason */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                                Reason for Refund
                                            </label>
                                            <textarea
                                                value={refundReason}
                                                onChange={(e) => setRefundReason(e.target.value)}
                                                placeholder="Enter refund reason..."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                                            />
                                        </div>

                                        {/* Warning */}
                                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-400">
                                                The refund will be credited to the customer's original payment method within 5-7 business days.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
                                {refundResult ? (
                                    <button
                                        onClick={closeRefundModal}
                                        className="px-6 py-2.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                                    >
                                        Close
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={closeRefundModal}
                                            className="px-6 py-2.5 text-zinc-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleRefund}
                                            disabled={refundLoading}
                                            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {refundLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-4 h-4" />
                                                    Process Refund
                                                </>
                                            )}
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
