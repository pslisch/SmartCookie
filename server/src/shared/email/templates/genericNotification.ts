export interface GenericNotificationData {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Renders a generic notification email for system events.
 * Following the design pattern of assignmentReminder.ts (plain-text + simple inline-styled HTML).
 */
export function genericNotificationTemplate(data: GenericNotificationData) {
  const subject = data.title;
  const actionLabel = data.actionLabel || 'Open link';

  let actionText = '';
  let actionHtml = '';

  if (data.actionUrl) {
    actionText = `\n\n${actionLabel}: ${data.actionUrl}`;
    actionHtml = `
      <p style="margin-top: 24px; margin-bottom: 24px;">
        <a href="${data.actionUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          ${actionLabel}
        </a>
      </p>
    `;
  }

  const text = `Hello,\n\n${data.body}${actionText}\n\nBest regards,\nSmartCookie LMS Team`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #1e293b;">
      <h2 style="color: #0f172a; margin-top: 0;">${data.title}</h2>
      <p>Hello,</p>
      <p style="white-space: pre-line;">${data.body}</p>
      ${actionHtml}
      <br />
      <p>Best regards,<br />SmartCookie LMS Team</p>
    </div>
  `;

  return { subject, text, html };
}
