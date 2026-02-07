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
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // Fetch conversations
        let query = supabase
            .from('support_conversations')
            .select('*')
            .order('updated_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: conversations, error: convError } = await query;

        if (convError) {
            console.error('Error fetching conversations:', convError);
            return NextResponse.json({ error: convError.message }, { status: 500 });
        }

        // Fetch related data for each conversation
        const enrichedConversations = await Promise.all(
            (conversations || []).map(async (conv: any) => {
                // Fetch customer
                const { data: customer } = await supabase
                    .from('customers')
                    .select('name, email, phone')
                    .eq('id', conv.customer_id)
                    .single();

                // Fetch order if exists
                let orderData = null;
                if (conv.order_id) {
                    const { data: order } = await supabase
                        .from('orders')
                        .select('total_price, restaurant_id, rescue_bag_id')
                        .eq('id', conv.order_id)
                        .single();

                    if (order) {
                        // Fetch restaurant
                        const { data: restaurant } = await supabase
                            .from('restaurants')
                            .select('name')
                            .eq('id', order.restaurant_id)
                            .single();

                        // Fetch rescue bag
                        const { data: rescueBag } = await supabase
                            .from('rescue_bags')
                            .select('title')
                            .eq('id', order.rescue_bag_id)
                            .single();

                        orderData = {
                            total_amount: order.total_price || 0,
                            restaurant: { name: restaurant?.name || 'N/A' },
                            rescue_bag: { name: rescueBag?.title || 'Mystery Bag' }
                        };
                    }
                }

                return {
                    ...conv,
                    customer: customer || { name: 'Unknown', email: '', phone: '' },
                    order: orderData || {
                        total_amount: 0,
                        restaurant: { name: 'N/A' },
                        rescue_bag: { name: 'General Support' }
                    }
                };
            })
        );

        return NextResponse.json(enrichedConversations);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { conversation_id, status, admin_id } = body;

        if (!conversation_id || !status) {
            return NextResponse.json(
                { error: 'conversation_id and status are required' },
                { status: 400 }
            );
        }

        const updatePayload: Record<string, any> = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (admin_id) {
            updatePayload.admin_id = admin_id;
        }

        if (status === 'resolved') {
            updatePayload.resolved_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('support_conversations')
            .update(updatePayload)
            .eq('id', conversation_id);

        if (error) {
            console.error('Error updating conversation:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
