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
            .eq('email', user.email)
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

        // Update must_change_password flag using raw SQL via admin client (bypasses RLS completely)
        const { error: dbError } = await adminClient.rpc('update_admin_password_flag', {
            admin_email: user.email,
            new_flag_value: false
        });

        // If RPC doesn't exist, try direct update as fallback
        if (dbError && dbError.message.includes('does not exist')) {
            console.log('RPC not found, using direct update...');
            const { error: directError } = await adminClient
                .from('admins')
                .update({ must_change_password: false })
                .eq('email', user.email);

            if (directError) {
                console.error('Direct update also failed:', directError);
            }
        } else if (dbError) {
            console.error('DB update error:', dbError);
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
