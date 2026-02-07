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
        // Calculate date 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        console.log('🧹 Cleaning up conversations older than:', sevenDaysAgo.toISOString());

        // Find conversations older than 7 days
        const { data: oldConversations, error: fetchError } = await supabase
            .from('support_conversations')
            .select('id')
            .lt('updated_at', sevenDaysAgo.toISOString());

        if (fetchError) {
            console.error('Error fetching old conversations:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!oldConversations || oldConversations.length === 0) {
            console.log('✅ No old conversations to delete');
            return NextResponse.json({
                message: 'No conversations to delete',
                deleted: 0
            });
        }

        const conversationIds = oldConversations.map(c => c.id);
        console.log(`📋 Found ${conversationIds.length} conversations to delete`);

        // Delete messages first (due to foreign key constraint)
        const { error: messagesError } = await supabase
            .from('support_messages')
            .delete()
            .in('conversation_id', conversationIds);

        if (messagesError) {
            console.error('Error deleting messages:', messagesError);
            return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        // Delete conversations
        const { error: conversationsError } = await supabase
            .from('support_conversations')
            .delete()
            .in('id', conversationIds);

        if (conversationsError) {
            console.error('Error deleting conversations:', conversationsError);
            return NextResponse.json({ error: conversationsError.message }, { status: 500 });
        }

        console.log(`✅ Successfully deleted ${conversationIds.length} old conversations`);

        return NextResponse.json({
            message: 'Cleanup successful',
            deleted: conversationIds.length,
            conversationIds
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
