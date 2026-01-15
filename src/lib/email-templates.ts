// Email Templates for Latebites

// Common styles
const commonStyles = `
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #0a0a0a;
    color: #ffffff;
`;

const buttonStyle = `
    display: inline-block;
    padding: 14px 28px;
    background-color: #f59e0b;
    color: #000000;
    text-decoration: none;
    font-weight: bold;
    border-radius: 8px;
`;

const headerStyle = `
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    padding: 30px;
    text-align: center;
`;

const footerStyle = `
    padding: 20px;
    text-align: center;
    color: #71717a;
    font-size: 12px;
    border-top: 1px solid #27272a;
`;

// 1. Email Confirmation Template (when restaurant submits onboarding form)
export function getOnboardingConfirmationEmail(restaurantName: string, contactPerson: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="${commonStyles}">
        <div style="${headerStyle}">
            <h1 style="margin: 0; color: #000000; font-size: 24px;">🍽️ Latebites</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #f59e0b; margin-top: 0;">Application Received!</h2>
            <p style="color: #e4e4e7; line-height: 1.6;">
                Dear <strong>${contactPerson}</strong>,
            </p>
            <p style="color: #a1a1aa; line-height: 1.6;">
                Thank you for applying to partner with Latebites! We have received the onboarding application for <strong style="color: #ffffff;">${restaurantName}</strong>.
            </p>
            <div style="background-color: #18181b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #f59e0b; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">What happens next?</h3>
                <ol style="color: #a1a1aa; line-height: 1.8; padding-left: 20px; margin: 0;">
                    <li>Our team will review your application</li>
                    <li>We may visit your restaurant for verification</li>
                    <li>Once approved, you'll receive your login credentials</li>
                    <li>Start listing your rescue bags and saving food!</li>
                </ol>
            </div>
            <p style="color: #71717a; font-size: 14px;">
                This usually takes 2-3 business days. We'll keep you updated!
            </p>
        </div>
        <div style="${footerStyle}">
            <p style="margin: 0;">© ${new Date().getFullYear()} Latebites. Fighting food waste, one meal at a time.</p>
            <p style="margin: 10px 0 0 0;">Coimbatore, Tamil Nadu, India</p>
        </div>
    </body>
    </html>
    `;
}

// 2. Approval Notification Email (when admin approves the application)
export function getApprovalEmail(restaurantName: string, contactPerson: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="${commonStyles}">
        <div style="${headerStyle}">
            <h1 style="margin: 0; color: #000000; font-size: 24px;">🎉 Latebites</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #10b981; margin-top: 0;">Congratulations! You're Approved!</h2>
            <p style="color: #e4e4e7; line-height: 1.6;">
                Dear <strong>${contactPerson}</strong>,
            </p>
            <p style="color: #a1a1aa; line-height: 1.6;">
                Great news! Your application for <strong style="color: #ffffff;">${restaurantName}</strong> has been approved. Welcome to the Latebites family! 🎊
            </p>
            <div style="background-color: #052e16; border: 1px solid #166534; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #22c55e; margin: 0; font-size: 16px;">
                    ✓ Your restaurant has passed our verification process
                </p>
            </div>
            <p style="color: #a1a1aa; line-height: 1.6;">
                Our team will now set up your account and send you login credentials within the next 24 hours. You'll receive another email with your temporary password.
            </p>
            <div style="background-color: #18181b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #f59e0b; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Get Ready To</h3>
                <ul style="color: #a1a1aa; line-height: 1.8; padding-left: 20px; margin: 0;">
                    <li>List your surplus food as "rescue bags"</li>
                    <li>Set your pickup times</li>
                    <li>Reduce food waste and earn revenue</li>
                    <li>Join the sustainable food movement</li>
                </ul>
            </div>
        </div>
        <div style="${footerStyle}">
            <p style="margin: 0;">© ${new Date().getFullYear()} Latebites. Fighting food waste, one meal at a time.</p>
            <p style="margin: 10px 0 0 0;">Coimbatore, Tamil Nadu, India</p>
        </div>
    </body>
    </html>
    `;
}

