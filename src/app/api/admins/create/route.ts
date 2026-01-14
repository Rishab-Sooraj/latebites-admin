import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';

// Generate a secure temporary password
function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const specialChars = '@#$%&*';
    let password = '';

    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    password += Math.floor(Math.random() * 10);

    return password;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, role } = body;

        // Validate required fields
        if (!name || !email || !role) {
            return NextResponse.json(
                { error: 'Name, email, and role are required' },
                { status: 400 }
            );
        }

        // Validate role
        if (!['admin', 'super_admin'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            );
        }

        // Check if current user is super_admin
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { data: currentAdmin } = await supabase
            .from('admins')
            .select('role')
            .eq('email', user.email)
            .eq('is_active', true)
            .single();

        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Only super admins can create new admins' },
                { status: 403 }
            );
        }

        // Check if email already exists in admins
        const { data: existingAdmin } = await supabase
            .from('admins')
            .select('id')
            .eq('email', email)
            .single();

        if (existingAdmin) {
            return NextResponse.json(
                { error: 'An admin with this email already exists' },
                { status: 400 }
            );
        }

        // Generate temporary password
        const tempPassword = generateTempPassword();

        // Create auth user with admin client (service role)
        const adminClient = createAdminClient();

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                role: 'admin',
                name: name,
            },
        });

        if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json(
                { error: authError.message || 'Failed to create user account' },
                { status: 500 }
            );
        }

        // Create admin record
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .insert({
                name: name,
                email: email,
                role: role,
                user_id: authData.user.id,
                is_active: true,
                must_change_password: true,
            })
            .select()
            .single();

        if (adminError) {
            console.error('Admin insert error:', adminError);
            // Try to delete the auth user if admin creation fails
            await adminClient.auth.admin.deleteUser(authData.user.id);

            return NextResponse.json(
                { error: adminError.message || 'Failed to create admin record' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            adminId: adminData.id,
            name: name,
            email: email,
            role: role,
            temporaryPassword: tempPassword,
            message: 'Admin account created successfully',
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
