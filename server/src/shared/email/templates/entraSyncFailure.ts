export interface EntraSyncFailureData {
  errorMessage: string;
}

export function entraSyncFailureTemplate(data: EntraSyncFailureData) {
  const subject = `CRITICAL: Microsoft Entra ID Sync Failure`;
  const text = `Hello,\n\nThis is a notification that your Microsoft Entra ID synchronization failed with the following error:\n\n${data.errorMessage}\n\nPlease check the sync history and logs in your Admin Settings for more details.\n\nBest regards,\nSmartCookie LMS Team`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Microsoft Entra ID Synchronization Failed</h2>
      <p>Hello,</p>
      <p>A critical failure occurred during the Microsoft Entra synchronization run.</p>
      <div style="background: #fff0f0; border-left: 4px solid #ff4d4f; padding: 12px; margin: 16px 0; font-family: monospace; white-space: pre-wrap;">${data.errorMessage}</div>
      <p>Please check the sync history and download the full logs in your Admin Settings panel for more detailed diagnostic information.</p>
      <br />
      <p>Best regards,<br />SmartCookie LMS Team</p>
    </div>
  `;
  return { subject, text, html };
}
