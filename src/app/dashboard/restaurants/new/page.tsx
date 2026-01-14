"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Store, Mail, Phone, User, Lock, Copy, Check, ArrowLeft, Loader2, AlertCircle, MapPin } from "lucide-react";
import Link from "next/link";
import LocationPicker from "@/components/LocationPicker";

interface CreatedCredentials {
    email: string;
    password: string;
    restaurantName: string;
}

interface LocationData {
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
}

// Validation helpers
const isValidName = (name: string) => name.length >= 2;
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^[+]?[\d\s-]{10,}$/.test(phone);

export default function NewRestaurantPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        restaurantName: "",
        ownerName: "",
        email: "",
        phone: "",
    });
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
    const [copied, setCopied] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationSelect = (locationData: LocationData | null) => {
        setLocation(locationData);
    };

    // Get validation state for each field
    const getFieldValidation = (field: string) => {
        switch (field) {
            case 'restaurantName':
                return isValidName(formData.restaurantName);
            case 'ownerName':
                return isValidName(formData.ownerName);
            case 'email':
                return isValidEmail(formData.email);
            case 'phone':
                return isValidPhone(formData.phone);
            default:
                return false;
        }
    };

    // Get input class based on validation
    const getInputClass = (field: string) => {
        const value = formData[field as keyof typeof formData];
        const isValid = getFieldValidation(field);

        if (!value) {
            return 'border-zinc-700 focus:border-amber-500/50';
        }

        return isValid
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-zinc-700 focus:border-amber-500/50';
    };

    // Get icon class based on validation
    const getIconClass = (field: string) => {
        const value = formData[field as keyof typeof formData];
        const isValid = getFieldValidation(field);

        return value && isValid ? 'text-emerald-500' : 'text-zinc-500';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!location) {
            setError('Please select a restaurant location in Coimbatore');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/restaurants/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    address: location.address,
                    city: location.city,
                    state: location.state,
                    pincode: location.pincode,
                    latitude: location.latitude,
                    longitude: location.longitude,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create restaurant');
            }

            setCredentials({
                email: data.email,
                password: data.temporaryPassword,
                restaurantName: data.restaurantName,
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const copyCredentials = () => {
        if (!credentials) return;

        const text = `Restaurant: ${credentials.restaurantName}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Success state - show credentials
    if (credentials) {
        return (
            <div className="max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-serif text-white mb-2">Restaurant Created!</h2>
                    <p className="text-zinc-400 mb-8">Share these credentials with the restaurant owner</p>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-left mb-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Restaurant</p>
                                <p className="text-white font-medium">{credentials.restaurantName}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Email</p>
                                <p className="text-white font-mono">{credentials.email}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Temporary Password</p>
                                <p className="text-amber-500 font-mono text-lg">{credentials.password}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={copyCredentials}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                        >
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            {copied ? 'Copied!' : 'Copy Credentials'}
                        </button>
                        <Link
                            href="/dashboard/restaurants"
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                        >
                            View All Restaurants
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/restaurants"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Restaurants
                </Link>
                <h1 className="text-3xl font-serif text-white">Add New Restaurant</h1>
                <p className="text-zinc-500 mt-1">Create login credentials for a new restaurant partner in Coimbatore</p>
            </div>

            {/* Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500">Restaurant Name</label>
                            <div className="relative">
                                <Store className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${getIconClass('restaurantName')}`} />
                                <input
                                    type="text"
                                    name="restaurantName"
                                    value={formData.restaurantName}
                                    onChange={handleChange}
                                    placeholder="Spice Garden"
                                    required
                                    className={`w-full pl-12 pr-10 py-4 bg-zinc-800/50 border rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors ${getInputClass('restaurantName')}`}
                                />
                                {getFieldValidation('restaurantName') && (
                                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500">Owner Name</label>
                            <div className="relative">
                                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${getIconClass('ownerName')}`} />
                                <input
                                    type="text"
                                    name="ownerName"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    placeholder="Rajan Kumar"
                                    required
                                    className={`w-full pl-12 pr-10 py-4 bg-zinc-800/50 border rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors ${getInputClass('ownerName')}`}
                                />
                                {getFieldValidation('ownerName') && (
                                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500">Email</label>
                            <div className="relative">
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${getIconClass('email')}`} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="restaurant@example.com"
                                    required
                                    className={`w-full pl-12 pr-10 py-4 bg-zinc-800/50 border rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors ${getInputClass('email')}`}
                                />
                                {getFieldValidation('email') && (
                                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-zinc-500">Phone</label>
                            <div className="relative">
                                <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${getIconClass('phone')}`} />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+91 9876543210"
                                    required
                                    className={`w-full pl-12 pr-10 py-4 bg-zinc-800/50 border rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors ${getInputClass('phone')}`}
                                />
                                {getFieldValidation('phone') && (
                                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Location Picker */}
                    <div className="pt-2">
                        <LocationPicker onLocationSelect={handleLocationSelect} />

                        {/* Selected Location Display */}
                        {location && (
                            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-emerald-500 font-medium text-sm">✓ Location Selected (Coimbatore)</p>
                                        <p className="text-zinc-300 text-sm mt-1">{location.address}</p>
                                        <p className="text-zinc-500 text-xs mt-1">
                                            {location.city}, {location.state} - {location.pincode}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-500 font-medium text-sm">Temporary Password</p>
                                <p className="text-zinc-400 text-sm mt-1">
                                    A secure temporary password will be auto-generated. The restaurant will be required to change it on first login.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !location}
                        className="w-full py-4 bg-amber-500 text-black font-medium uppercase tracking-widest text-sm rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating Account...
                            </>
                        ) : (
                            'Create Restaurant Account'
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
