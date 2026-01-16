// Email Templates for Latebites - Premium Design
// Modern, sleek, and professional email templates

// Base wrapper for all emails
const getEmailWrapper = (content: string, accentColor: string = '#f59e0b') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Latebites</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: linear-gradient(180deg, #0a0a0a 0%, #171717 100%); border-radius: 24px; overflow: hidden; border: 1px solid #262626;">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 48px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, ${accentColor}15 0%, transparent 50%);">
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%); width: 56px; height: 56px; border-radius: 16px; text-align: center; vertical-align: middle;">
                                        <span style="font-size: 28px; line-height: 56px;">🍽️</span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin: 20px 0 0 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Latebites</h1>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #71717a; letter-spacing: 2px; text-transform: uppercase;">Restaurant Partner Portal</p>
                        </td>
                    </tr>
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #0a0a0a; border-top: 1px solid #262626;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0; font-size: 13px; color: #52525b;">
                                            © ${new Date().getFullYear()} Latebites Technologies Pvt. Ltd.
                                        </p>
                                        <p style="margin: 8px 0 0 0; font-size: 12px; color: #3f3f46;">
                                            Fighting food waste, one meal at a time.
                                        </p>
                                        <p style="margin: 16px 0 0 0; font-size: 11px; color: #3f3f46;">
                                            Coimbatore, Tamil Nadu, India
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

// Status badge component
const getStatusBadge = (text: string, type: 'success' | 'warning' | 'info' | 'error') => {
    const colors = {
        success: { bg: '#052e16', border: '#16a34a', text: '#4ade80', icon: '✓' },
        warning: { bg: '#422006', border: '#ca8a04', text: '#fbbf24', icon: '⚠' },
        info: { bg: '#0c1929', border: '#0ea5e9', text: '#38bdf8', icon: 'ℹ' },
        error: { bg: '#450a0a', border: '#dc2626', text: '#f87171', icon: '✕' },
    };
    const c = colors[type];
    return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td style="background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 12px; padding: 16px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="width: 24px; vertical-align: top;">
                                <span style="color: ${c.text}; font-size: 16px;">${c.icon}</span>
                            </td>
                            <td style="padding-left: 12px;">
                                <p style="margin: 0; font-size: 15px; color: ${c.text}; font-weight: 500;">${text}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
};

// Info card component
const getInfoCard = (title: string, items: string[]) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); border: 1px solid #262626; border-radius: 16px; padding: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 11px; color: #f59e0b; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">${title}</p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                    ${items.map(item => `
                        <tr>
                            <td style="padding: 6px 0; vertical-align: top;">
                                <span style="color: #f59e0b; font-size: 14px; margin-right: 12px;">→</span>
                            </td>
                            <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                                ${item}
                            </td>
                        </tr>
                    `).join('')}
                </table>
            </td>
        </tr>
    </table>
`;

// CTA Button component
const getButton = (text: string, url: string, primary: boolean = true) => `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 32px auto;">
        <tr>
            <td style="background: ${primary ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#262626'}; border-radius: 12px; padding: 16px 40px; text-align: center;">
                <a href="${url}" style="color: ${primary ? '#000000' : '#ffffff'}; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.5px;">${text}</a>
            </td>
        </tr>
    </table>
`;

// 1. Email Confirmation Template (when restaurant submits onboarding form)
export function getOnboardingConfirmationEmail(restaurantName: string, contactPerson: string): string {
    const content = `
        <!-- Hero Section -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
            <tr>
                <td style="text-align: center; padding: 24px 0;">
                    <h2 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Application Received</h2>
                    <p style="margin: 12px 0 0 0; font-size: 16px; color: #71717a;">We're excited to review your submission!</p>
                </td>
            </tr>
        </table>

        <!-- Greeting -->
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Dear <strong style="color: #ffffff;">${contactPerson}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa; line-height: 1.7;">
            Thank you for applying to partner with Latebites! We have received the onboarding application for <strong style="color: #f59e0b;">${restaurantName}</strong>.
        </p>

        ${getStatusBadge('Your application is under review', 'info')}

        ${getInfoCard('What Happens Next?', [
        'Our team will review your application within 2-3 business days',
        'We may visit your restaurant for verification',
        'Once approved, you\'ll receive your login credentials via email',
        'Start listing your rescue bags and reduce food waste!'
    ])}

        <p style="margin: 24px 0 0 0; font-size: 14px; color: #52525b; text-align: center; line-height: 1.6;">
            Questions? Reach us at <a href="mailto:partners@latebites.in" style="color: #f59e0b; text-decoration: none;">partners@latebites.in</a>
        </p>
    `;

    return getEmailWrapper(content, '#0ea5e9');
}

