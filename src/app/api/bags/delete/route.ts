import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const bagId = searchParams.get('id');

        if (!bagId) {
            return NextResponse.json(
                { error: 'Bag ID is required' },
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
            .select('role')
            .ilike('email', user.email || '')
            .single();

        if (!adminData) {
            return NextResponse.json(
                { error: 'Admin privileges required' },
                { status: 403 }
            );
        }

        // Use Admin Client to bypass RLS
        const adminClient = createAdminClient();

        const { error } = await adminClient
            .from('rescue_bags')
            .delete()
            .eq('id', bagId);

        if (error) {
            console.error('Error deleting bag:', error);
            return NextResponse.json(
                { error: 'Failed to delete bag' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Bag deleted successfully'
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
