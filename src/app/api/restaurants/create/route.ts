import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, SENDERS } from '@/lib/email';
import { getCredentialsEmail } from '@/lib/email-templates';

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
            onboardingId,
            restaurantName,
            ownerName,
            email,
            phone,
            city,
            menuImageUrl,
            location,
            verification,
        } = body;

        // Validate required fields
        if (!restaurantName || !ownerName || !email || !phone) {
            return NextResponse.json(
                { error: 'Required fields missing' },
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

        // Get admin details
        const { data: adminData } = await supabase
            .from('admins')
            .select('id, name, email')
            .ilike('email', user.email || '')
            .eq('is_active', true)
            .single();

        if (!adminData) {
            return NextResponse.json(
                { error: 'Admin privileges required' },
                { status: 403 }
            );
        }

        // Check if email already has auth user
        const adminClient = createAdminClient();

        // First check if user already exists in auth
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (existingUser) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 400 }
            );
        }

        // Generate temporary password
        const tempPassword = generateTempPassword();

        // Create auth user with admin client (service role)
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
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

        // Insert into restaurants table
        const { data: restaurantData, error: insertError } = await adminClient
            .from('restaurants')
            .insert({
                id: authData.user.id, // Link to auth user
                name: restaurantName,
                owner_name: ownerName,
                email: email,
                phone: phone,
                address_line1: location?.address || '',
                city: city || location?.city || 'Coimbatore',
                state: location?.state || 'Tamil Nadu',
                pincode: location?.pincode || '',
                latitude: location?.latitude || 11.0168,
                longitude: location?.longitude || 76.9558,
                verified: true,
                is_active: true,
                must_change_password: true,
                menu_image_url: menuImageUrl || null,
                // Verification tracking
                onboarded_by: adminData.id,
                onboarded_by_name: adminData.name,
                onboarded_by_email: adminData.email,
                onboarded_at: new Date().toISOString(),
                location_confirmed: verification?.locationConfirmed || false,
                quality_checked: verification?.qualityChecked || false,
                explanation_provided: verification?.explanationProvided || false,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Restaurant insert error:', insertError);
            // Try to delete the auth user if restaurant creation fails
            await adminClient.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json(
                { error: insertError.message || 'Failed to create restaurant record' },
                { status: 500 }
            );
        }

        // Delete from onboarding table after successful restaurant creation
        if (onboardingId) {
            const { error: deleteError } = await adminClient
                .from('Resturant Onboarding')
                .delete()
                .eq('id', onboardingId);

            if (deleteError) {
                console.error('Delete from onboarding error:', deleteError);
                // Don't fail the operation, just log it
            }
        }

        // Send credentials email to restaurant
        const emailResult = await sendEmail({
            to: [{ email: email, name: ownerName }],
            from: SENDERS.onboarding,
            subject: '🔐 Your Latebites Restaurant Portal Login Credentials',
            htmlBody: getCredentialsEmail(restaurantName, ownerName, email, tempPassword),
        });

        if (!emailResult.success) {
            console.error('Failed to send credentials email:', emailResult.error);
        }

        return NextResponse.json({
            success: true,
            restaurantId: restaurantData.id,
            restaurantName: restaurantName,
            email: email,
            temporaryPassword: tempPassword,
            verifiedBy: adminData.name,
            emailSent: emailResult.success,
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