// 2. Approval Notification Email (when admin approves the application)
export function getApprovalEmail(restaurantName: string, contactPerson: string): string {
    const content = `
        <!-- Celebration Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
            <tr>
                <td style="text-align: center; padding: 24px 0;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                    <h2 style="margin: 0; font-size: 32px; font-weight: 700; color: #22c55e; letter-spacing: -0.5px;">You're Approved!</h2>
                    <p style="margin: 12px 0 0 0; font-size: 16px; color: #71717a;">Welcome to the Latebites family</p>
                </td>
            </tr>
        </table>

        <!-- Greeting -->
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Dear <strong style="color: #ffffff;">${contactPerson}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa; line-height: 1.7;">
            Great news! Your application for <strong style="color: #f59e0b;">${restaurantName}</strong> has been approved. You've passed our verification process!
        </p>

        ${getStatusBadge('Your restaurant has been verified and approved', 'success')}

        <!-- What's Next Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 1px solid #3730a3; border-radius: 16px; padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Coming Up</p>
                    <p style="margin: 0; font-size: 18px; color: #ffffff; font-weight: 600;">Login credentials arriving within 24 hours</p>
                    <p style="margin: 12px 0 0 0; font-size: 14px; color: #94a3b8;">You'll receive another email with your temporary password to access the restaurant portal.</p>
                </td>
            </tr>
        </table>

        ${getInfoCard('Get Ready To', [
        'List your surplus food as "rescue bags"',
        'Set custom pickup times that work for you',
        'Reduce food waste while earning extra revenue',
        'Join the sustainable food movement in Coimbatore'
    ])}
    `;

    return getEmailWrapper(content, '#22c55e');
}

// 3. Credentials Email (when credentials are generated)
export function getCredentialsEmail(
    restaurantName: string,
    contactPerson: string,
    email: string,
    tempPassword: string
): string {
    const content = `
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
            <tr>
                <td style="text-align: center; padding: 24px 0;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
                    <h2 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Your Login Credentials</h2>
                    <p style="margin: 12px 0 0 0; font-size: 16px; color: #71717a;">You're all set to start!</p>
                </td>
            </tr>
        </table>

        <!-- Greeting -->
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Dear <strong style="color: #ffffff;">${contactPerson}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa; line-height: 1.7;">
            Your account for <strong style="color: #f59e0b;">${restaurantName}</strong> is ready! Here are your login credentials:
        </p>

        <!-- Credentials Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border: 2px solid #f59e0b; border-radius: 20px; padding: 32px; box-shadow: 0 0 40px rgba(245, 158, 11, 0.1);">
                    <!-- Email -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                            <td>
                                <p style="margin: 0 0 8px 0; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">Email Address</p>
                                <p style="margin: 0; font-size: 18px; color: #ffffff; font-family: 'SF Mono', Monaco, monospace; background: #262626; padding: 12px 16px; border-radius: 8px;">${email}</p>
                            </td>
                        </tr>
                    </table>
                    <!-- Password -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td>
                                <p style="margin: 0 0 8px 0; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">Temporary Password</p>
                                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #f59e0b; font-family: 'SF Mono', Monaco, monospace; background: #262626; padding: 16px; border-radius: 8px; text-align: center; letter-spacing: 2px;">${tempPassword}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        ${getStatusBadge('You must change your password on first login', 'warning')}

        ${getButton('Login to Restaurant Portal →', 'https://restaurant.latebites.in')}

        <p style="margin: 0; font-size: 14px; color: #52525b; text-align: center;">
            Portal URL: <a href="https://restaurant.latebites.in" style="color: #f59e0b; text-decoration: none;">restaurant.latebites.in</a>
        </p>
    `;

    return getEmailWrapper(content, '#f59e0b');
}

// 4. Strike Notification Email (when a strike is issued)
export function getStrikeEmail(
    restaurantName: string,
    contactPerson: string,
    strikeNumber: number,
    reason: string
): string {
    const isFinal = strikeNumber >= 3;

    const content = `
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
            <tr>
                <td style="text-align: center; padding: 24px 0;">
                    <div style="font-size: 48px; margin-bottom: 16px;">${isFinal ? '🚫' : '⚠️'}</div>
                    <h2 style="margin: 0; font-size: 32px; font-weight: 700; color: ${isFinal ? '#ef4444' : '#f59e0b'}; letter-spacing: -0.5px;">
                        ${isFinal ? 'Account Suspended' : `Strike ${strikeNumber} of 3`}
                    </h2>
                    <p style="margin: 12px 0 0 0; font-size: 16px; color: #71717a;">
                        ${isFinal ? 'Final strike issued' : 'Policy violation notice'}
                    </p>
                </td>
            </tr>
        </table>

        <!-- Greeting -->
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Dear <strong style="color: #ffffff;">${contactPerson}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa; line-height: 1.7;">
            ${isFinal
            ? `We regret to inform you that <strong style="color: #ef4444;">${restaurantName}</strong> has received its 3rd and final strike. Your account has been suspended.`
            : `This is to notify you that <strong style="color: #f59e0b;">${restaurantName}</strong> has received strike ${strikeNumber} of 3.`
        }
        </p>

        <!-- Reason Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td style="background: ${isFinal ? '#450a0a' : '#451a03'}; border: 1px solid ${isFinal ? '#dc2626' : '#d97706'}; border-radius: 16px; padding: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 11px; color: ${isFinal ? '#f87171' : '#fbbf24'}; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Reason for Strike</p>
                    <p style="margin: 0; font-size: 16px; color: #ffffff; line-height: 1.6;">${reason}</p>
                </td>
            </tr>
        </table>

        ${isFinal
            ? getStatusBadge('Your restaurant portal access has been revoked', 'error')
            : getStatusBadge(`You have ${3 - strikeNumber} strike(s) remaining before suspension`, 'warning')
        }

        <p style="margin: 24px 0 0 0; font-size: 14px; color: #52525b; text-align: center; line-height: 1.6;">
            If you believe this was issued in error, please contact us at <a href="mailto:support@latebites.in" style="color: #f59e0b; text-decoration: none;">support@latebites.in</a>
        </p>
    `;

    return getEmailWrapper(content, isFinal ? '#ef4444' : '#f59e0b');
}
