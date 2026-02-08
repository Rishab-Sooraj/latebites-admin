import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const customerId = resolvedParams.id;

        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id,
                status,
                total_price,
                quantity,
                pickup_otp,
                created_at,
                pickup_time,
                rescue_bag_id,
                restaurant_id,
                payment_method,
                payment_status,
                razorpay_payment_id,
                refund_status,
                refund_amount
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching customer orders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch related data for each order
        const enrichedOrders = await Promise.all(
            (orders || []).map(async (order: any) => {
                // Fetch rescue bag with full details
                const { data: rescueBag } = await supabase
                    .from('rescue_bags')
                    .select('id, title, description, original_price, discounted_price, pickup_start_time, pickup_end_time')
                    .eq('id', order.rescue_bag_id)
                    .single();

                // Fetch restaurant with address
                const { data: restaurant } = await supabase
                    .from('restaurants')
                    .select('id, name, address')
                    .eq('id', order.restaurant_id)
                    .single();

                return {
                    id: order.id,
                    customer_id: customerId,
                    restaurant_id: order.restaurant_id,
                    status: order.status,
                    total_amount: order.total_price,
                    quantity: order.quantity || 1,
                    pickup_otp: order.pickup_otp,
                    created_at: order.created_at,
                    updated_at: order.created_at,
                    payment_method: order.payment_method,
                    payment_status: order.payment_status,
                    razorpay_payment_id: order.razorpay_payment_id,
                    refund_status: order.refund_status,
                    refund_amount: order.refund_amount,
                    rescue_bags: rescueBag ? {
                        id: rescueBag.id,
                        title: rescueBag.title,
                        description: rescueBag.description,
                        original_price: rescueBag.original_price,
                        discounted_price: rescueBag.discounted_price,
                        pickup_start_time: rescueBag.pickup_start_time,
                        pickup_end_time: rescueBag.pickup_end_time
                    } : null,
                    restaurant_onboarding: restaurant ? {
                        id: restaurant.id,
                        name: restaurant.name,
                        address: restaurant.address
                    } : null
                };
            })
        );

        return NextResponse.json(enrichedOrders);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
