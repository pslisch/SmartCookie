export interface GroupExpirationData {
  groupName: string;
  expiresAt: Date;
}

export function groupExpirationTemplate(data: GroupExpirationData) {
  const dateStr = data.expiresAt.toLocaleDateString();
  const subject = `Learning Group Expiration Reminder: ${data.groupName}`;
  const text = `Hello,\n\nThis is a reminder that the learning group "${data.groupName}" is scheduled to expire on ${dateStr}.\n\nBest regards,\nSmartCookie LMS Team`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Learning Group Expiration Reminder</h2>
      <p>Hello,</p>
      <p>This is a reminder that the learning group <strong>${data.groupName}</strong> is scheduled to expire on <strong>${dateStr}</strong>.</p>
      <br />
      <p>Best regards,<br />SmartCookie LMS Team</p>
    </div>
  `;
  return { subject, text, html };
}
