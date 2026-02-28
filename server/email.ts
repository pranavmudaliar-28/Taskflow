import nodemailer from 'nodemailer';

interface OrganizationInvitationEmail {
  to: string;
  organizationName: string;
  inviterName: string;
  acceptUrl: string;
  expiresAt: Date;
}

// Create transporter based on environment configuration
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  // If SMTP is not configured, use Ethereal (test email service) in development
  if (!smtpHost || !smtpUser) {
    console.log('[Email] SMTP not configured. Emails will be logged to console only.');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort) || 587,
    secure: Number(smtpPort) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
};

import fs from 'fs';
import path from 'path';

const smtpLogPath = path.join(process.cwd(), 'logs', 'smtp.log');
const logToSmtp = (message: string) => {
  const timestamp = new Date().toISOString();
  try {
    const logsDir = path.dirname(smtpLogPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.appendFileSync(smtpLogPath, `${timestamp} : ${message}\n`);
  } catch (err) {
    console.error('[Email] Failed to write to smtp.log:', err);
  }
};

logToSmtp('Initializing SMTP transporter...');
const transporter = createTransporter();

if (transporter) {
  logToSmtp(`SMTP transporter initialized for host: ${process.env.SMTP_HOST}`);
  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      logToSmtp(`SMTP Verification FAILED: ${JSON.stringify(error, null, 2)}`);
      console.error('[Email] SMTP Verification FAILED:', error);
    } else {
      logToSmtp('SMTP Server is ready to take our messages');
      console.log('[Email] SMTP Server is ready to take our messages');
    }
  });
} else {
  logToSmtp('SMTP transporter NOT initialized (using console log mode)');
  console.log('[Email] SMTP transporter NOT initialized (using console log mode)');
}

export async function sendOrganizationInvitationEmail(data: OrganizationInvitationEmail): Promise<void> {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { 
          display: inline-block; 
          background: #4f46e5; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 20px 0;
        }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited!</h1>
        </div>
        <div class="content">
          <p>Hi there!</p>
          <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on TaskFlow Pro.</p>
          <p>Click the button below to accept this invitation:</p>
          <p style="text-align: center;">
            <a href="${data.acceptUrl}" class="button">Accept Invitation</a>
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            Or copy and paste this link into your browser:<br>
            <a href="${data.acceptUrl}">${data.acceptUrl}</a>
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            This invitation will expire on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}.
          </p>
          <p>If you don't have an account, you'll be able to create one when you accept the invitation.</p>
        </div>
        <div class="footer">
          <p>TaskFlow Pro - Project Management Made Simple</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
You're invited to join ${data.organizationName} on TaskFlow Pro!

${data.inviterName} has invited you to join their organization.

Accept this invitation by visiting:
${data.acceptUrl}

This invitation will expire on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}.

If you don't have an account, you'll be able to create one when you accept the invitation.

---
TaskFlow Pro - Project Management Made Simple
  `;

  // If transporter is not configured, log to console
  if (!transporter) {
    console.log("\n===========================================");
    console.log("📧 ORGANIZATION INVITATION EMAIL");
    console.log("===========================================");
    console.log(`To: ${data.to}`);
    console.log(`Subject: You're invited to join ${data.organizationName} on TaskFlow Pro`);
    console.log("\n--- Email Content ---");
    console.log(emailText);
    console.log("===========================================\n");
    return;
  }

  // Send actual email
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"TaskFlow Pro" <noreply@taskflow.pro>',
      to: data.to,
      subject: `You're invited to join ${data.organizationName} on TaskFlow Pro`,
      text: emailText,
      html: emailHTML,
    });

    console.log(`[Email] Invitation sent to ${data.to}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('[Email] Failed to send invitation email:', error);
    // Log to console as fallback
    console.log("\n===========================================");
    console.log("📧 ORGANIZATION INVITATION EMAIL (FALLBACK)");
    console.log("===========================================");
    console.log(`To: ${data.to}`);
    console.log(`Subject: You're invited to join ${data.organizationName} on TaskFlow Pro`);
    console.log(emailText);
    console.log("===========================================\n");
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your TaskFlow Password</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-top: 40px; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background-color: #4f46e5; padding: 32px 20px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
        .content { padding: 40px 30px; }
        .content p { margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4b5563; }
        .button-wrapper { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 500; font-size: 16px; transition: background-color 0.2s; }
        .button:hover { background-color: #4338ca; }
        .backup-link-wrapper { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
        .backup-link-wrapper p { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
        .backup-link { color: #4f46e5; word-break: break-all; font-size: 14px; }
        .footer { padding: 0 30px 30px; text-align: center; }
        .footer p { margin: 0; font-size: 13px; color: #9ca3af; line-height: 20px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <table class="main" width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="header">
              <h1>TaskFlow</h1>
            </td>
          </tr>
          <tr>
            <td class="content">
              <p>Hi there,</p>
              <p>We received a request to reset your password for your TaskFlow account. Click the button below to set a new password:</p>
              
              <div class="button-wrapper">
                <a href="${resetUrl}" class="button" target="_blank">Reset Password</a>
              </div>
              
              <div class="backup-link-wrapper">
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <a href="${resetUrl}" class="backup-link" target="_blank">${resetUrl}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p>If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.</p>
              <p style="margin-top: 12px;">&copy; ${new Date().getFullYear()} TaskFlow Pro. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const emailText = `
Reset your TaskFlow password
============================

Hi there,

We received a request to reset your password for your TaskFlow account.
Please visit the following link to set a new password:

${resetUrl}

If you didn't request a password reset, you can safely ignore this email. 
This link will expire in 1 hour.

---
© ${new Date().getFullYear()} TaskFlow Pro. All rights reserved.
  `;

  if (!transporter) {
    console.log("\n===========================================");
    console.log("📧 PASSWORD RESET EMAIL");
    console.log("===========================================");
    console.log(`To: ${to}`);
    console.log(`Subject: Reset your TaskFlow password`);
    console.log("\n--- Email Content ---");
    console.log(emailText);
    console.log("===========================================\n");
    return;
  }

  try {
    logToSmtp(`Attempting to send password reset email to ${to}...`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"TaskFlow Pro" <noreply@taskflow.pro>',
      to,
      subject: `Reset your TaskFlow password`,
      text: emailText,
      html: emailHTML,
    });
    logToSmtp(`Password reset sent successfully to ${to}. Message ID: ${info.messageId}. Response: ${info.response}`);
    console.log(`[Email] Password reset sent successfully to ${to}. Message ID: ${info.messageId}`);
  } catch (error: any) {
    logToSmtp(`CRITICAL FAILURE sending password reset email to ${to}: ${error.stack || error.message}`);
    console.error('[Email] CRITICAL FAILURE sending password reset email:', error);
  }
}
