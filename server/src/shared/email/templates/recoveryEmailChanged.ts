export interface RecoveryEmailChangedData {
  username: string;
  oldEmail: string;
  newEmail: string;
}

export function recoveryEmailChangedTemplate(data: RecoveryEmailChangedData) {
  const subject = 'Your SmartCookie recovery email has been changed';
  const text = `Hello ${data.username},

This is a security notification to inform you that your recovery email address has been changed from ${data.oldEmail} to ${data.newEmail}.

If you did not make this change, please contact a superuser or system administrator immediately.

Best regards,
The SmartCookie Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Security Alert: Recovery Email Changed</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hello <strong>${data.username}</strong>,</p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        This is a security notification to inform you that the recovery email address for your SmartCookie account has been changed:
      </p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0; color: #374151;"><strong>Old Recovery Email:</strong> ${data.oldEmail}</p>
        <p style="margin: 5px 0; color: #374151;"><strong>New Recovery Email:</strong> ${data.newEmail}</p>
      </div>
      <p style="color: #dc2626; font-size: 14px; font-weight: bold; margin-top: 20px;">
        If you did not perform this action, please contact a superuser or system administrator immediately.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        This is an automated security notification. Please do not reply directly to this email.
      </p>
    </div>
  `;

  return { subject, text, html };
}
