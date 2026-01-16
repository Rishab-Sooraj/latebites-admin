"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Store, Mail, Phone, Copy, Check, ArrowLeft, Loader2, AlertCircle, MapPin, CheckCircle, Key, Upload, Image as ImageIcon, X, FileCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LocationPicker from "@/components/LocationPicker";

interface ApprovedRestaurant {
    id: string;
    restaurant_name: string;
    contact_person: string;
    email: string;
    phone_number: string;
    city: string;
    status: string;
    created_at: string;
    credentials_created?: boolean;
}

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

interface VerificationState {
    menuImage: File | null;
    menuImagePreview: string | null;
    location: LocationData | null;
    locationConfirmed: boolean;
    qualityChecked: boolean;
    explanationProvided: boolean;
}

export default function NewRestaurantPage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [approvedRestaurants, setApprovedRestaurants] = useState<ApprovedRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRestaurant, setSelectedRestaurant] = useState<ApprovedRestaurant | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

    // Verification state
    const [verification, setVerification] = useState<VerificationState>({
        menuImage: null,
        menuImagePreview: null,
        location: null,
        locationConfirmed: false,
        qualityChecked: false,
        explanationProvided: false,
    });

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        fetchApprovedRestaurants();
    }, []);

    const fetchApprovedRestaurants = async () => {
        try {
            const { data, error } = await supabase
                .from('Resturant Onboarding')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Filter out ones that already have credentials
            const withoutCredentials = (data || []).filter(r => !r.credentials_created);
            setApprovedRestaurants(withoutCredentials);
        } catch (error) {
            console.error('Error fetching approved restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setToast({ message: 'Image size must be less than 5MB', type: 'error' });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setVerification(prev => ({
                    ...prev,
                    menuImage: file,
                    menuImagePreview: reader.result as string,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setVerification(prev => ({
            ...prev,
            menuImage: null,
            menuImagePreview: null,
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleLocationSelect = (location: LocationData | null) => {
        setVerification(prev => ({
            ...prev,
            location,
            locationConfirmed: location !== null,
        }));
    };

    const isVerificationComplete = () => {
        return (
            verification.menuImage !== null &&
            verification.location !== null &&
            verification.locationConfirmed &&
            verification.qualityChecked &&
            verification.explanationProvided
        );
    };

    const handleCreateCredentials = async () => {
        if (!selectedRestaurant || !isVerificationComplete()) return;

        setCreating(true);
        setError(null);

        try {
            // First upload the menu image if present
            let menuImageUrl = null;
            if (verification.menuImage) {
                const fileName = `menu_${selectedRestaurant.id}_${Date.now()}.${verification.menuImage.name.split('.').pop()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('restaurant-menus')
                    .upload(fileName, verification.menuImage);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    setToast({ message: `Menu upload failed: ${uploadError.message}. Continuing without image.`, type: 'warning' });
                } else {
                    const { data: urlData } = supabase.storage
                        .from('restaurant-menus')
                        .getPublicUrl(fileName);
                    menuImageUrl = urlData?.publicUrl;
                    console.log('Menu image URL:', menuImageUrl);
                }
            }

            const response = await fetch('/api/restaurants/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    onboardingId: selectedRestaurant.id,
                    restaurantName: selectedRestaurant.restaurant_name,
                    ownerName: selectedRestaurant.contact_person,
                    email: selectedRestaurant.email,
                    phone: selectedRestaurant.phone_number,
                    city: selectedRestaurant.city,
                    menuImageUrl,
                    location: verification.location,
                    verification: {
                        locationConfirmed: verification.locationConfirmed,
                        qualityChecked: verification.qualityChecked,
                        explanationProvided: verification.explanationProvided,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create credentials');
            }

            // Show feedback based on email status
            if (data.emailSent) {
                setToast({ message: 'Credentials created and emailed to restaurant! 📧', type: 'success' });
            } else {
                setToast({ message: 'Credentials created, but email failed to send. Warnings logged. ⚠️', type: 'warning' });
            }

            setCredentials({
                email: data.email,
                password: data.temporaryPassword,
                restaurantName: data.restaurantName,
            });

            // Refresh the list
            await fetchApprovedRestaurants();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const copyCredentials = () => {
        if (!credentials) return;

        const text = `Restaurant: ${credentials.restaurantName}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.password}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setToast({ message: 'Credentials copied to clipboard', type: 'success' });
        setTimeout(() => setCopied(false), 2000);
    };

    const resetAndSelectAnother = () => {
        setCredentials(null);
        setSelectedRestaurant(null);
        setError(null);
        setVerification({
            menuImage: null,
            menuImagePreview: null,
            location: null,
            locationConfirmed: false,
            qualityChecked: false,
            explanationProvided: false,
        });
    };

    // Success state - show credentials
    if (credentials) {
        return (
            <div className="max-w-2xl mx-auto relative">
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

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-serif text-white mb-2">Credentials Created!</h2>
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
                        <button
                            onClick={resetAndSelectAnother}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                        >
                            Create Another
                        </button>
                    </div>

                    <Link
                        href="/dashboard/restaurants"
                        className="inline-block mt-4 text-zinc-400 hover:text-white text-sm"
                    >
                        ← Back to Restaurants
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-32 relative">
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
            <div className="mb-8">
                <Link
                    href="/dashboard/restaurants"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Restaurants
                </Link>
                <h1 className="text-3xl font-serif text-white">Add Restaurant</h1>
                <p className="text-zinc-500 mt-1">Complete verification to generate login credentials</p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Step 1: Select Restaurant */}
            <div className="mb-8">
                <h2 className="text-lg font-medium text-white mb-4">1. Select Restaurant</h2>
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-pulse">
                                <div className="h-6 w-1/3 bg-zinc-800 rounded mb-2" />
                                <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                            </div>
                        ))}
                    </div>
                ) : approvedRestaurants.length > 0 ? (
                    <div className="space-y-3">
                        {approvedRestaurants.map((restaurant) => (
                            <motion.div
                                key={restaurant.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-zinc-900/50 border rounded-xl p-4 cursor-pointer transition-all ${selectedRestaurant?.id === restaurant.id
                                    ? 'border-amber-500 ring-1 ring-amber-500/20'
                                    : 'border-zinc-800 hover:border-zinc-700'
                                    }`}
                                onClick={() => {
                                    setSelectedRestaurant(restaurant);
                                    setVerification({
                                        menuImage: null,
                                        menuImagePreview: null,
                                        location: null,
                                        locationConfirmed: false,
                                        qualityChecked: false,
                                        explanationProvided: false,
                                    });
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                            <Store className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{restaurant.restaurant_name}</h3>
                                            <p className="text-sm text-zinc-500">{restaurant.contact_person} • {restaurant.city}</p>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRestaurant?.id === restaurant.id
                                        ? 'border-amber-500 bg-amber-500'
                                        : 'border-zinc-600'
                                        }`}>
                                        {selectedRestaurant?.id === restaurant.id && (
                                            <Check className="w-3 h-3 text-black" />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
                        <Store className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-400">No approved restaurants waiting for credentials</p>
                        <Link href="/dashboard/onboarding" className="text-amber-500 hover:text-amber-400 text-sm mt-2 inline-block">
                            Go to Onboarding →
                        </Link>
                    </div>
                )}
            </div>

            {/* Verification Section - Only show when restaurant is selected */}
            <AnimatePresence>
                {selectedRestaurant && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6"
                    >
                        {/* Step 2: Upload Menu Image */}
                        <div>
                            <h2 className="text-lg font-medium text-white mb-4">2. Upload Menu Image</h2>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                {verification.menuImagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={verification.menuImagePreview}
                                            alt="Menu preview"
                                            className="w-full max-h-64 object-contain rounded-lg"
                                        />
                                        <button
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                        <div className="mt-3 flex items-center gap-2 text-emerald-500 text-sm">
                                            <CheckCircle className="w-4 h-4" />
                                            Menu image uploaded
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center cursor-pointer py-8 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors">
                                        <Upload className="w-10 h-10 text-zinc-500 mb-3" />
                                        <p className="text-white font-medium">Upload Menu Image</p>
                                        <p className="text-zinc-500 text-sm mt-1">PNG, JPG up to 5MB</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Step 3: Select Location */}
                        <div>
                            <h2 className="text-lg font-medium text-white mb-4">3. Set Restaurant Location</h2>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                <LocationPicker onLocationSelect={handleLocationSelect} />

                                {verification.location && (
                                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-emerald-500 font-medium text-sm">✓ Location Set (Coimbatore)</p>
                                                <p className="text-zinc-300 text-sm mt-1">{verification.location.address}</p>
                                                <p className="text-zinc-500 text-xs mt-1">
                                                    {verification.location.city}, {verification.location.state} - {verification.location.pincode}
                                                </p>
                                                <p className="text-zinc-600 text-xs mt-1">
                                                    Lat: {verification.location.latitude.toFixed(6)}, Lng: {verification.location.longitude.toFixed(6)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 4: Verification Checklist */}
                        <div>
                            <h2 className="text-lg font-medium text-white mb-4">4. Verification Checklist</h2>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                                {/* Location Confirmation is auto-checked when location is selected */}
                                <div className={`flex items-start gap-4 p-4 rounded-lg ${verification.location ? 'bg-emerald-500/10' : 'bg-zinc-800/50'}`}>
                                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center ${verification.location ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
                                        {verification.location && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-amber-500" />
                                            Location Confirmed
                                        </p>
                                        <p className="text-zinc-400 text-sm mt-1">
                                            {verification.location ? 'Restaurant location verified in Coimbatore' : 'Select location above to confirm'}
                                        </p>
                                    </div>
                                </div>

                                {/* Quality Check */}
                                <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800/70 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={verification.qualityChecked}
                                        onChange={(e) => setVerification(prev => ({ ...prev, qualityChecked: e.target.checked }))}
                                        className="w-5 h-5 mt-0.5 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                                    />
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            Quality Check
                                        </p>
                                        <p className="text-zinc-400 text-sm mt-1">
                                            I confirm that the restaurant meets our quality standards for food safety and hygiene.
                                        </p>
                                    </div>
                                </label>

                                {/* Explanation Provided */}
                                <label className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800/70 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={verification.explanationProvided}
                                        onChange={(e) => setVerification(prev => ({ ...prev, explanationProvided: e.target.checked }))}
                                        className="w-5 h-5 mt-0.5 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                                    />
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <FileCheck className="w-4 h-4 text-blue-500" />
                                            Terms Explained
                                        </p>
                                        <p className="text-zinc-400 text-sm mt-1">
                                            I confirm that I have explained how Latebites works to the restaurant owner.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">{selectedRestaurant.restaurant_name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                {verification.menuImage && <span className="text-emerald-500 text-xs">✓ Menu</span>}
                                                {verification.location && <span className="text-emerald-500 text-xs">✓ Location</span>}
                                                {verification.qualityChecked && <span className="text-emerald-500 text-xs">✓ Quality</span>}
                                                {verification.explanationProvided && <span className="text-emerald-500 text-xs">✓ Terms</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCreateCredentials}
                                            disabled={creating || !isVerificationComplete()}
                                            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {creating ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Key className="w-5 h-5" />
                                                    Generate Credentials
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {!isVerificationComplete() && (
                                        <p className="text-amber-500/70 text-xs mt-3">
                                            Complete all verification steps to generate credentials
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
