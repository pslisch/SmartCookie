export interface AuditLogSystemProblemData {
  timestamp?: string;
  message?: string;
}

export function auditLogSystemProblemTemplate(data: AuditLogSystemProblemData) {
  const subject = `[SmartCookie] CRITICAL: Audit Log System Problem`;
  const timestamp = data.timestamp || new Date().toISOString();
  const message =
    data.message ||
    'The Audit Log system has encountered a critical problem and cannot record audit events or deliver detailed failure reports.';
  const text = `CRITICAL: Audit Log System Problem\n\n${message}\n\nTimestamp: ${timestamp}\n\nPlease inspect the system immediately.\n\nSmartCookie LMS Team`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #991b1b;">CRITICAL: Audit Log System Problem</h2>
      <p>${message}</p>
      <p style="font-size: 13px; color: #4b5563;">Timestamp: ${timestamp}</p>
      <p style="color: #dc2626; font-weight: bold;">Immediate technical intervention may be required to restore audit tracking.</p>
      <p style="font-size: 13px; color: #6b7280;">SmartCookie LMS System</p>
    </div>
  `;
  return { subject, text, html };
}
