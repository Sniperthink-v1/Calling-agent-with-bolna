# User-Specific Timezone Implementation Plan

## 📋 Executive Summary

This document outlines the complete plan to migrate from a static `Asia/Kolkata` timezone to user-specific timezone settings across the entire application. This will enable international users to see dates/times in their local timezone.

---

## ✅ Implementation Decisions

### 1. **Timezone Selection Method**
**Decision:** Auto-detect on registration with manual override option
- Browser timezone auto-detection on registration
- User can manually override in profile settings
- Provides best UX without forcing user interaction

### 2. **Default Timezone Strategy**
**Decision:** UTC for new features, backward compatible migration
- New users without timezone: **UTC**
- Existing users: **Asia/Kolkata** (preserves current behavior)
- API calls without context: **UTC**

### 3. **Campaign Scheduling Logic**
**Decision:** User's timezone with per-campaign timezone selector
- Campaign time windows (9 AM - 6 PM) run in dashboard user's timezone by default
- **NEW:** Add timezone selector in campaign creation UI for flexibility
- Each campaign can optionally override with a different timezone

### 4. **Email Notification Formatting**
**Decision:** User's timezone + UTC reference
- Format: "Meeting at 2:00 PM PST (22:00 UTC)"
- Provides clarity for international users
- Always includes UTC as universal reference

### 5. **Meeting Scheduling Behavior**
**Decision:** Use user's timezone for Google Calendar events
- Calendar events created in user's timezone
- Google Calendar auto-converts for attendees in their timezones
- Simplest and most intuitive approach

### 6. **Migration of Existing Data**
**Decision:** Set all existing users to Asia/Kolkata
- Preserves current application behavior
- No disruption to existing users
- Users can update timezone in settings when needed

---

## 🗄️ Database Changes

### 1. **Add timezone Column to Users Table**

```sql
-- Migration: 999_add_user_timezone.sql
ALTER TABLE users 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
ADD COLUMN timezone_auto_detected BOOLEAN DEFAULT false,
ADD COLUMN timezone_manually_set BOOLEAN DEFAULT false,
ADD COLUMN timezone_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for timezone queries
CREATE INDEX idx_users_timezone ON users(timezone);

-- Set existing users to Asia/Kolkata (preserve current behavior)
UPDATE users 
SET timezone = 'Asia/Kolkata', 
    timezone_manually_set = false,
    timezone_updated_at = NOW()
WHERE timezone = 'UTC';

COMMENT ON COLUMN users.timezone IS 'IANA timezone identifier (e.g., America/New_York, Asia/Kolkata, Europe/London)';
COMMENT ON COLUMN users.timezone_auto_detected IS 'True if timezone was auto-detected from browser/IP';
COMMENT ON COLUMN users.timezone_manually_set IS 'True if user manually selected timezone in settings';
```

### 2. **Add timezone Column to Campaigns Table**

```sql
-- Migration: 1000_add_campaign_timezone.sql
ALTER TABLE call_campaigns 
ADD COLUMN campaign_timezone VARCHAR(50),
ADD COLUMN use_custom_timezone BOOLEAN DEFAULT false;

-- Update existing campaigns to use user's timezone (NULL = use user timezone)
UPDATE call_campaigns 
SET campaign_timezone = NULL,
    use_custom_timezone = false;

CREATE INDEX idx_campaigns_timezone ON call_campaigns(campaign_timezone);

COMMENT ON COLUMN call_campaigns.campaign_timezone IS 'Optional: Override timezone for this campaign. If NULL, uses user timezone';
COMMENT ON COLUMN call_campaigns.use_custom_timezone IS 'True if campaign uses custom timezone instead of user timezone';
```

---

## 🔧 Backend Implementation

### 1. **Update User Model**

**File:** `backend/src/models/User.ts`

```typescript
export interface UserInterface extends BaseModelInterface {
  // ... existing fields ...
  
  // Timezone fields
  timezone: string; // IANA timezone (e.g., 'America/New_York')
  timezone_auto_detected?: boolean;
  timezone_manually_set?: boolean;
  timezone_updated_at?: Date | null;
}

export class UserModel extends BaseModel<UserInterface> {
  /**
   * Update user timezone
   */
  async updateTimezone(
    userId: string, 
    timezone: string, 
    manuallySet: boolean = true
  ): Promise<UserInterface | null> {
    return await this.update(userId, { 
      timezone,
      timezone_manually_set: manuallySet,
      timezone_updated_at: new Date()
    });
  }

  /**
   * Get user timezone (fallback to UTC if not set)
   */
  async getUserTimezone(userId: string): Promise<string> {
    const user = await this.findById(userId);
    return user?.timezone || 'UTC';
  }
}
```

