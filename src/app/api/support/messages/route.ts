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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { conversation_id, sender_id, message } = body;

        if (!conversation_id || !sender_id || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Insert message
        const { data, error } = await supabase
            .from('support_messages')
            .insert({
                conversation_id,
                sender_type: 'admin',
                sender_id,
                message,
                read_by_recipient: false,
            })
            .select()
            .single();

        if (error) {
            console.error('Error inserting message:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update conversation status to in_progress if it's open
        const { data: conversation } = await supabase
            .from('support_conversations')
            .select('status')
            .eq('id', conversation_id)
            .single();

        if (conversation?.status === 'open') {
            await supabase
                .from('support_conversations')
                .update({
                    status: 'in_progress',
                    admin_id: sender_id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', conversation_id);
        } else {
            // Just update the timestamp
            await supabase
                .from('support_conversations')
                .update({
                    admin_id: sender_id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', conversation_id);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversation_id');

        if (!conversationId) {
            return NextResponse.json(
                { error: 'conversation_id is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
