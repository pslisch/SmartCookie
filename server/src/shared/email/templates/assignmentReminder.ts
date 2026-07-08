export interface AssignmentReminderData {
  lessonTitle: string;
  dueDate: Date | null;
}

export function assignmentReminderTemplate(data: AssignmentReminderData) {
  const dateStr = data.dueDate ? data.dueDate.toLocaleDateString() : 'N/A';
  const subject = `Learning Assignment Reminder: "${data.lessonTitle}" is past due`;
  const text = `Hello,\n\nThis is a reminder that you have an active learning assignment for the lesson "${data.lessonTitle}" which was due on ${dateStr}.\n\nPlease log in and complete it as soon as possible.\n\nBest regards,\nSmartCookie LMS Team`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Learning Assignment Reminder</h2>
      <p>Hello,</p>
      <p>This is a reminder that you have an active learning assignment for the lesson <strong>${data.lessonTitle}</strong> which was due on <strong>${dateStr}</strong>.</p>
      <p>Please log in and complete it as soon as possible.</p>
      <br />
      <p>Best regards,<br />SmartCookie LMS Team</p>
    </div>
  `;
  return { subject, text, html };
}
