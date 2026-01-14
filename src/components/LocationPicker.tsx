"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, AlertCircle, Check } from "lucide-react";

interface LocationPickerProps {
    onLocationSelect: (location: {
        address: string;
        city: string;
        state: string;
        pincode: string;
        latitude: number;
        longitude: number;
    } | null) => void;
    initialAddress?: string;
}

// Coimbatore bounding box (approximate)
const COIMBATORE_BOUNDS = {
    north: 11.15,
    south: 10.85,
    east: 77.15,
    west: 76.85,
};

declare global {
    interface Window {
        google: typeof google;
        initGoogleMapsCallback: () => void;
    }
}

export default function LocationPicker({ onLocationSelect, initialAddress }: LocationPickerProps) {
    const [address, setAddress] = useState(initialAddress || "");
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load Google Maps script
        if (window.google && window.google.maps) {
            initServices();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            initServices();
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, []);

    const initServices = () => {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
        setMapsLoaded(true);
    };

    // Check if coordinates are within Coimbatore
    const isInCoimbatore = (lat: number, lng: number): boolean => {
        return (
            lat >= COIMBATORE_BOUNDS.south &&
            lat <= COIMBATORE_BOUNDS.north &&
            lng >= COIMBATORE_BOUNDS.west &&
            lng <= COIMBATORE_BOUNDS.east
        );
    };

    const handleInputChange = useCallback((value: string) => {
        setAddress(value);
        setIsValid(false);
        setError(null);
        onLocationSelect(null); // Clear selection when typing

        if (!autocompleteService.current || value.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Restrict to Coimbatore area
        autocompleteService.current.getPlacePredictions(
            {
                input: value + " Coimbatore", // Bias towards Coimbatore
                componentRestrictions: { country: 'in' },
                types: ['establishment', 'geocode'],
                locationBias: {
                    center: { lat: 11.0168, lng: 76.9558 }, // Coimbatore center
                    radius: 30000, // 30km radius
                } as google.maps.places.LocationBias,
            },
            (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    // Filter predictions that mention Coimbatore
                    const coimbatorePredictions = predictions.filter(p =>
                        p.description.toLowerCase().includes('coimbatore') ||
                        p.structured_formatting.secondary_text?.toLowerCase().includes('coimbatore')
                    );
                    setSuggestions(coimbatorePredictions);
                    setShowSuggestions(coimbatorePredictions.length > 0);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            }
        );
    }, [onLocationSelect]);

    const handleSelectPlace = (placeId: string, description: string) => {
        setLoading(true);
        setShowSuggestions(false);
        setAddress(description);
        setError(null);

        if (!placesService.current) {
            setLoading(false);
            return;
        }

        placesService.current.getDetails(
            {
                placeId,
                fields: ['formatted_address', 'geometry', 'address_components'],
            },
            (place, status) => {
                setLoading(false);

                if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    const lat = place.geometry?.location?.lat() || 0;
                    const lng = place.geometry?.location?.lng() || 0;

                    // Verify the location is in Coimbatore
                    if (!isInCoimbatore(lat, lng)) {
                        setError("This location is outside Coimbatore. Please select an address within Coimbatore city.");
                        setIsValid(false);
                        onLocationSelect(null);
                        return;
                    }

                    let city = '';
                    let state = '';
                    let pincode = '';

                    place.address_components?.forEach(component => {
                        if (component.types.includes('locality')) {
                            city = component.long_name;
                        }
                        if (component.types.includes('administrative_area_level_1')) {
                            state = component.long_name;
                        }
                        if (component.types.includes('postal_code')) {
                            pincode = component.long_name;
                        }
                    });

                    // Verify city is Coimbatore
                    if (city.toLowerCase() !== 'coimbatore') {
                        setError("Only addresses within Coimbatore city are allowed.");
                        setIsValid(false);
                        onLocationSelect(null);
                        return;
                    }

                    setIsValid(true);
                    setError(null);

                    onLocationSelect({
                        address: place.formatted_address || description,
                        city: city || 'Coimbatore',
                        state: state || 'Tamil Nadu',
                        pincode: pincode || '641001',
                        latitude: lat,
                        longitude: lng,
                    });
                }
            }
        );
    };

    return (
        <div className="relative">
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                    Restaurant Address <span className="text-amber-500">(Coimbatore only)</span>
                </label>
                <div className="relative">
                    <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isValid ? 'text-emerald-500' : 'text-zinc-500'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={address}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        placeholder={mapsLoaded ? "Search for restaurant in Coimbatore..." : "Loading Google Maps..."}
                        disabled={!mapsLoaded}
                        className={`w-full pl-12 pr-10 py-4 bg-zinc-800/50 border rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors disabled:opacity-50 ${isValid
                                ? 'border-emerald-500 bg-emerald-500/5'
                                : error
                                    ? 'border-red-500 bg-red-500/5'
                                    : 'border-zinc-700 focus:border-amber-500/50'
                            }`}
                    />
                    {loading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 animate-spin" />
                    )}
                    {isValid && !loading && (
                        <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-auto">
                    {suggestions.map((suggestion) => (
                        <button
                            key={suggestion.place_id}
                            type="button"
                            onClick={() => handleSelectPlace(suggestion.place_id, suggestion.description)}
                            className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors flex items-start gap-3 border-b border-zinc-800 last:border-b-0"
                        >
                            <MapPin className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-white text-sm">{suggestion.structured_formatting.main_text}</p>
                                <p className="text-zinc-500 text-xs">{suggestion.structured_formatting.secondary_text}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
