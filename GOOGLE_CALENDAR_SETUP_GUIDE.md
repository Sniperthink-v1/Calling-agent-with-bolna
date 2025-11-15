# Google Calendar Integration Setup Guide

## Google Cloud Console Configuration

To fix the "Access Blocked" error and enable Google Calendar integration, follow these steps:

### 1. Create/Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Enable the **Google Calendar API**:
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Calendar API"
   - Click **ENABLE**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Fill in the required information:
   - **App name**: Your app name (e.g., "Calling Agent Kiro")
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. **Scopes** - Click "Add or Remove Scopes" and add:
   ```
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```
5. **Test users** (if app is in Testing mode):
   - Add email addresses of users who should be able to access the integration
   - Click **ADD USERS** and enter email addresses
6. Click **SAVE AND CONTINUE** through all steps

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Application type**: **Web application**
4. **Name**: Give it a descriptive name (e.g., "Calling Agent Calendar OAuth")
5. **Authorized JavaScript origins**: Add your frontend URLs:
   ```
   http://localhost:5173
   https://calling-agent-with-bolna-production.up.railway.app
   ```
6. **Authorized redirect URIs**: Add your callback URL:
   ```
   https://calling-agent-with-bolna-production.up.railway.app/api/integrations/google/callback
   http://localhost:3000/api/integrations/google/callback
   ```
7. Click **CREATE**
8. **IMPORTANT**: Copy the **Client ID** and **Client Secret**

### 4. Update Backend Environment Variables

Add these variables to your backend `.env` file:

```env
# Google Calendar OAuth Configuration
GOOGLE_CALENDAR_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALENDAR_REDIRECT_URI=https://calling-agent-with-bolna-production.up.railway.app/api/integrations/google/callback

# Frontend URL (for redirecting after OAuth)
FRONTEND_URL=https://your-frontend-url.com
```

**For Railway deployment**, add these as environment variables in your Railway dashboard:
1. Go to your Railway project
2. Click on your backend service
3. Go to **Variables** tab
4. Add each variable above

### 5. Publishing the App (Optional - For Production)

If you want to allow any Google user to connect (not just test users):

1. Go to **OAuth consent screen**
2. Click **PUBLISH APP**
3. Submit for verification (required if requesting sensitive scopes)
4. Complete the verification process

**Note**: While in "Testing" mode, only the test users you added can use the integration.

### 6. Common Issues and Solutions

#### "Access Blocked: This app's request is invalid"
- **Cause**: Redirect URI mismatch
- **Solution**: Ensure the redirect URI in Google Console exactly matches:
  ```
  https://calling-agent-with-bolna-production.up.railway.app/api/integrations/google/callback
  ```

#### "This app isn't verified"
- **Cause**: App is in testing mode or not verified
- **Solution**: 
  - Add yourself as a test user
  - Or publish the app (see step 5)

#### "redirect_uri_mismatch"
- **Cause**: The URI doesn't match any authorized redirect URIs
- **Solution**: Double-check the redirect URI configuration in both:
  - Google Console → Credentials → Your OAuth client
  - Backend `.env` file (`GOOGLE_CALENDAR_REDIRECT_URI`)

#### "invalid_client"
- **Cause**: Wrong client ID or secret
- **Solution**: Verify the credentials in your `.env` file match those in Google Console

### 7. Testing the Integration

1. **Restart your backend** after adding environment variables
2. In the mobile app, go to **Integrations** screen
3. Toggle the Google Calendar switch
4. Click **Continue** when prompted
5. You should be redirected to Google's authorization page
6. Sign in and grant permissions
7. You'll be redirected back to the app
8. Pull down to refresh - status should show "Connected"

### 8. Required Environment Variables Summary

```env
# Minimum required for Google Calendar integration
GOOGLE_CALENDAR_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=xxx
GOOGLE_CALENDAR_REDIRECT_URI=https://your-backend-url.com/api/integrations/google/callback
FRONTEND_URL=https://your-frontend-url.com
```

### 9. Mobile App Considerations

For the mobile app integration:
- The OAuth flow opens in the device browser
- After authorization, users need to pull down to refresh the integration status
- The callback redirects to the frontend, not back to the mobile app
- Consider implementing deep linking for a better mobile UX in future updates

### 10. Security Best Practices

1. **Never commit** `.env` files to version control
2. **Rotate secrets** periodically
3. **Use HTTPS** in production for all redirect URIs
4. **Restrict scopes** to only what's needed
5. **Monitor usage** in Google Cloud Console

---

## Quick Checklist

- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Test users added (if in Testing mode)
- [ ] OAuth credentials created
- [ ] Redirect URIs match exactly
- [ ] Environment variables added to backend
- [ ] Backend restarted with new env vars
- [ ] Test the integration flow

---

## Support

If you continue to experience issues:
1. Check Railway logs for backend errors
2. Verify all URLs use HTTPS in production
3. Ensure environment variables are loaded correctly
4. Check Google Cloud Console → APIs & Services → Dashboard for quota/errors