---

### 2. **Create Timezone Utility Service**

**File:** `backend/src/utils/timezoneUtils.ts`

```typescript
/**
 * Timezone Utilities
 * Centralized timezone conversion and formatting logic
 */

import { logger } from './logger';

/**
 * Valid IANA timezones (can be expanded)
 */
export const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Pacific/Auckland',
  // Add more as needed
] as const;

export type SupportedTimezone = typeof VALID_TIMEZONES[number];

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert UTC date to user's timezone
 */
export function convertToUserTimezone(
  utcDate: Date,
  userTimezone: string
): Date {
  try {
    // Get the date string in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return new Date(formatter.format(utcDate));
  } catch (error) {
    logger.error('Timezone conversion failed, falling back to UTC', {
      utcDate,
      userTimezone,
      error
    });
    return utcDate;
  }
}

/**
 * Format date for user's timezone
 */
export function formatDateForTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      ...options
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    logger.error('Date formatting failed', { date, timezone, error });
    return date.toISOString();
  }
}

/**
 * Get user-friendly timezone name
 */
export function getTimezoneName(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'long'
  });
  
  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');
  
  return timeZonePart?.value || timezone;
}

/**
 * Calculate timezone offset in minutes
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  try {
    // Get offset by comparing local time in timezone to UTC
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch (error) {
    logger.error('Failed to calculate timezone offset', { timezone, error });
    return 0;
  }
}

/**
 * Convert campaign time window to user timezone
 * Example: "09:00" in UTC to user's timezone
 */
export function convertTimeWindowToTimezone(
  timeString: string, // Format: "HH:MM" or "HH:MM:SS"
  fromTimezone: string,
  toTimezone: string,
  referenceDate: Date = new Date()
): string {
  try {
    const [hours, minutes, seconds = '00'] = timeString.split(':');
    
    // Create date in source timezone
    const dateInSource = new Date(
      referenceDate.toLocaleString('en-US', { timeZone: fromTimezone })
    );
    dateInSource.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
    
    // Convert to target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: toTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return formatter.format(dateInSource);
  } catch (error) {
    logger.error('Time window conversion failed', {
      timeString,
      fromTimezone,
      toTimezone,
      error
    });
    return timeString; // Return original on error
  }
}
```

---

### 3. **Update Authentication/Registration**

**File:** `backend/src/controllers/authController.ts`

```typescript
/**
 * Detect timezone from request
 */
function detectTimezoneFromRequest(req: Request): {
  timezone: string;
  autoDetected: boolean;
} {
  // Option 1: From request header (set by frontend)
  const headerTimezone = req.headers['x-timezone'] as string;
  
  if (headerTimezone && isValidTimezone(headerTimezone)) {
    return {
      timezone: headerTimezone,
      autoDetected: true
    };
  }
  
  // Option 2: From request body during registration
  const bodyTimezone = req.body.timezone as string;
  
  if (bodyTimezone && isValidTimezone(bodyTimezone)) {
    return {
      timezone: bodyTimezone,
      autoDetected: false
    };
  }
  
  // Fallback to UTC
  return {
    timezone: 'UTC',
    autoDetected: false
  };
}

// In registration endpoint:
async register(req: Request, res: Response) {
  // ... existing code ...
  
  const { timezone, autoDetected } = detectTimezoneFromRequest(req);
  
  const newUser = await UserModel.create({
    // ... existing fields ...
    timezone,
    timezone_auto_detected: autoDetected,
    timezone_manually_set: !autoDetected,
    timezone_updated_at: new Date()
  });
  
  // ... rest of registration logic ...
}
```

---

### 4. **Update Email Services**

**File:** `backend/src/services/emailService.ts`

