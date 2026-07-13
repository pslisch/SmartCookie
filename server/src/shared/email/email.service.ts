import nodemailer from 'nodemailer';
import { recoveryEmailChangedTemplate, RecoveryEmailChangedData } from './templates/recoveryEmailChanged';
import { invitationTemplate, InvitationData } from './templates/invitation';
import { passwordResetTemplate, PasswordResetData } from './templates/passwordReset';
import { groupExpirationTemplate, GroupExpirationData } from './templates/groupExpiration';
import { assignmentReminderTemplate, AssignmentReminderData } from './templates/assignmentReminder';
import { emailChangeVerificationTemplate, EmailChangeVerificationData } from './templates/emailChangeVerification';

export type EmailTemplateName = 'recovery-email-changed' | 'invitation' | 'password-reset' | 'group-expiration' | 'assignment-reminder' | 'email-change-verification';

export type EmailTemplateData = RecoveryEmailChangedData | InvitationData | PasswordResetData | GroupExpirationData | AssignmentReminderData | EmailChangeVerificationData;

export interface EmailService {
  send(to: string, template: EmailTemplateName, data: EmailTemplateData): Promise<void>;
}

class EmailServiceImpl implements EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '2525', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Check if host is configured
    if (!host) {
      console.warn('SMTP_HOST is not configured. EmailService will fall back to logging emails to console.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: user && pass ? { user, pass } : undefined,
      });
    } catch (error) {
      console.error('Failed to initialize nodemailer transporter:', error);
    }
  }

  async send(to: string, template: EmailTemplateName, data: EmailTemplateData): Promise<void> {
    let subject = '';
    let text = '';
    let html = '';

    switch (template) {
      case 'recovery-email-changed': {
        const rendered = recoveryEmailChangedTemplate(data as RecoveryEmailChangedData);
        subject = rendered.subject;
        text = rendered.text;
        html = rendered.html;
        break;
      }
      case 'invitation': {
        const rendered = invitationTemplate(data as InvitationData);
        subject = rendered.subject;
        text = rendered.text;
        html = rendered.html;
        break;
      }
      case 'password-reset': {
        const rendered = passwordResetTemplate(data as PasswordResetData);
        subject = rendered.subject;
        text = rendered.text;
        html = rendered.html;
        break;
      }
      case 'group-expiration': {
        const rendered = groupExpirationTemplate(data as GroupExpirationData);
        subject = rendered.subject;
        text = rendered.text;
        html = rendered.html;
        break;
      }
      case 'assignment-reminder': {
        const rendered = assignmentReminderTemplate(data as AssignmentReminderData);
        subject = rendered.subject;
        text = rendered.text;
        html = rendered.html;
        break;
      }
      case 'email-change-verification': {
        const rendered = emailChangeVerificationTemplate(data as EmailChangeVerificationData);
        subject = rendered.subject;
        text = rendered.text;
        html = rendered.html;
        break;
      }
      default:
        throw new Error(`Unsupported email template: ${template}`);
    }

    const from = process.env.SMTP_FROM || 'no-reply@smartcookie.ai';

    if (!this.transporter) {
      console.log('--- EMAIL OUTBOX (STUB MODE) ---');
      console.log(`From: ${from}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text Body:\n${text}`);
      console.log('--------------------------------');
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      console.log(`Email sent successfully to ${to} using template "${template}"`);
    } catch (error) {
      console.error(`Failed to send email to ${to} using template "${template}":`, error);
      throw error;
    }
  }
}

export const emailService: EmailService = new EmailServiceImpl();
