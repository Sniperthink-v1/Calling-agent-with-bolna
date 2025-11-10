# Email Verification System Setup

## Overview

The AI Calling Agent platform includes a comprehensive email verification system that handles:
- Email verification for new user registrations
- Password reset functionality
- Welcome emails after verification
- Low credits notifications
- Verification reminders for unverified users
- Campaign summary emails with hot leads

## ZeptoMail API Configuration

The system uses **ZeptoMail API** (by Zoho) for reliable, API-based email delivery instead of SMTP.

### Step 1: Get ZeptoMail API Credentials
1. Sign up for a ZeptoMail account at [zeptomail.zoho.com](https://zeptomail.zoho.com)
2. Verify your sending domain (e.g., sniperthink.com)
3. Navigate to the API section in the ZeptoMail dashboard
4. Generate an API key
5. Copy the encoded API token (starts with "Zoho-enczapikey")

### Step 2: Configure Environment Variables
Add the following to your `.env` file:

```env
# Email Configuration (ZeptoMail API)
ZEPTOMAIL_API_URL=https://api.zeptomail.in/v1.1/email
ZEPTOMAIL_API_TOKEN=Zoho-enczapikey_YOUR_ENCODED_API_KEY_HERE
ZEPTOMAIL_FROM_EMAIL=noreply@sniperthink.com
ZEPTOMAIL_FROM_NAME=noreply
EMAIL_FROM=noreply@sniperthink.com
```

### Step 3: Test Configuration
You can test the email configuration using the admin endpoint:
```bash
GET /api/email/test
Authorization: Bearer <admin-token>
```

## Migration from SMTP

The system has been migrated from nodemailer SMTP to ZeptoMail API for:
- **Better Deliverability**: Higher email delivery rates
- **No SMTP Issues**: No port blocking or firewall issues
- **Faster Sending**: Direct API calls are faster than SMTP
- **Better Tracking**: Built-in delivery and bounce tracking
- **Higher Limits**: More generous sending limits

### What Changed
- ❌ Removed: `nodemailer` package and SMTP configuration
- ✅ Added: `zeptomail` npm package for API-based sending
- ✅ New Service: `zeptomailService.ts` handles all email operations
- ✅ Updated: `emailService.ts` and `meetingEmailService.ts` use the new API

### Old Environment Variables (Removed)
```env
# These are no longer needed:
ZEPTOMAIL_HOST=smtp.zeptomail.in
ZEPTOMAIL_PORT=587
ZEPTOMAIL_USER=emailapikey
ZEPTOMAIL_PASSWORD=your_password
```

## Email Verification Workflow

### New User Registration
1. User registers through Stack Auth
2. System creates local user record with 15 free credits
3. Email verification is automatically sent to the user
4. User clicks verification link in email
5. System marks email as verified
6. Welcome email is sent with credit information

### Manual Verification Resend
Users can request a new verification email:
```bash
POST /api/email/send-verification
Authorization: Bearer <token>
```

### Email Verification Process
```bash
POST /api/email/verify
{
  "token": "verification-token-from-email"
}
```

## Password Reset Integration

### Request Password Reset
```bash
POST /api/email/send-password-reset
{
  "email": "user@example.com"
}
```

### Reset Password
Since we use Stack Auth, password reset is handled by Stack Auth. The email contains a link that redirects to the Stack Auth password reset flow.

## Scheduled Tasks

The system includes automated tasks for email management:

### Verification Reminders
- Runs every 6 hours
- Sends reminders to users who haven't verified their email after 24 hours
- Can be manually triggered by admins

### Low Credits Notifications
- Runs every 24 hours
- Notifies users when their credit balance is below 5 credits
- Can be manually triggered by admins

## Admin Functions

### Send Verification Reminders
```bash
POST /api/email/admin/send-verification-reminders
Authorization: Bearer <admin-token>
{
  "hoursThreshold": 24
}
```

### Test Email Configuration
```bash
GET /api/email/test
Authorization: Bearer <admin-token>
```

## Email Templates

The system includes professionally designed HTML email templates for:
- Email verification
- Password reset
- Welcome messages
- Low credits notifications
- Credits added notifications
- Campaign summary with hot leads and CSV attachments
- Meeting invites, reschedules, and cancellations

All templates are responsive and include both HTML and plain text versions for maximum compatibility.

## ZeptoMail API Features

### Email Sending
```typescript
import zeptomailService from './services/zeptomailService';

// Simple email
await zeptomailService.sendSimpleEmail(
  'user@example.com',
  'Subject',
  '<h1>HTML Body</h1>',
  'Text body'
);

// Advanced email with attachments
await zeptomailService.sendEmail({
  to: { address: 'user@example.com', name: 'John Doe' },
  subject: 'Email with Attachment',
  htmlbody: '<p>See attached file</p>',
  textbody: 'See attached file',
  attachments: [{
    filename: 'report.pdf',
    content: fileBuffer,
    contentType: 'application/pdf'
  }]
});
```

### Benefits
- ✅ No SMTP port configuration needed
- ✅ No firewall or ISP blocking issues
- ✅ Built-in retry logic
- ✅ Automatic bounce handling
- ✅ Delivery tracking and analytics
- ✅ Higher sending limits compared to SMTP

## Security Features

- JWT tokens for email verification with 24-hour expiry
- Password reset tokens with 1-hour expiry
- Rate limiting on email endpoints
- Secure token generation and validation
- Email address validation and sanitization
- API token stored securely in environment variables

## Troubleshooting

### Common Issues

1. **Email not sending**: 
   - Check `ZEPTOMAIL_API_TOKEN` is correctly set
   - Verify your domain is validated in ZeptoMail dashboard
   - Check ZeptoMail API status

2. **Verification links not working**: 
   - Ensure `FRONTEND_URL` is correctly set
   - Check token expiry (24 hours for verification)

3. **Emails going to spam**: 
   - Verify domain authentication (SPF, DKIM, DMARC) in ZeptoMail
   - Use verified sender domain

4. **API token issues**:
   - Ensure token starts with "Zoho-enczapikey"
   - Token should be on a single line in .env file
   - No extra spaces or quotes around the token

### Logs
Email service logs all operations for debugging:
- Successful email sends with recipient details
- Failed email attempts with error messages
- Configuration issues
- Token verification attempts

### Testing
Test the email service:
```bash
# Manual test via API
GET /api/email/test
Authorization: Bearer <admin-token>

# Check service status
node -e "require('./dist/services/zeptomailService').default.isReady() && console.log('Ready')"
```

## Migration Checklist

If migrating from SMTP to ZeptoMail API:

- [x] Install zeptomail package: `npm install zeptomail`
- [x] Remove nodemailer: `npm uninstall nodemailer @types/nodemailer`
- [x] Update .env with new variables
- [x] Remove old SMTP variables from .env
- [x] Update emailService.ts
- [x] Update meetingEmailService.ts
- [x] Test email sending functionality
- [x] Update documentation