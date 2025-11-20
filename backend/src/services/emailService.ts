import zeptomailService from './zeptomailService';
import { formatDualTimezone } from '../utils/timezoneUtils';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

interface VerificationEmailData {
  userEmail: string;
  userName: string;
  verificationUrl: string;
}

interface PasswordResetEmailData {
  userEmail: string;
  userName: string;
  resetUrl: string;
}

class EmailService {
  /**
   * Send email using ZeptoMail API
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!zeptomailService.isReady()) {
      console.error('❌ Email service not configured');
      return false;
    }

    try {
      return await zeptomailService.sendEmail({
        to: { address: options.to },
        subject: options.subject,
        htmlbody: options.html,
        textbody: options.text,
        attachments: options.attachments
      });
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    const { userEmail, userName, verificationUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AI Calling Agent Platform!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Thank you for signing up for our AI Calling Agent Platform. To complete your registration and start using our services, please verify your email address.</p>
            <p>Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 3 days for security reasons.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to AI Calling Agent Platform!
      
      Hi ${userName},
      
      Thank you for signing up. Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
  This link will expire in 3 days.
      
      If you didn't create an account with us, please ignore this email.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: 'Verify Your Email - AI Calling Agent Platform',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const { userEmail, userName, resetUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We received a request to reset your password for your AI Calling Agent Platform account.</p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
            <p>To reset your password, click the button below:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This password reset link will expire in 1 hour for security reasons.</p>
            <p>After clicking the link, you'll be able to create a new password for your account.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hi ${userName},
      
      We received a request to reset your password. If you didn't request this, please ignore this email.
      
      To reset your password, click the link below:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you have any questions, please contact our support team.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: 'Reset Your Password - AI Calling Agent Platform',
      html,
      text,
    });
  }

  /**
   * Send welcome email with credit information
   */
  async sendWelcomeEmail(userEmail: string, userName: string, credits: number): Promise<boolean> {
    const getFrontendBaseUrl = (): string => {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not configured');
      }
      const base = process.env.FRONTEND_URL.split(',')[0].trim();
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const appBaseUrl = getFrontendBaseUrl();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AI Calling Agent Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .credits-box { background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to AI Calling Agent Platform!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Congratulations! Your account has been successfully created and verified.</p>
            <div class="credits-box">
              <h3>🎁 Welcome Bonus</h3>
              <p><strong>${credits} FREE Credits</strong> have been added to your account!</p>
              <p>Each credit allows you to make 1 minute of AI-powered calls.</p>
            </div>
            <p>You can now start creating AI calling agents and managing your campaigns. Here's what you can do:</p>
            <ul>
              <li>Create and configure AI calling agents</li>
              <li>Upload contact lists</li>
              <li>Monitor call analytics and lead scoring</li>
              <li>Track your credit usage and purchase more when needed</li>
            </ul>
            <a href="${appBaseUrl}" class="button">Get Started</a>
            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to AI Calling Agent Platform!
      
      Hi ${userName},
      
      Your account has been successfully created! You've received ${credits} free credits to get started.
      
      Visit ${appBaseUrl} to start creating your AI calling agents.
      
      If you need help, contact our support team.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: '🎉 Welcome! Your AI Calling Agent Account is Ready',
      html,
      text,
    });
  }

  /**
   * Send low credits notification
   */
  async sendLowCreditsNotification(userEmail: string, userName: string, currentCredits: number): Promise<boolean> {
    const getFrontendBaseUrl = (): string => {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not configured');
      }
      const base = process.env.FRONTEND_URL.split(',')[0].trim();
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const appBaseUrl = getFrontendBaseUrl();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Low Credits Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .alert-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Credits Alert</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <div class="alert-box">
              <h3>Your credit balance is running low</h3>
              <p><strong>Current Balance: ${currentCredits} credits</strong></p>
              <p>You may want to purchase more credits to continue using our services.</p>
            </div>
            <p>Don't let your campaigns stop! Top up your credits to keep your AI calling agents running smoothly.</p>
            <p>Remember: Each credit allows 1 minute of AI-powered calling.</p>
            <a href="${appBaseUrl}/billing" class="button">Purchase Credits</a>
            <p>Thank you for using AI Calling Agent Platform!</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Low Credits Alert
      
      Hi ${userName},
      
      Your credit balance is running low: ${currentCredits} credits remaining.
      
      Purchase more credits at ${appBaseUrl}/billing to keep your campaigns running.
      
      Thank you for using AI Calling Agent Platform!
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: '⚠️ Low Credits Alert - AI Calling Agent Platform',
      html,
      text,
    });
  }

  /**
   * Send credits added notification (admin adjustment or purchase)
   */
  async sendCreditsAddedEmail(params: {
    userEmail: string;
    userName: string;
    amountAdded: number;
    newBalance: number;
  }): Promise<boolean> {
    const { userEmail, userName, amountAdded, newBalance } = params;

    const getFrontendBaseUrl = (): string => {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not configured');
      }
      const base = process.env.FRONTEND_URL.split(',')[0].trim();
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const appBaseUrl = getFrontendBaseUrl();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Credits Added</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .credits-box { background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Credits Added</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <div class="credits-box">
              <p><strong>${amountAdded} credits</strong> were added to your account.</p>
              <p>New balance: <strong>${newBalance} credits</strong></p>
            </div>
            <p>You can review your balance and transactions any time.</p>
            <a href="${appBaseUrl}/billing" class="button">View Billing</a>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Credits Added\n\nHi ${userName},\n\n${amountAdded} credits were added to your account.\nNew balance: ${newBalance} credits.\n\nView billing: ${appBaseUrl}/billing
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: `✅ ${amountAdded} credits added to your account`,
      html,
      text,
    });
  }

  /**
   * Send post-campaign summary email with optional CSV attachment of hot leads
   */
  async sendCampaignSummaryEmail(params: {
    userEmail: string;
    userName: string;
    campaignName: string;
    stats: {
      totalContacts: number;
      completedCalls: number;
      successRate: number; // percentage 0-100
      avgCallMinutes: number; // minutes
      creditsUsed?: number;
    };
    topLeads: Array<{ name: string; phone: string; score: number }>;
    hotLeadsCsv?: string; // optional CSV content
  }): Promise<boolean> {
    const { userEmail, userName, campaignName, stats, topLeads, hotLeadsCsv } = params;

    const htmlTopLeads = topLeads && topLeads.length > 0
      ? `<ol>${topLeads.map(l => `<li><strong>${l.name}</strong> (${l.phone}) — score ${l.score}</li>`).join('')}</ol>`
      : '<p>No hot leads identified.</p>';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Campaign Summary</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 680px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .metric { display: inline-block; padding: 10px 16px; margin: 6px; background: #eef2ff; border-radius: 8px; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Campaign Summary: ${campaignName}</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your campaign has completed. Here are the highlights:</p>
            <div>
              <span class="metric">Contacts: <strong>${stats.totalContacts}</strong></span>
              <span class="metric">Completed: <strong>${stats.completedCalls}</strong></span>
              <span class="metric">Success rate: <strong>${Math.round(stats.successRate)}%</strong></span>
              <span class="metric">Avg call: <strong>${stats.avgCallMinutes.toFixed(1)} min</strong></span>
            </div>
            <h3>Top hot leads</h3>
            ${htmlTopLeads}
            ${hotLeadsCsv ? '<p>Full list attached as CSV.</p>' : ''}
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textTopLeads = topLeads && topLeads.length > 0
      ? topLeads.map((l, i) => `${i + 1}. ${l.name} (${l.phone}) — score ${l.score}`).join('\n')
      : 'No hot leads identified.';

    const text = `
Campaign Summary: ${campaignName}\n\nContacts: ${stats.totalContacts}\nCompleted: ${stats.completedCalls}\nSuccess rate: ${Math.round(stats.successRate)}%\nAvg call: ${stats.avgCallMinutes.toFixed(1)} min\n\nTop hot leads:\n${textTopLeads}
    `;

    const attachments = hotLeadsCsv
      ? [{ filename: `${campaignName.replace(/[^a-z0-9_-]+/gi, '_')}_hot_leads.csv`, content: hotLeadsCsv, contentType: 'text/csv' }]
      : undefined;

    return await this.sendEmail({
      to: userEmail,
      subject: `📊 Campaign Summary — ${campaignName}`,
      html,
      text,
      attachments
    });
  }

  /**
   * Send meeting booked notification to dashboard user
   * Full context including transcript, recording, AI analysis
   */
  async sendMeetingBookedNotification(params: {
    userEmail: string;
    userName: string;
    userTimezone?: string; // User's timezone for dual timezone formatting
    meetingDetails: {
      leadName?: string;
      leadEmail: string;
      company?: string;
      phone?: string;
      meetingTime: Date;
      meetingDuration: number; // minutes
      meetingTitle: string;
      googleCalendarLink?: string;
    };
    callContext?: {
      transcript?: string;
      recordingUrl?: string;
      leadStatusTag?: string;
      aiReasoning?: string;
      smartNotification?: string;
    };
  }): Promise<boolean> {
    const { userEmail, userName, userTimezone, meetingDetails, callContext } = params;

    const getFrontendBaseUrl = (): string => {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not configured');
      }
      const base = process.env.FRONTEND_URL.split(',')[0].trim();
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const appBaseUrl = getFrontendBaseUrl();
    
    // Format meeting time with dual timezone (user's timezone + UTC)
    // Example: "2:00 PM PST (22:00 UTC)" or just UTC if no timezone provided
    const meetingTimeFormatted = userTimezone 
      ? formatDualTimezone(meetingDetails.meetingTime, userTimezone)
      : meetingDetails.meetingTime.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'UTC',
          timeZoneName: 'short'
        });

    // Truncate transcript for email if too long (keep first 2000 chars)
    const transcriptPreview = callContext?.transcript 
      ? (callContext.transcript.length > 2000 
          ? callContext.transcript.substring(0, 2000) + '...\n\n[Transcript truncated. View full details in dashboard]'
          : callContext.transcript)
      : 'No transcript available';

    const isRescheduled = meetingDetails.meetingTitle.includes('RESCHEDULED');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isRescheduled ? 'Meeting Rescheduled' : 'New Meeting Booked by AI Agent'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${isRescheduled ? '#f59e0b 0%, #dc2626 100%' : '#667eea 0%, #764ba2 100%'}); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .meeting-box { background: white; border-left: 4px solid ${isRescheduled ? '#f59e0b' : '#10b981'}; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .lead-info { background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .call-context { background: #f0f4ff; border: 1px solid #667eea; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .transcript-box { background: white; padding: 15px; border-radius: 5px; margin-top: 15px; max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .button-secondary { background: #10b981; }
          .tag { display: inline-block; padding: 6px 12px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 14px; font-weight: bold; margin: 5px 0; }
          .tag-hot { background: #fee2e2; color: #991b1b; }
          .tag-interested { background: #dbeafe; color: #1e40af; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 10px 10px; background: #f9f9f9; }
          .metric { display: inline-block; margin: 10px 15px; }
          .metric-label { font-size: 12px; color: #666; display: block; }
          .metric-value { font-size: 20px; font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isRescheduled ? '⏰ Meeting Rescheduled!' : '🎯 New Meeting Booked!'}</h1>
            <p>${isRescheduled ? 'Meeting time has been updated' : 'Your AI Agent successfully scheduled a demo'}</p>
          </div>
          
          <div class="content">
            <p>Hi ${userName},</p>
            <p>${isRescheduled ? 'A meeting has been rescheduled. Here are the updated details:' : 'Great news! Your AI calling agent just booked a new meeting. Here\'s everything you need to know:'}</p>
            
            <!-- Meeting Details -->
            <div class="meeting-box">
              <h2>📅 ${meetingDetails.meetingTitle}</h2>
              <p><strong>When:</strong> ${meetingTimeFormatted}</p>
              <p><strong>Duration:</strong> ${meetingDetails.meetingDuration} minutes</p>
              <div style="margin-top: 15px;">
                ${meetingDetails.googleCalendarLink ? `
                <a href="${meetingDetails.googleCalendarLink}" class="button">📅 ${meetingDetails.meetingTitle.includes('RESCHEDULED') ? 'Join Meeting' : 'Add to Calendar'}</a>
                ` : ''}
                ${meetingDetails.leadEmail ? `
                <a href="${appBaseUrl}/customers?search=${encodeURIComponent(meetingDetails.leadEmail)}" class="button button-secondary">👤 View Customer Timeline</a>
                ` : `
                <a href="${appBaseUrl}/meetings" class="button button-secondary">📊 View in Dashboard</a>
                `}
              </div>
            </div>
            
            <!-- Lead Information -->
            <div class="lead-info">
              <h3>👤 Lead Information</h3>
              <p><strong>Name:</strong> ${meetingDetails.leadName || 'Not provided'}</p>
              <p><strong>Email:</strong> ${meetingDetails.leadEmail}</p>
              ${meetingDetails.company ? `<p><strong>Company:</strong> ${meetingDetails.company}</p>` : ''}
              ${meetingDetails.phone ? `<p><strong>Phone:</strong> ${meetingDetails.phone}</p>` : ''}
              ${callContext?.leadStatusTag ? `
              <p><strong>Status:</strong> 
                <span class="tag ${callContext.leadStatusTag.toLowerCase().includes('hot') ? 'tag-hot' : (callContext.leadStatusTag.toLowerCase().includes('interested') ? 'tag-interested' : '')}">${callContext.leadStatusTag}</span>
              </p>
              ` : ''}
            </div>
            
            <!-- AI Analysis -->
            ${callContext?.aiReasoning || callContext?.smartNotification ? `
            <div class="call-context">
              <h3>🤖 AI Analysis</h3>
              ${callContext.aiReasoning ? `
              <p><strong>AI Reasoning:</strong></p>
              <p>${callContext.aiReasoning}</p>
              ` : ''}
              ${callContext.smartNotification ? `
              <p><strong>Smart Notification:</strong></p>
              <p>${callContext.smartNotification}</p>
              ` : ''}
            </div>
            ` : ''}
            
            <!-- Call Recording & Transcript -->
            ${callContext ? `
            <div class="call-context">
              <h3>📞 Call Details</h3>
              ${callContext.recordingUrl ? `
              <p><strong>Call Recording:</strong></p>
              <p><a href="${callContext.recordingUrl}" class="button">🎙️ Listen to Recording</a></p>
              ` : ''}
              
              ${callContext.transcript ? `
              <p><strong>Call Transcript:</strong></p>
              <div class="transcript-box">
                <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; margin: 0;">${transcriptPreview}</pre>
              </div>
              ` : ''}
            </div>
            ` : ''}
            
            <p style="margin-top: 30px;">
              <strong>Next Steps:</strong><br>
              • Review the call recording and transcript<br>
              • Prepare for the meeting based on the lead's interests<br>
              • Check your Google Calendar for the meeting invite<br>
              • View full details in your dashboard
            </p>
          </div>
          
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This meeting was automatically scheduled by your AI agent</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
New Meeting Booked by AI Agent!

Hi ${userName},

Your AI agent successfully booked a new meeting:

MEETING DETAILS:
${meetingDetails.meetingTitle}
When: ${meetingTimeFormatted}
Duration: ${meetingDetails.meetingDuration} minutes
${meetingDetails.googleCalendarLink ? `Google Calendar: ${meetingDetails.googleCalendarLink}` : ''}

LEAD INFORMATION:
Name: ${meetingDetails.leadName || 'Not provided'}
Email: ${meetingDetails.leadEmail}
${meetingDetails.company ? `Company: ${meetingDetails.company}` : ''}
${meetingDetails.phone ? `Phone: ${meetingDetails.phone}` : ''}
${callContext?.leadStatusTag ? `Status: ${callContext.leadStatusTag}` : ''}

${callContext?.aiReasoning ? `AI REASONING:\n${callContext.aiReasoning}\n\n` : ''}

${callContext?.recordingUrl ? `CALL RECORDING:\n${callContext.recordingUrl}\n\n` : ''}

${callContext?.transcript ? `TRANSCRIPT:\n${transcriptPreview}\n\n` : ''}

View full details: ${appBaseUrl}/meetings
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: `🎯 New Meeting Booked: ${meetingDetails.leadName || meetingDetails.leadEmail}`,
      html,
      text,
    });
  }

  /**
   * Send demo reminder email to lead
   */
  async sendDemoReminder(params: {
    leadEmail: string;
    leadName: string;
    meetingTime: Date;
    meetingLink: string;
    meetingTitle?: string;
    userName?: string;
    company?: string;
  }): Promise<boolean> {
    const { leadEmail, leadName, meetingTime, meetingLink, meetingTitle, userName, company } = params;

    const meetingTimeFormatted = meetingTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const timeUntilMeeting = Math.ceil((meetingTime.getTime() - Date.now()) / (1000 * 60 * 60)); // hours

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Demo Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .reminder-box { background: white; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .time-badge { display: inline-block; padding: 8px 16px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 16px; font-weight: bold; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 10px 10px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Demo Reminder</h1>
            <p>Your demo is coming up soon!</p>
          </div>
          
          <div class="content">
            <p>Hi ${leadName},</p>
            <p>This is a friendly reminder about your upcoming demo${userName ? ` with ${userName}` : ''}.</p>
            
            <div class="reminder-box">
              <h2>📅 ${meetingTitle || 'Demo Meeting'}</h2>
              <p><strong>When:</strong> ${meetingTimeFormatted}</p>
              ${timeUntilMeeting > 0 ? `<p class="time-badge">⏱️ Starting in ${timeUntilMeeting} hour${timeUntilMeeting !== 1 ? 's' : ''}</p>` : ''}
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              
              <div style="margin-top: 20px;">
                <a href="${meetingLink}" class="button">🎥 Join Meeting</a>
              </div>
            </div>
            
            <p style="margin-top: 30px;">
              <strong>What to prepare:</strong><br>
              • Make sure you have a stable internet connection<br>
              • Test your camera and microphone<br>
              • Prepare any questions you'd like to ask<br>
              • Have a pen and paper ready for notes
            </p>
            
            <p style="margin-top: 20px;">
              We're looking forward to showing you what we can do! If you need to reschedule or have any questions, please let us know.
            </p>
          </div>
          
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>If you need to reschedule, please contact us as soon as possible.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Demo Reminder

Hi ${leadName},

This is a friendly reminder about your upcoming demo${userName ? ` with ${userName}` : ''}.

MEETING DETAILS:
${meetingTitle || 'Demo Meeting'}
When: ${meetingTimeFormatted}
${timeUntilMeeting > 0 ? `Starting in ${timeUntilMeeting} hour${timeUntilMeeting !== 1 ? 's' : ''}` : ''}
${company ? `Company: ${company}` : ''}

Join Meeting: ${meetingLink}

WHAT TO PREPARE:
• Make sure you have a stable internet connection
• Test your camera and microphone
• Prepare any questions you'd like to ask
• Have a pen and paper ready for notes

We're looking forward to showing you what we can do! If you need to reschedule or have any questions, please let us know.
    `;

    return await this.sendEmail({
      to: leadEmail,
      subject: `⏰ Reminder: Your demo is coming up soon!`,
      html,
      text,
    });
  }

  /**
   * Send demo cancellation email to lead
   */
  async sendDemoCancellation(params: {
    leadEmail: string;
    leadName: string;
    meetingTime: Date;
    meetingTitle?: string;
    cancellationReason?: string;
  }): Promise<boolean> {
    const { leadEmail, leadName, meetingTime, meetingTitle, cancellationReason } = params;

    const meetingTimeFormatted = meetingTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .cancellation-box { background: white; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 10px 10px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Meeting Cancelled</h1>
            <p>Your scheduled meeting has been cancelled</p>
          </div>
          
          <div class="content">
            <p>Hi ${leadName},</p>
            <p>We regret to inform you that your scheduled demo meeting has been cancelled.</p>
            
            <div class="cancellation-box">
              <h2>Cancelled Meeting Details</h2>
              <p><strong>Meeting:</strong> ${meetingTitle || 'Demo Meeting'}</p>
              <p><strong>Original Time:</strong> ${meetingTimeFormatted}</p>
              ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
            </div>
            
            <p>If you'd like to reschedule or have any questions, please don't hesitate to reach out to us.</p>
            
            <p>We apologize for any inconvenience this may cause.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Meeting Cancelled

Hi ${leadName},

We regret to inform you that your scheduled demo meeting has been cancelled.

CANCELLED MEETING DETAILS:
Meeting: ${meetingTitle || 'Demo Meeting'}
Original Time: ${meetingTimeFormatted}
${cancellationReason ? `Reason: ${cancellationReason}` : ''}

If you'd like to reschedule or have any questions, please don't hesitate to reach out to us.

We apologize for any inconvenience this may cause.
    `;

    return await this.sendEmail({
      to: leadEmail,
      subject: `Meeting Cancelled: ${meetingTitle || 'Demo'}`,
      html,
      text,
    });
  }

  /**
   * Send demo reschedule email to lead
   */
  async sendDemoReschedule(params: {
    leadEmail: string;
    leadName: string;
    oldMeetingTime: Date;
    newMeetingTime: Date;
    meetingLink: string;
    meetingTitle?: string;
    userName?: string;
    company?: string;
  }): Promise<boolean> {
    const { leadEmail, leadName, oldMeetingTime, newMeetingTime, meetingLink, meetingTitle, userName, company } = params;

    const oldTimeFormatted = oldMeetingTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const newTimeFormatted = newMeetingTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Rescheduled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .meeting-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .time-change { background: #fef3c7; border: 2px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .strikethrough { text-decoration: line-through; color: #999; }
          .highlight { color: #667eea; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Meeting Rescheduled</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${leadName},</h2>
            <p>Your demo meeting${userName ? ` with ${userName}` : ''} has been rescheduled to a new time.</p>
            
            <div class="time-change">
              <p><strong>⚠️ Important Time Change</strong></p>
              <p class="strikethrough">Previous Time: ${oldTimeFormatted}</p>
              <p class="highlight">New Time: ${newTimeFormatted}</p>
            </div>
            
            <div class="meeting-box">
              <h3>${meetingTitle || 'Demo Meeting'}</h3>
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              <p><strong>When:</strong> ${newTimeFormatted}</p>
              <p><strong>Meeting Link:</strong></p>
              <a href="${meetingLink}" class="button">Join Meeting</a>
              <p style="font-size: 12px; color: #666; word-break: break-all;">${meetingLink}</p>
            </div>
            
            <p><strong>What to prepare:</strong></p>
            <ul>
              <li>Add the new time to your calendar</li>
              <li>Test your camera and microphone before the meeting</li>
              <li>Ensure you have a stable internet connection</li>
              <li>Prepare any questions you'd like to discuss</li>
            </ul>
            
            <p>We look forward to meeting with you at the new time! If you have any questions or need to make further changes, please let us know.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Meeting Rescheduled

Hi ${leadName},

Your demo meeting${userName ? ` with ${userName}` : ''} has been rescheduled.

PREVIOUS TIME:
${oldTimeFormatted}

NEW TIME:
${newTimeFormatted}

MEETING DETAILS:
${meetingTitle || 'Demo Meeting'}
${company ? `Company: ${company}` : ''}
Meeting Link: ${meetingLink}

Please make sure to update your calendar with the new time. We look forward to meeting with you!

If you have any questions, please don't hesitate to reach out.
    `;

    return await this.sendEmail({
      to: leadEmail,
      subject: `📅 Meeting Rescheduled: ${meetingTitle || 'Demo'}`,
      html,
      text,
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    return zeptomailService.isReady();
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured(): boolean {
    return zeptomailService.isReady();
  }
}

export const emailService = new EmailService();
export { VerificationEmailData, PasswordResetEmailData };