```typescript
import { formatDateForTimezone } from '../utils/timezoneUtils';

/**
 * Format meeting time for email
 */
function formatMeetingTimeForEmail(
  meetingTime: Date,
  userTimezone: string
): string {
  const userTime = formatDateForTimezone(meetingTime, userTimezone, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  const utcTime = meetingTime.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
  
  return `${userTime} (${utcTime})`;
}

// Update meeting notification email template
async sendMeetingBookedNotification(params: {
  userEmail: string;
  userName: string;
  userTimezone: string; // NEW: pass user timezone
  meetingDetails: {
    meetingTime: Date;
    // ... other fields ...
  };
}) {
  const formattedTime = formatMeetingTimeForEmail(
    params.meetingDetails.meetingTime,
    params.userTimezone
  );
  
  // Use formattedTime in email template
  const emailHtml = `
    <div class="meeting-time">
      <strong>Meeting Time:</strong> ${formattedTime}
    </div>
  `;
  
  // ... rest of email logic ...
}
```

---

### 5. **Update Campaign Scheduler**

**File:** `backend/src/services/InMemoryCampaignScheduler.ts`

```typescript
/**
 * Load campaign schedules and convert time windows to effective timezone
 */
private async loadCampaignSchedules(): Promise<void> {
  const result = await pool.query(`
    SELECT 
      c.id,
      c.user_id,
      c.first_call_time,
      c.last_call_time,
      c.start_date,
      c.end_date,
      c.campaign_timezone,
      c.use_custom_timezone,
      u.timezone as user_timezone
    FROM call_campaigns c
    JOIN users u ON u.id = c.user_id
    WHERE c.status IN ('active', 'scheduled')
    AND c.is_deleted = false
  `);
  
  for (const campaign of result.rows) {
    // Determine effective timezone (campaign override or user timezone)
    const effectiveTimezone = campaign.use_custom_timezone && campaign.campaign_timezone
      ? campaign.campaign_timezone
      : campaign.user_timezone || 'UTC';
    
    // Convert time window from effective timezone to UTC for internal processing
    const firstCallUTC = convertTimeWindowToTimezone(
      campaign.first_call_time,
      effectiveTimezone,
      'UTC'
    );
    
    const lastCallUTC = convertTimeWindowToTimezone(
      campaign.last_call_time,
      effectiveTimezone,
      'UTC'
    );
    
    // Store in memory with UTC times
    this.campaignSchedules.set(campaign.id, {
      ...campaign,
      first_call_time_utc: firstCallUTC,
      last_call_time_utc: lastCallUTC,
      effective_timezone: effectiveTimezone,
      user_timezone: campaign.user_timezone
    });
  }
}
```

---

### 6. **Update Webhook Services**

**File:** `backend/src/services/webhookService.ts`

When sending meeting notifications, fetch user timezone:

```typescript
// Fetch user timezone along with email
const userResult = await database.query(
  'SELECT email, name, timezone FROM users WHERE id = $1',
  [updatedCall.user_id]
);

const user = userResult.rows[0];

notificationService.sendNotification({
  userId,
  email: user.email,
  notificationType: 'meeting_booked',
  notificationData: {
    userName: user.name || 'User',
    userTimezone: user.timezone || 'UTC', // NEW
    meetingDetails: {
      // ... existing fields ...
    }
  }
});
```

---

### 7. **Update Dashboard APIs**

**File:** `backend/src/controllers/dashboardController.ts`

```typescript
/**
 * Get dashboard KPIs with timezone-aware date formatting
 */
async getDashboardKPIs(req: Request, res: Response) {
  const userId = req.user?.id;
  const user = await UserModel.findById(userId);
  const userTimezone = user?.timezone || 'UTC';
  
  // Fetch data...
  const kpis = await DashboardKpiService.getUserKPISummary(userId);
  
  // Format dates for user's timezone
  const formattedKpis = {
    ...kpis,
    last_updated: formatDateForTimezone(
      new Date(kpis.last_updated),
      userTimezone
    ),
    // ... format other date fields ...
  };
  
  res.json({
    success: true,
    data: formattedKpis,
    timezone: userTimezone
  });
}
```

---

## 🎨 Frontend Implementation

### 1. **Auto-Detect Timezone on Load**

**File:** `frontend/src/utils/timezone.ts`

