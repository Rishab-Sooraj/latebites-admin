import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminId, freeze } = body;

        if (!adminId || freeze === undefined) {
            return NextResponse.json(
                { error: 'Admin ID and freeze status are required' },
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
            .eq('email', user.email)
            .single();

        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Only super admins can freeze accounts.' },
                { status: 403 }
            );
        }

        // Verify target admin exists and is not a super_admin
        const { data: targetAdmin } = await supabase
            .from('admins')
            .select('id, role, email')
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
                { error: 'Cannot freeze a super admin account' },
                { status: 403 }
            );
        }

        // Use admin client to bypass RLS
        const adminClient = createAdminClient();

        // Call RPC function to freeze/unfreeze
        const { error: rpcError } = await adminClient.rpc('freeze_admin', {
            target_admin_id: adminId,
            freeze: freeze,
            freezer_admin_id: currentAdmin.id
        });

        if (rpcError) {
            console.error('Freeze RPC error:', rpcError);
            // Fallback to direct update
            const updateData = freeze
                ? { frozen_at: new Date().toISOString(), frozen_by: currentAdmin.id, is_active: false }
                : { frozen_at: null, frozen_by: null, is_active: true };

            const { error: updateError } = await adminClient
                .from('admins')
                .update(updateData)
                .eq('id', adminId);

            if (updateError) {
                console.error('Direct update error:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update admin status' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: freeze ? 'Admin account frozen' : 'Admin account unfrozen',
            adminId,
            frozen: freeze
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
