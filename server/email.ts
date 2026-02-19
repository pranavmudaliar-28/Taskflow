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

const transporter = createTransporter();

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

