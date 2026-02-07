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
        const query = searchParams.get('q');

        if (!query || query.length < 3) {
            return NextResponse.json([]);
        }

        const results: any[] = [];

        // Search orders by ID (partial match)
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*, customers(name, email, phone)')
            .ilike('id', `%${query}%`)
            .limit(5);

        if (ordersError) {
            console.error('Error searching orders:', ordersError);
        }

        if (orders) {
            orders.forEach(order => {
                results.push({
                    type: 'order',
                    id: order.id,
                    title: `Order #${order.id.substring(0, 8)}...`,
                    subtitle: order.customers?.name || 'Unknown Customer',
                    status: order.status,
                    data: order,
                });
            });
        }

        // Search customers by email, phone, or name
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .or(`email.ilike.%${query}%,phone.ilike.%${query}%,name.ilike.%${query}%`)
            .limit(5);

        if (customersError) {
            console.error('Error searching customers:', customersError);
        }

        if (customers) {
            customers.forEach(customer => {
                results.push({
                    type: 'customer',
                    id: customer.id,
                    title: customer.name || 'No Name',
                    subtitle: customer.email || customer.phone || '',
                    data: customer,
                });
            });
        }

        return NextResponse.json(results);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