```typescript
/**
 * Detect user's timezone from browser
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone', error);
    return 'UTC';
  }
}

/**
 * Format date in user's timezone
 */
export function formatDateInUserTimezone(
  date: Date | string,
  timezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const tz = timezone || detectBrowserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Get timezone offset string (e.g., "GMT+5:30")
 */
export function getTimezoneOffsetString(timezone?: string): string {
  const tz = timezone || detectBrowserTimezone();
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  
  return tzPart?.value || tz;
}
```

---

### 2. **Add Timezone Header to API Calls**

**File:** `frontend/src/services/apiService.ts`

```typescript
import { detectBrowserTimezone } from '../utils/timezone';

// Add timezone header to all API requests
axios.interceptors.request.use((config) => {
  config.headers['X-Timezone'] = detectBrowserTimezone();
  return config;
});
```

---

### 3. **User Settings - Timezone Selector**

**File:** `frontend/src/components/settings/TimezoneSettings.tsx`

```typescript
import React, { useState } from 'react';
import { detectBrowserTimezone } from '../../utils/timezone';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris, Brussels, Amsterdam' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (Mumbai, Delhi, Kolkata)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  // ... add more
];

export function TimezoneSettings() {
  const [timezone, setTimezone] = useState<string>('');
  const [detectedTimezone] = useState(detectBrowserTimezone());
  
  const handleSave = async () => {
    await api.put('/users/profile', {
      timezone: timezone || detectedTimezone
    });
    
    // Refresh page to reload all dates
    window.location.reload();
  };
  
  return (
    <div className="timezone-settings">
      <h3>Timezone Settings</h3>
      
      <div className="detected-timezone">
        <p>Detected: {detectedTimezone}</p>
      </div>
      
      <select 
        value={timezone} 
        onChange={(e) => setTimezone(e.target.value)}
      >
        <option value="">Select Timezone</option>
        {TIMEZONES.map(tz => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
      
      <button onClick={handleSave}>
        Save Timezone
      </button>
    </div>
  );
}
```

---

### 4. **Campaign Creation - Timezone Selector**

**File:** `frontend/src/components/campaigns/CampaignTimezoneSelector.tsx`

```typescript
import React, { useState } from 'react';
import { detectBrowserTimezone } from '../../utils/timezone';

interface CampaignTimezoneSelectorProps {
  userTimezone: string;
  selectedTimezone?: string;
  useCustomTimezone: boolean;
  onTimezoneChange: (timezone: string | null, useCustom: boolean) => void;
}

export function CampaignTimezoneSelector({
  userTimezone,
  selectedTimezone,
  useCustomTimezone,
  onTimezoneChange
}: CampaignTimezoneSelectorProps) {
  const [useCustom, setUseCustom] = useState(useCustomTimezone);
  const [customTz, setCustomTz] = useState(selectedTimezone || '');
  
  const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Asia/Kolkata', label: 'India Standard Time' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    // ... add more
  ];
  
  const handleToggle = (checked: boolean) => {
    setUseCustom(checked);
    if (!checked) {
      onTimezoneChange(null, false);
    } else {
      onTimezoneChange(customTz || userTimezone, true);
    }
  };
  
  const handleTimezoneSelect = (tz: string) => {
    setCustomTz(tz);
    onTimezoneChange(tz, true);
  };
  
  return (
    <div className="campaign-timezone-selector">
      <div className="timezone-option">
        <label>
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          Use custom timezone for this campaign
        </label>
      </div>
      
      {!useCustom && (
        <div className="current-timezone">
          <p>
            <strong>Using your timezone:</strong> {userTimezone}
          </p>
          <small>Campaign will run 9 AM - 6 PM in {userTimezone}</small>
        </div>
      )}
      
      {useCustom && (
        <div className="custom-timezone-select">
          <label>Campaign Timezone:</label>
          <select 
            value={customTz} 
            onChange={(e) => handleTimezoneSelect(e.target.value)}
          >
            <option value="">Select Timezone</option>
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <small>Campaign will run 9 AM - 6 PM in {customTz || 'selected timezone'}</small>
        </div>
      )}
    </div>
  );
}
```

**Integration in Campaign Form:**

