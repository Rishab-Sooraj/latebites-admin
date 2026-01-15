"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Store,
    Users,
    Search,
    LogOut,
    ChevronRight,
    Shield,
    Menu,
    UserCog,
    X,
    Phone,
    Mail,
    Hash,
    AlertCircle,
    Loader2,
    Package,
    ClipboardList
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DashboardLayoutProps {
    children: ReactNode;
}

interface AdminData {
    name: string;
    email: string;
    role: 'admin' | 'super_admin';
}

interface SearchResult {
    type: 'order' | 'customer';
    id: string;
    title: string;
    subtitle: string;
    status?: string;
    data: Record<string, unknown>;
}

// Navigation items - different based on role
const getNavItems = (role: string) => {
    const baseItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/restaurants', icon: Store, label: 'Restaurants' },
        { href: '/dashboard/onboarding', icon: ClipboardList, label: 'Onboarding' },
        { href: '/dashboard/customers', icon: Users, label: 'Customers' },
    ];

    // Only super_admin can manage admins
    if (role === 'super_admin') {
        baseItems.push({ href: '/dashboard/admins', icon: UserCog, label: 'Manage Admins' });
    }

    return baseItems;
};


export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const [admin, setAdmin] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    // Search effect with debounce
    useEffect(() => {
        if (searchQuery.length < 3) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async (query: string) => {
        setSearchLoading(true);
        try {
            const results: SearchResult[] = [];

            // Search orders by ID (partial match)
            const { data: orders } = await supabase
                .from('orders')
                .select('*, customers(name, email, phone)')
                .or(`id.ilike.%${query}%`)
                .limit(5);

            if (orders) {
                orders.forEach(order => {
                    results.push({
                        type: 'order',
                        id: order.id,
                        title: `Order #${order.id.substring(0, 8)}...`,
                        subtitle: order.customers?.name || 'Unknown Customer',
                        status: order.status,
                        data: order,
                    });
                });
            }

            // Search customers by email or phone
            const { data: customers } = await supabase
                .from('customers')
                .select('*')
                .or(`email.ilike.%${query}%,phone.ilike.%${query}%,name.ilike.%${query}%`)
                .limit(5);

            if (customers) {
                customers.forEach(customer => {
                    results.push({
                        type: 'customer',
                        id: customer.id,
                        title: customer.name || 'No Name',
                        subtitle: customer.email || customer.phone || '',
                        data: customer,
                    });
                });
            }

            setSearchResults(results);
            setShowSearchResults(results.length > 0);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    const checkAuth = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/');
                return;
            }

            const { data: adminData } = await supabase
                .from('admins')
                .select('*')
                .ilike('email', user.email!)
                .eq('is_active', true)
                .single();

            if (!adminData) {
                await supabase.auth.signOut();
                router.push('/');
                return;
            }

            // Check if admin needs to change password
            // Only redirect if explicitly true (not null or false)
            if (adminData.must_change_password === true) {
                router.push('/change-password');
                return;
            }

            setAdmin(adminData);
        } catch {
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleResultClick = (result: SearchResult) => {
        setSelectedResult(result);
        setShowSearchResults(false);
        setSearchQuery("");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    const navItems = getNavItems(admin?.role || 'admin');

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-white">Latebites</h1>
                                <p className="text-xs text-zinc-500">Admin Portal</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info */}
                    <div className="p-4 border-t border-zinc-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium">{admin?.name?.[0] || 'A'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{admin?.name}</p>
                                <p className="text-xs text-amber-500 truncate capitalize">{admin?.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar with Search */}
                <header className="bg-zinc-900/50 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Universal Search */}
                    <div className="flex-1 max-w-xl mx-auto lg:mx-0 lg:ml-0 relative">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by order ID, email, or phone..."
                                className="w-full pl-12 pr-10 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                            />
                            {searchLoading && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 animate-spin" />
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-80 overflow-auto">
                                {searchResults.map((result) => (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleResultClick(result)}
                                        className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors flex items-start gap-3 border-b border-zinc-800 last:border-b-0"
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${result.type === 'order' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                                            }`}>
                                            {result.type === 'order' ? (
                                                <Package className="w-5 h-5 text-blue-500" />
                                            ) : (
                                                <Users className="w-5 h-5 text-emerald-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{result.title}</p>
                                            <p className="text-zinc-500 text-sm truncate">{result.subtitle}</p>
                                        </div>
                                        {result.status && (
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${result.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                result.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-zinc-500/10 text-zinc-500'
                                                }`}>
                                                {result.status}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>

            {/* Search Result Detail Modal */}
            <AnimatePresence>
                {selectedResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedResult(null)}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[80vh] overflow-auto"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedResult.type === 'order' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                                        }`}>
                                        {selectedResult.type === 'order' ? (
                                            <Package className="w-6 h-6 text-blue-500" />
                                        ) : (
                                            <Users className="w-6 h-6 text-emerald-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{selectedResult.title}</h3>
                                        <p className="text-sm text-zinc-500">{selectedResult.type === 'order' ? 'Order Details' : 'Customer Details'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedResult(null)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-4">
                                {selectedResult.type === 'order' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Order ID</p>
                                                <p className="text-white font-mono text-sm">{selectedResult.id}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Status</p>
                                                <p className={`font-medium ${selectedResult.status === 'completed' ? 'text-emerald-500' :
                                                    selectedResult.status === 'pending' ? 'text-yellow-500' : 'text-zinc-400'
                                                    }`}>{selectedResult.status}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Customer</p>
                                            <p className="text-white">{(selectedResult.data as Record<string, { name?: string }>).customers?.name || 'Unknown'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Total Amount</p>
                                                <p className="text-white">₹{String(selectedResult.data.total_amount || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Pickup OTP</p>
                                                <p className="text-amber-500 font-mono text-lg">{String(selectedResult.data.pickup_otp) || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Name</p>
                                            <p className="text-white">{String(selectedResult.data.name) || 'Not provided'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-zinc-500" />
                                            <p className="text-white">{String(selectedResult.data.email) || 'Not provided'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-zinc-500" />
                                            <p className="text-white">{String(selectedResult.data.phone) || 'Not provided'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Customer ID</p>
                                            <p className="text-zinc-400 font-mono text-sm">{selectedResult.id}</p>
                                        </div>
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
