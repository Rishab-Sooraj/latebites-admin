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

export async function GET(request: Request) {
    try {
        // Get today's date range (start and end of day in UTC)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                status,
                total_price,
                created_at,
                pickup_time,
                rescue_bag_id,
                customer_id,
                restaurant_id,
                payment_method,
                payment_status,
                razorpay_payment_id,
                refund_status,
                refund_amount
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching orders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch related data for each order
        const enrichedOrders = await Promise.all(
            (data || []).map(async (order: any) => {
                // Fetch rescue bag
                const { data: rescueBag } = await supabase
                    .from('rescue_bags')
                    .select('title, restaurant_id')
                    .eq('id', order.rescue_bag_id)
                    .single();

                // Fetch restaurant
                const { data: restaurant } = await supabase
                    .from('restaurants')
                    .select('name')
                    .eq('id', order.restaurant_id || rescueBag?.restaurant_id)
                    .single();

                // Fetch customer
                const { data: customer } = await supabase
                    .from('customers')
                    .select('name, phone, email')
                    .eq('id', order.customer_id)
                    .single();

                return {
                    id: order.id,
                    bag_title: rescueBag?.title || 'Mystery Bag',
                    restaurant_name: restaurant?.name || 'Restaurant',
                    customer_name: customer?.name || 'Unknown',
                    customer_phone: customer?.phone || '',
                    customer_email: customer?.email || '',
                    status: order.status,
                    total_amount: order.total_price,
                    payment_method: order.payment_method,
                    payment_status: order.payment_status,
                    razorpay_payment_id: order.razorpay_payment_id,
                    refund_status: order.refund_status,
                    refund_amount: order.refund_amount,
                    created_at: order.created_at,
                    pickup_time: order.pickup_time
                };
            })
        );

        return NextResponse.json(enrichedOrders);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
