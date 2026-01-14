import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current and new passwords are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'New password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Get current user
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Verify admin exists
        const { data: adminData } = await supabase
            .from('admins')
            .select('id, email')
            .ilike('email', user.email!)
            .single();

        if (!adminData) {
            return NextResponse.json(
                { error: 'Admin not found' },
                { status: 404 }
            );
        }

        // Use admin client to verify current password and update
        const adminClient = createAdminClient();

        // Verify current password by trying to sign in
        const { error: signInError } = await adminClient.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
        });

        if (signInError) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 400 }
            );
        }

        // Update the password using admin client
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) {
            console.error('Password update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update password' },
                { status: 500 }
            );
        }

        // Update must_change_password flag using admin client (bypasses RLS)
        // Use direct update with case-insensitive email matching
        const { error: dbError } = await adminClient
            .from('admins')
            .update({
                must_change_password: false,
                updated_at: new Date().toISOString()
            })
            .ilike('email', user.email!);

        if (dbError) {
            console.error('DB update error:', dbError);
            // Even if flag update fails, password was changed successfully
            // Just log the error
        } else {
            console.log('Successfully updated must_change_password flag to false for:', user.email);
        }

        // Re-authenticate the user with the new password to maintain session
        const { error: reAuthError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: newPassword,
        });

        if (reAuthError) {
            console.error('Re-authentication error:', reAuthError);
            // Password was changed but session refresh failed
            // User will need to log in again manually
            return NextResponse.json({
                success: true,
                message: 'Password changed successfully. Please log in again.',
                requiresLogin: true,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully',
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
