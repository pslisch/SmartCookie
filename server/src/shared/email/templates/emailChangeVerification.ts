export interface EmailChangeVerificationData {
  username: string;
  newEmail: string;
  token: string;
}

export function emailChangeVerificationTemplate(data: EmailChangeVerificationData) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const confirmLink = `${baseUrl}/confirm-email?token=${data.token}`;

  const subject = 'Confirm your new SmartCookie email address';
  const text = `Hello ${data.username},

We received a request to change your SmartCookie email address to ${data.newEmail}.

Please click the link below to confirm this change:
${confirmLink}

This link will expire in 24 hours.

If you did not request this, you can safely ignore this email and your email address will remain unchanged.

Best regards,
The SmartCookie Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Confirm Email Change</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hello <strong>${data.username}</strong>,</p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        We received a request to change your SmartCookie email address to <strong>${data.newEmail}</strong>. To complete the process and confirm this change, please click the button below:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
          Confirm Email Change
        </a>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-top: 20px;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="word-break: break-all; color: #4f46e5; font-size: 14px; font-family: monospace; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        ${confirmLink}
      </p>

      <p style="color: #dc2626; font-size: 14px; font-weight: bold; margin-top: 20px;">
        This confirmation link is valid for <strong>24 hours</strong>.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        If you did not request this email change, you can safely ignore this email and your email will remain unchanged.
      </p>
    </div>
  `;

  return { subject, text, html };
}
