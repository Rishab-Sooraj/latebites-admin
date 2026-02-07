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

export async function GET() {
    try {
        // Get total restaurants
        const { count: restaurantsCount } = await supabase
            .from('restaurants')
            .select('*', { count: 'exact', head: true });

        // Get total orders
        const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        // Get total customers
        const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        // Get pending applications (restaurants with is_approved = false)
        const { count: pendingCount } = await supabase
            .from('restaurants')
            .select('*', { count: 'exact', head: true })
            .eq('is_approved', false);

        return NextResponse.json({
            restaurants: restaurantsCount || 0,
            orders: ordersCount || 0,
            customers: customersCount || 0,
            pendingApplications: pendingCount || 0
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
