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
            .eq('email', user.email)
            .single();

        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Only super admins can revoke accounts.' },
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
                { error: 'Cannot revoke a super admin account' },
                { status: 403 }
            );
        }

        // Use admin client to bypass RLS
        const adminClient = createAdminClient();

        // Call RPC function to revoke
        const { error: rpcError } = await adminClient.rpc('revoke_admin', {
            target_admin_id: adminId,
            revoker_admin_id: currentAdmin.id
        });

        if (rpcError) {
            console.error('Revoke RPC error:', rpcError);
            // Fallback to direct update
            const { error: updateError } = await adminClient
                .from('admins')
                .update({
                    revoked_at: new Date().toISOString(),
                    revoked_by: currentAdmin.id,
                    is_active: false
                })
                .eq('id', adminId);

            if (updateError) {
                console.error('Direct update error:', updateError);
                return NextResponse.json(
                    { error: 'Failed to revoke admin' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Admin account permanently revoked',
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
