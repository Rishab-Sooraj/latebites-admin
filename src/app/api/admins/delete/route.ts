import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminId } = body;

        if (!adminId) {
            return NextResponse.json(
                { error: 'Admin ID is required' },
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

        // Verify current user is super_admin
        const { data: currentAdmin } = await supabase
            .from('admins')
            .select('id, role')
            .ilike('email', user.email!)
            .single();

        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Only super admins can delete accounts.' },
                { status: 403 }
            );
        }

        // Verify target admin exists and is not a super_admin
        const { data: targetAdmin } = await supabase
            .from('admins')
            .select('id, role, email, user_id')
            .eq('id', adminId)
            .single();

        if (!targetAdmin) {
            return NextResponse.json(
                { error: 'Admin not found' },
                { status: 404 }
            );
        }

        if (targetAdmin.role === 'super_admin') {
            return NextResponse.json(
                { error: 'Cannot delete a super admin account' },
                { status: 403 }
            );
        }

        // Use admin client to bypass RLS
        const adminClient = createAdminClient();

        // Delete from admins table first
        const { error: deleteError } = await adminClient
            .from('admins')
            .delete()
            .eq('id', adminId);

        if (deleteError) {
            console.error('Delete admin error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete admin from database' },
                { status: 500 }
            );
        }

        // Also delete from Supabase auth if user_id exists
        if (targetAdmin.user_id) {
            const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
                targetAdmin.user_id
            );

            if (authDeleteError) {
                console.error('Delete auth user error:', authDeleteError);
                // Don't fail the whole operation, just log it
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Admin account deleted successfully',
            adminId
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