```typescript
// In CampaignCreationForm component
const [campaignTimezone, setCampaignTimezone] = useState<string | null>(null);
const [useCustomTimezone, setUseCustomTimezone] = useState(false);

const handleTimezoneChange = (timezone: string | null, useCustom: boolean) => {
  setCampaignTimezone(timezone);
  setUseCustomTimezone(useCustom);
};

// In form submission
const handleSubmit = async () => {
  const campaignData = {
    // ... other fields
    campaign_timezone: useCustomTimezone ? campaignTimezone : null,
    use_custom_timezone: useCustomTimezone
  };
  
  await api.post('/campaigns', campaignData);
};

// In JSX
<CampaignTimezoneSelector
  userTimezone={user.timezone}
  selectedTimezone={campaignTimezone}
  useCustomTimezone={useCustomTimezone}
  onTimezoneChange={handleTimezoneChange}
/>
```

---

### 5. **Update Dashboard Components**

```typescript
// In LeadIntelligence, Campaign tables, etc.
import { formatDateInUserTimezone } from '../../utils/timezone';

// Instead of:
<td>{new Date(call.created_at).toLocaleString()}</td>

// Use:
<td>{formatDateInUserTimezone(call.created_at, user.timezone)}</td>
```

---

### 6. **Campaign Details - Show Effective Timezone**

```typescript
// Display which timezone the campaign is using
<div className="campaign-timezone-info">
  {campaign.use_custom_timezone ? (
    <p>
      <strong>Campaign Timezone:</strong> {campaign.campaign_timezone}
      <br />
      <small>Time window: {campaign.first_call_time} - {campaign.last_call_time} {campaign.campaign_timezone}</small>
    </p>
  ) : (
    <p>
      <strong>Using your timezone:</strong> {user.timezone}
      <br />
      <small>Time window: {campaign.first_call_time} - {campaign.last_call_time} {user.timezone}</small>
    </p>
  )}
</div>
```

---

## 🔄 Migration Steps

### Phase 1: Database & Models (Week 1)
- [ ] Run migration to add `timezone` column to users table
- [ ] Run migration to add `campaign_timezone` and `use_custom_timezone` to campaigns table
- [ ] Set existing users to `Asia/Kolkata`
- [ ] Update User model with timezone fields
- [ ] Update Campaign types with timezone fields
- [ ] Deploy to staging

### Phase 2: Backend Core Services (Week 2)
- [ ] Create timezone utils (`timezoneUtils.ts`)
- [ ] Update authentication controller (auto-detect timezone)
- [ ] Add timezone header parsing in API middleware
- [ ] Update User profile endpoints (GET/PUT timezone)
- [ ] Test timezone validation and conversion functions

### Phase 3: Backend Campaign & Email (Week 2-3)
- [ ] Update campaign creation API (accept campaign_timezone)
- [ ] Update InMemoryCampaignScheduler (effective timezone logic)
- [ ] Update email services (format with user timezone + UTC)
- [ ] Update webhook services (fetch user timezone)
- [ ] Update dashboard APIs (timezone-aware formatting)
- [ ] Test with multiple timezones

### Phase 4: Frontend Core (Week 3)
- [ ] Create timezone utils (`frontend/src/utils/timezone.ts`)
- [ ] Add timezone detection on app load
- [ ] Add X-Timezone header to all API requests
- [ ] Create TimezoneSettings component
- [ ] Integrate timezone settings in user profile page
- [ ] Test timezone auto-detection

### Phase 5: Frontend Campaign UI (Week 3-4)
- [ ] Create CampaignTimezoneSelector component
- [ ] Integrate timezone selector in campaign creation form
- [ ] Update campaign details view (show effective timezone)
- [ ] Update all date display components (use formatDateInUserTimezone)
- [ ] Update dashboard tables and charts
- [ ] Test on staging

### Phase 6: Campaign Scheduler Testing (Week 4)
- [ ] Test campaign scheduling with user timezone
- [ ] Test campaign scheduling with custom timezone
- [ ] Verify time window calculations (9 AM - 6 PM conversions)
- [ ] Test edge cases (daylight saving time, cross-timezone)
- [ ] Verify call scheduling accuracy

### Phase 7: Integration & Rollout (Week 5)
- [ ] Remove `DB_TIMEZONE` from `.env`
- [ ] Comprehensive timezone testing (all features)
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Update user documentation

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Timezone validation
- [ ] Date conversion accuracy
- [ ] Time window calculations
- [ ] Default timezone fallback

