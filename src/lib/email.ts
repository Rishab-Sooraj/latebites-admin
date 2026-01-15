// ZeptoMail Email Service
// Uses ZeptoMail API to send transactional emails

const ZEPTOMAIL_API_URL = 'https://api.zeptomail.in/v1.1/email';

interface EmailOptions {
    to: { email: string; name?: string }[];
    from: {
        address: string;
        name: string;
    };
    subject: string;
    htmlBody: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.ZEPTOMAIL_API_KEY;

    if (!apiKey) {
        console.error('ZEPTOMAIL_API_KEY is not set');
        return { success: false, error: 'Email configuration missing' };
    }

    try {
        const response = await fetch(ZEPTOMAIL_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': apiKey,
            },
            body: JSON.stringify({
                from: options.from,
                to: options.to.map(recipient => ({
                    email_address: {
                        address: recipient.email,
                        name: recipient.name || recipient.email,
                    }
                })),
                subject: options.subject,
                htmlbody: options.htmlBody,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('ZeptoMail error:', data);
            return { success: false, error: data.message || 'Failed to send email' };
        }

        console.log('Email sent successfully:', data);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: 'Failed to send email' };
    }
}

// Sender addresses
export const SENDERS = {
    onboarding: {
        address: 'onboarding@latebites.in',
        name: 'Latebites Onboarding',
    },
    noreply: {
        address: 'noreply@latebites.in',
        name: 'Latebites',
    },
    orderConfirmation: {
        address: 'order_confirmation@latebites.in',
        name: 'Latebites Orders',
    },
};
