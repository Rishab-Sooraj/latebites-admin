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

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { conversation_id, status } = body;

        if (!conversation_id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('support_conversations')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversation_id)
            .select()
            .single();

        if (error) {
            console.error('Error updating conversation status:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
