# System Configuration Analysis

## Current System Config Values

Based on the provided system_config table data, here are all the configurations and their current usage status:

## ✅ Currently Integrated (4/11)

### 1. `credits_per_minute` - ✅ IMPLEMENTED
- **Current Value**: 1
- **Usage**: BillingService credit calculations
- **Status**: ✅ Already integrated in configService and billingService.ts

### 2. `new_user_bonus_credits` - ✅ IMPLEMENTED  
- **Current Value**: 15
- **Usage**: BillingService for new user registration bonus
- **Status**: ✅ Already integrated in configService and billingService.ts

### 3. `minimum_credit_purchase` - ✅ IMPLEMENTED
- **Current Value**: 50
- **Usage**: StripeService validation and billing routes
- **Status**: ✅ Already integrated in configService, stripeService.ts, and billing.ts routes

### 4. `max_contacts_per_upload` - ✅ IMPLEMENTED
- **Current Value**: 1000
- **Usage**: ContactService upload validation and campaign routes
- **Status**: ✅ Already integrated in configService, contactService.ts, and campaignRoutes.ts

## ❌ NOT YET INTEGRATED (7/11)

### 5. `session_duration_hours` - ❌ NEEDS IMPLEMENTATION
- **Current Value**: 24
- **Hard-coded Usage**: 
  - `authService.ts` line 38: `JWT_EXPIRES_IN = '24h'`
  - `authService.ts` line 77: `exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)`
  - `server.ts` line 138: `maxAge: 86400 // 24 hours`
- **Action Needed**: Update JWT token expiration and session cookie maxAge

### 6. `password_min_length` - ❌ NEEDS IMPLEMENTATION
- **Current Value**: 6
- **Hard-coded Usage**:
  - `authController.ts` line 548: `.withMessage('Password must be at least 6 characters long')`
- **Action Needed**: Update password validation in auth routes and controller

### 7. `password_reset_token_expiry_hours` - ❌ NEEDS IMPLEMENTATION
- **Current Value**: 1
- **Hard-coded Usage**: Likely in password reset functionality
- **Action Needed**: Find and update password reset token expiration logic

### 8. `max_login_attempts` - ❌ NEEDS IMPLEMENTATION
- **Current Value**: 5  
- **Hard-coded Usage**:
  - `authService.ts` line 41: `MAX_LOGIN_ATTEMPTS = 5`
- **Action Needed**: Update login attempt tracking logic

### 9. `lockout_duration_minutes` - ❌ NEEDS IMPLEMENTATION
- **Current Value**: 30
- **Hard-coded Usage**:
  - `authService.ts` line 42: `LOCKOUT_DURATION = 30 * 60 * 1000`
- **Action Needed**: Update account lockout duration logic

### 10. `require_email_verification` - ❌ NEEDS IMPLEMENTATION
- **Current Value**: true
- **Hard-coded Usage**: Likely in registration and authentication flows
- **Action Needed**: Update email verification requirements

### 11. `kpi_refresh_interval_minutes` - ❌ NEEDS IMPLEMENTATION
- **Current Value**: 15
- **Hard-coded Usage**: Likely in analytics/KPI refresh jobs
- **Action Needed**: Find and update KPI refresh scheduling

## Implementation Priority

### HIGH PRIORITY (Security & Authentication)
1. **session_duration_hours** - JWT and session security
2. **password_min_length** - Password security validation  
3. **max_login_attempts** - Brute force protection
4. **lockout_duration_minutes** - Account security
5. **password_reset_token_expiry_hours** - Password reset security

### MEDIUM PRIORITY (User Experience)
6. **require_email_verification** - User onboarding flow

### LOW PRIORITY (System Operations)  
7. **kpi_refresh_interval_minutes** - Background job timing

## Files That Need Updates

### Authentication & Security
- `backend/src/services/authService.ts` - JWT expiration, login attempts, lockout
- `backend/src/controllers/authController.ts` - Password validation
- `backend/src/routes/auth.ts` - Password validation middleware
- `backend/src/server.ts` - Session cookie maxAge

### User Registration
- `backend/src/controllers/authController.ts` - Email verification requirements
- `backend/src/services/emailService.ts` - Email verification logic

### Background Jobs
- Find KPI refresh scheduling code
- Update analytics refresh intervals

## Recommended Next Steps

1. **Update ConfigService**: Add the missing config keys to the interface and loading logic
2. **Update AuthService**: Replace all hard-coded auth values with configService calls
3. **Update Password Validation**: Make password requirements dynamic
4. **Update Session Management**: Make session duration configurable
5. **Update Email Verification**: Make email verification requirement configurable
6. **Find KPI Jobs**: Locate and update KPI refresh interval logic

This will complete the system configuration integration and eliminate all remaining hard-coded values.