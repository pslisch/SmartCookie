export interface CustomHtmlNotificationData {
  subject: string;
  html: string;
}

/**
 * Strips HTML tags and script/style tags for a simple plain-text email fallback.
 */
function stripHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Renders an email using custom HTML content (typically from an EmailTemplate)
 * with a best-effort plain-text fallback.
 */
export function customHtmlNotificationTemplate(data: CustomHtmlNotificationData) {
  const subject = data.subject;
  const html = data.html;
  const text = stripHtmlToText(html) || data.subject;

  return { subject, text, html };
}
