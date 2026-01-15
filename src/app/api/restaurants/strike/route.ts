import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, SENDERS } from '@/lib/email';
import { getStrikeEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { restaurantId, reason } = body;

        if (!restaurantId || !reason) {
            return NextResponse.json(
                { error: 'Restaurant ID and reason are required' },
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

        // Get admin details including role
        const { data: adminData } = await supabase
            .from('admins')
            .select('id, name, email, role')
            .ilike('email', user.email || '')
            .eq('is_active', true)
            .single();

        if (!adminData) {
            return NextResponse.json(
                { error: 'Admin privileges required' },
                { status: 403 }
            );
        }

        const adminClient = createAdminClient();

        // Get current restaurant details
        const { data: restaurant, error: fetchError } = await adminClient
            .from('restaurants')
            .select('id, name, email, owner_name, strike_count, is_active')
            .eq('id', restaurantId)
            .single();

        if (fetchError || !restaurant) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        const currentStrikes = restaurant.strike_count || 0;
        const newStrikeCount = currentStrikes + 1;

        // Check permissions: 3rd strike can only be issued by super_admin
        if (newStrikeCount === 3 && adminData.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Only Super Admin can issue the final (3rd) strike' },
                { status: 403 }
            );
        }

        // If already at 3 strikes, no more can be issued
        if (currentStrikes >= 3) {
            return NextResponse.json(
                { error: 'Restaurant has already received maximum strikes' },
                { status: 400 }
            );
        }

        // Insert strike record
        const { error: strikeError } = await adminClient
            .from('restaurant_strikes')
            .insert({
                restaurant_id: restaurantId,
                strike_number: newStrikeCount,
                reason: reason,
                issued_by: adminData.id,
                issued_by_name: adminData.name,
                issued_by_email: adminData.email,
                issued_by_role: adminData.role,
            });

        if (strikeError) {
            console.error('Strike insert error:', strikeError);
            // Continue even if logging fails
        }

        // Update restaurant strike count
        const updateData: { strike_count: number; is_active?: boolean } = {
            strike_count: newStrikeCount,
        };

        // Deactivate if 3 strikes reached
        if (newStrikeCount >= 3) {
            updateData.is_active = false;
        }

        const { error: updateError } = await adminClient
            .from('restaurants')
            .update(updateData)
            .eq('id', restaurantId);

        if (updateError) {
            console.error('Restaurant update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update restaurant' },
                { status: 500 }
            );
        }

        // Send strike notification email
        if (restaurant.email) {
            const emailResult = await sendEmail({
                to: [{ email: restaurant.email, name: restaurant.owner_name || restaurant.name }],
                from: SENDERS.noreply,
                subject: newStrikeCount >= 3
                    ? `🚫 Account Suspended - ${restaurant.name}`
                    : `⚠️ Strike ${newStrikeCount}/3 Issued - ${restaurant.name}`,
                htmlBody: getStrikeEmail(restaurant.name, restaurant.owner_name || 'Restaurant Owner', newStrikeCount, reason),
            });

            if (!emailResult.success) {
                console.error('Failed to send strike email:', emailResult.error);
            }
        }

        return NextResponse.json({
            success: true,
            strikeCount: newStrikeCount,
            isDeactivated: newStrikeCount >= 3,
            message: newStrikeCount >= 3
                ? 'Final strike issued. Restaurant has been deactivated.'
                : `Strike ${newStrikeCount} issued successfully`,
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch strike history
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'Restaurant ID is required' },
                { status: 400 }
            );
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const adminClient = createAdminClient();

        const { data: strikes, error } = await adminClient
            .from('restaurant_strikes')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Fetch strikes error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch strike history' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            strikes: strikes || [],
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