### Integration Tests
- [ ] User registration with timezone
- [ ] Profile update timezone
- [ ] Campaign scheduling across timezones
- [ ] Email formatting with timezones

### Manual Testing Scenarios
- [ ] User in NY schedules campaign for 9 AM EST
- [ ] User in India views call history
- [ ] User in London receives meeting notification
- [ ] Campaign runs at correct local time
- [ ] Google Calendar events show correct timezone

---

## 📊 Impact Analysis

### Affected Features
1. **High Impact:**
   - Campaign scheduling (time windows)
   - Email notifications (meeting times, summaries)
   - Dashboard analytics (date filters, charts)
   - Call history display

2. **Medium Impact:**
   - Meeting scheduling
   - User profile
   - Admin panel (viewing user data)

3. **Low Impact:**
   - Credit transactions
   - Agent configuration

### Database Storage Strategy
- **ALWAYS store in UTC**: 
  - `created_at`, `updated_at` (all tables)
  - `call_time`, `call_started_at`, `call_ended_at` (calls table)
  - `meeting_start_time` (calendar_meetings table)
  - All system-generated timestamps
  
- **Store in user/campaign timezone**:
  - `first_call_time`, `last_call_time` (campaigns table) - stored as user entered
  - `start_date`, `end_date` (campaigns table) - dates without time
  
- **Conversion logic**:
  - Convert time windows to UTC for scheduling engine
  - Convert UTC to user timezone for display
  - Use effective timezone (campaign_timezone || user_timezone) for campaign operations

---

## 🚨 Environment Variable Cleanup

**Remove from `.env`:**
```diff
- DB_TIMEZONE=Asia/Kolkata
```

**Update `.env.example`:**
```bash
# User timezones are now stored per-user in database
# No static timezone configuration needed
```

---

## 📝 Documentation Updates

### API Documentation
- Document timezone header: `X-Timezone`
- Document timezone in user profile response
- Document date format in all responses

### User Guide
- How to change timezone
- What timezone affects
- Troubleshooting timezone issues

---

## 🎯 Success Metrics

- [ ] All existing users can see their data correctly
- [ ] New international users can set their timezone
- [ ] Campaign scheduling works in user's timezone
- [ ] Email notifications show correct times
- [ ] No timezone-related bugs in production
- [ ] Performance impact < 5% on API response time

---

## 🔗 Files to Create/Modify

### New Files
- `backend/src/utils/timezoneUtils.ts` - Timezone conversion utilities
- `backend/src/migrations/999_add_user_timezone.sql` - User timezone migration
- `backend/src/migrations/1000_add_campaign_timezone.sql` - Campaign timezone migration
- `frontend/src/utils/timezone.ts` - Frontend timezone utilities
- `frontend/src/components/settings/TimezoneSettings.tsx` - User timezone settings
- `frontend/src/components/campaigns/CampaignTimezoneSelector.tsx` - Campaign timezone picker

### Files to Modify
- `backend/src/models/User.ts` - Add timezone fields and methods
- `backend/src/types/campaign.ts` - Add campaign timezone fields
- `backend/src/controllers/authController.ts` - Auto-detect timezone on registration
- `backend/src/services/emailService.ts` - Format dates with timezone
- `backend/src/services/InMemoryCampaignScheduler.ts` - Effective timezone logic
- `backend/src/services/webhookService.ts` - Fetch user timezone
- `backend/src/controllers/dashboardController.ts` - Timezone-aware responses
- `frontend/src/services/apiService.ts` - Add X-Timezone header
- `frontend/src/components/dashboard/*` - Use timezone formatting
- `frontend/src/components/campaigns/*` - Add timezone selector
- `.env` - Remove DB_TIMEZONE
- `.env.example` - Remove DB_TIMEZONE reference

---

## ✅ Ready to Implement

All decisions finalized:
- ✅ Auto-detect timezone with manual override
- ✅ UTC default for new users, Asia/Kolkata for existing
- ✅ User timezone + campaign-level timezone override
- ✅ Email format: "2:00 PM PST (22:00 UTC)"
- ✅ Google Calendar uses user timezone
- ✅ Existing users migrated to Asia/Kolkata

**Next Step:** Start Phase 1 - Database migrations

---

*Last Updated: November 19, 2025*
