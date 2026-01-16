import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, SENDERS } from '@/lib/email';
import { getApprovalEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
    console.log('🚀 Approval API Called');
    console.log('ZEPTOMAIL_API_KEY present:', !!process.env.ZEPTOMAIL_API_KEY);

    try {
        const body = await request.json();
        const { restaurantId, status } = body;

        console.log(`Processing status change: ${restaurantId} -> ${status}`);

        if (!restaurantId || !status) {
            return NextResponse.json(
                { error: 'Restaurant ID and status are required' },
                { status: 400 }
            );
        }

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Status must be approved or rejected' },
                { status: 400 }
            );
        }

        // Check if admin is authenticated
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('Unauthorized access attempt');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user is an admin
        const { data: adminData } = await supabase
            .from('admins')
            .select('id')
            .ilike('email', user.email || '')
            .eq('is_active', true)
            .single();

        if (!adminData) {
            console.warn('User is not an active admin');
            return NextResponse.json(
                { error: 'Admin privileges required' },
                { status: 403 }
            );
        }

        // Use admin client to bypass RLS
        const adminClient = createAdminClient();

        // Get restaurant details before updating
        const { data: restaurant } = await adminClient
            .from('Resturant Onboarding')
            .select('restaurant_name, contact_person, email')
            .eq('id', restaurantId)
            .single();

        console.log('Restaurant details found:', restaurant ? 'Yes' : 'No', restaurant?.email);

        const { error: updateError } = await adminClient
            .from('Resturant Onboarding')
            .update({ status: status })
            .eq('id', restaurantId);

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json(
                { error: updateError.message || 'Failed to update status' },
                { status: 500 }
            );
        }

        // Send approval email if status is approved
        if (status === 'approved' && restaurant) {
            console.log('📧 Attempting to send approval email...');
            const emailResult = await sendEmail({
                to: [{ email: restaurant.email, name: restaurant.contact_person }],
                from: SENDERS.onboarding,
                subject: '🎉 Your Latebites Application Has Been Approved!',
                htmlBody: getApprovalEmail(restaurant.restaurant_name, restaurant.contact_person),
            });

            if (!emailResult.success) {
                console.error('❌ Failed to send approval email:', emailResult.error);
                // Don't fail the request, just log the error
            } else {
                console.log('✅ Approval email sent successfully');
            }
        } else {
            console.log('Skipping email:', { status, hasRestaurant: !!restaurant });
        }

        return NextResponse.json({
            success: true,
            message: `Restaurant ${status} successfully`,
            emailSent: status === 'approved',
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
