import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';

// Generate a secure temporary password
function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const specialChars = '@#$%&*';
    let password = '';

    // Add 8 random alphanumeric characters
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Add a special character
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

    // Add a number
    password += Math.floor(Math.random() * 10);

    return password;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            restaurantName,
            ownerName,
            email,
            phone,
            address,
            city,
            state,
            pincode,
            latitude,
            longitude
        } = body;

        // Validate required fields
        if (!restaurantName || !ownerName || !email || !phone || !address || !city) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Check if admin is authenticated
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user is an admin
        const { data: adminData } = await supabase
            .from('admins')
            .select('id')
            .eq('email', user.email)
            .eq('is_active', true)
            .single();

        if (!adminData) {
            return NextResponse.json(
                { error: 'Admin privileges required' },
                { status: 403 }
            );
        }

        // Check if email already exists
        const { data: existingRestaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('email', email)
            .single();

        if (existingRestaurant) {
            return NextResponse.json(
                { error: 'A restaurant with this email already exists' },
                { status: 400 }
            );
        }

        // Generate temporary password
        const tempPassword = generateTempPassword();

        // Create auth user with admin client (service role)
        const adminClient = createAdminClient();

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                role: 'restaurant',
                restaurant_name: restaurantName,
            },
        });

        if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json(
                { error: authError.message || 'Failed to create user account' },
                { status: 500 }
            );
        }

        // Create restaurant record with location from Google Maps
        // IMPORTANT: Set the restaurant ID to match the auth user ID for login to work
        const { data: restaurantData, error: restaurantError } = await supabase
            .from('restaurants')
            .insert({
                id: authData.user.id, // Link to auth user
                name: restaurantName,
                owner_name: ownerName,
                email: email,
                phone: phone,
                address_line1: address,
                city: city,
                state: state || 'Tamil Nadu',
                pincode: pincode || '000000',
                latitude: latitude || 11.0168,
                longitude: longitude || 76.9558,
                verified: false,
                is_active: false,
                must_change_password: true,
                onboarded_by: adminData.id,
                onboarded_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (restaurantError) {
            console.error('Restaurant error:', restaurantError);
            // Try to delete the auth user if restaurant creation fails
            await adminClient.auth.admin.deleteUser(authData.user.id);

            return NextResponse.json(
                { error: restaurantError.message || 'Failed to create restaurant record' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            restaurantId: restaurantData.id,
            restaurantName: restaurantName,
            email: email,
            temporaryPassword: tempPassword,
            message: 'Restaurant account created successfully',
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
