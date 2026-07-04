export interface InvitationData {
  email: string;
  token: string;
}

export function invitationTemplate(data: InvitationData) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const activationLink = `${baseUrl}/activate?token=${data.token}`;

  const subject = 'Welcome to SmartCookie! You have been invited';
  const text = `Hello,

You have been invited to join SmartCookie.

Please click the link below to activate your account and set up your password:
${activationLink}

This link will expire in 7 days.

Best regards,
The SmartCookie Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Welcome to SmartCookie!</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hello,</p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        You have been invited to join <strong>SmartCookie</strong>. To get started, please activate your account and complete your setup by setting your password.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          Activate Account
        </a>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-top: 20px;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="word-break: break-all; color: #2563eb; font-size: 14px; font-family: monospace; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
        ${activationLink}
      </p>

      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        This activation link is valid for <strong>7 days</strong>.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        If you were not expecting this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  return { subject, text, html };
}