// 3. Credentials Email (when credentials are generated)
export function getCredentialsEmail(
    restaurantName: string,
    contactPerson: string,
    email: string,
    tempPassword: string
): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="${commonStyles}">
        <div style="${headerStyle}">
            <h1 style="margin: 0; color: #000000; font-size: 24px;">🔐 Latebites</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #f59e0b; margin-top: 0;">Your Login Credentials</h2>
            <p style="color: #e4e4e7; line-height: 1.6;">
                Dear <strong>${contactPerson}</strong>,
            </p>
            <p style="color: #a1a1aa; line-height: 1.6;">
                Your account for <strong style="color: #ffffff;">${restaurantName}</strong> is now ready! Here are your login credentials:
            </p>
            <div style="background-color: #18181b; border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #71717a; padding: 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</td>
                    </tr>
                    <tr>
                        <td style="color: #ffffff; padding: 0 0 16px 0; font-family: monospace; font-size: 16px;">${email}</td>
                    </tr>
                    <tr>
                        <td style="color: #71717a; padding: 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Temporary Password</td>
                    </tr>
                    <tr>
                        <td style="color: #f59e0b; padding: 0; font-family: monospace; font-size: 20px; font-weight: bold;">${tempPassword}</td>
                    </tr>
                </table>
            </div>
            <div style="background-color: #7f1d1d; border: 1px solid #dc2626; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #fca5a5; margin: 0; font-size: 14px;">
                    ⚠️ <strong>Important:</strong> You will be required to change your password on first login.
                </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://restaurant.latebites.in" style="${buttonStyle}">
                    Login to Dashboard →
                </a>
            </div>
            <p style="color: #71717a; font-size: 14px; text-align: center;">
                Restaurant Portal: <a href="https://restaurant.latebites.in" style="color: #f59e0b;">restaurant.latebites.in</a>
            </p>
        </div>
        <div style="${footerStyle}">
            <p style="margin: 0;">© ${new Date().getFullYear()} Latebites. Fighting food waste, one meal at a time.</p>
            <p style="margin: 10px 0 0 0;">Coimbatore, Tamil Nadu, India</p>
        </div>
    </body>
    </html>
    `;
}

// 4. Strike Notification Email (when a strike is issued)
export function getStrikeEmail(
    restaurantName: string,
    contactPerson: string,
    strikeNumber: number,
    reason: string
): string {
    const isWarning = strikeNumber < 3;
    const isFinal = strikeNumber >= 3;

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="${commonStyles}">
        <div style="background: ${isFinal ? '#7f1d1d' : '#78350f'}; padding: 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">
                ${isFinal ? '🚫' : '⚠️'} Latebites
            </h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: ${isFinal ? '#ef4444' : '#f59e0b'}; margin-top: 0;">
                ${isFinal ? 'Account Suspended - Final Strike' : `Strike ${strikeNumber} of 3 Issued`}
            </h2>
            <p style="color: #e4e4e7; line-height: 1.6;">
                Dear <strong>${contactPerson}</strong>,
            </p>
            <p style="color: #a1a1aa; line-height: 1.6;">
                ${isFinal
            ? `We regret to inform you that <strong style="color: #ffffff;">${restaurantName}</strong> has received its 3rd and final strike. Your account has been suspended.`
            : `This is to notify you that <strong style="color: #ffffff;">${restaurantName}</strong> has received strike ${strikeNumber} of 3.`
        }
            </p>
            <div style="background-color: ${isFinal ? '#450a0a' : '#451a03'}; border: 1px solid ${isFinal ? '#dc2626' : '#d97706'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Reason</p>
                <p style="color: #ffffff; margin: 0; font-size: 16px;">${reason}</p>
            </div>
            ${isWarning ? `
            <div style="background-color: #18181b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #fbbf24; margin: 0;">
                    <strong>Warning:</strong> You have ${3 - strikeNumber} strike(s) remaining before your account is suspended.
                </p>
            </div>
            ` : `
            <div style="background-color: #18181b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #a1a1aa; margin: 0;">
                    If you believe this was issued in error, please contact our support team at <a href="mailto:support@latebites.in" style="color: #f59e0b;">support@latebites.in</a>
                </p>
            </div>
            `}
        </div>
        <div style="${footerStyle}">
            <p style="margin: 0;">© ${new Date().getFullYear()} Latebites. Fighting food waste, one meal at a time.</p>
            <p style="margin: 10px 0 0 0;">Coimbatore, Tamil Nadu, India</p>
        </div>
    </body>
    </html>
    `;
}
