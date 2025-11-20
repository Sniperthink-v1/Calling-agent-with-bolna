# 🌍 Timezone Migration - Quick Reference Guide

## 📋 Quick Status

| Phase | Status | Completion |
|-------|--------|------------|
| **Phase 1**: Database & Utilities | ✅ COMPLETE | 100% |
| **Phase 2**: Backend Services | ✅ COMPLETE | 100% |
| **Phase 3**: API Endpoints | ✅ COMPLETE | 100% |
| **Phase 4**: Frontend Integration | ✅ COMPLETE | 100% |
| **Phase 5**: Testing | ⏳ PENDING | 0% |
| **Phase 6**: Deployment | ⏳ PENDING | 0% |
| **Phase 7**: Rollout | ⏳ PENDING | 0% |

**Overall Progress**: 57% (4/7 phases complete)

---

## 🎯 What Was Implemented

### User Timezone Settings
- ✅ Users can set their preferred timezone in profile
- ✅ Automatic browser detection with manual override
- ✅ Stored in database with auto-detection flag
- ✅ Used throughout the application

### Campaign Timezone Override
- ✅ Campaigns can have custom timezone (optional)
- ✅ Checkbox to enable campaign-specific timezone
- ✅ Falls back to user timezone if not set
- ✅ Scheduler respects campaign timezone

### Backend Integration
- ✅ IP-based timezone detection (geoip-lite)
- ✅ X-Timezone header from frontend
- ✅ Timezone validation utilities
- ✅ All services timezone-aware

### Frontend Integration
- ✅ Timezone settings in user profile
- ✅ Campaign timezone selector in creation form
- ✅ shadcn/ui components (NOT Material-UI)
- ✅ Toast notifications (sonner)

---

## 📁 Key Files

### Backend Files
```
backend/src/
├── migrations/
│   ├── 999_add_user_timezone.sql              ← User timezone schema
│   └── 1000_add_campaign_timezone.sql         ← Campaign timezone schema
├── utils/
│   └── timezoneUtils.ts                       ← Core utilities
├── middleware/
│   └── timezoneDetection.ts                   ← IP detection
├── services/
│   ├── userService.ts                         ← User profile API
│   ├── CallCampaignService.ts                 ← Campaign validation
│   ├── InMemoryCampaignScheduler.ts           ← Timezone-aware scheduling
│   ├── emailService.ts                        ← Dual timezone emails
│   ├── webhookService.ts                      ← Webhook timezone
│   └── notificationService.ts                 ← Notification timezone
└── types/
    └── campaign.ts                            ← Campaign types
```

### Frontend Files
```
Frontend/src/
├── utils/
│   └── timezone.ts                            ← Browser detection
├── types/
│   └── api.ts                                 ← User/Campaign types
├── components/
│   ├── settings/
│   │   └── TimezoneSettingsCard.tsx           ← Profile timezone UI
│   ├── campaigns/
│   │   ├── CampaignTimezoneSelectorCard.tsx   ← Campaign timezone UI
│   │   └── CreateCampaignModal.tsx            ← Campaign form (updated)
│   └── dashboard/
│       └── Profile.tsx                        ← Profile page (updated)
└── pages/
    └── Campaigns.tsx                          ← Campaign types (updated)
```

---

## 🔧 How to Use

### As a User

#### Set Your Timezone
1. Go to **Profile** page
2. Find **Timezone Settings** card
3. Select your timezone from dropdown (or use auto-detected)
4. Click **Save Settings**
5. ✅ All times will now display in your timezone

#### Create Campaign with Custom Timezone
1. Click **Create Campaign**
2. Fill in campaign details
3. Find **Campaign Timezone** section
4. ☑️ Check "Use custom timezone for this campaign"
5. Select timezone from dropdown
6. ✅ Campaign will run in selected timezone

---

## 🔍 How It Works

### User Timezone Detection Flow
```
1. User opens app
2. Frontend detects browser timezone (Intl.DateTimeFormat)
3. Sends X-Timezone header with every request
4. Backend middleware detects timezone from IP (fallback)
5. User can update timezone in profile
6. Timezone stored in database
7. All times formatted in user timezone
```

### Campaign Scheduling Flow
```
1. Campaign has optional custom timezone
2. Scheduler checks use_custom_timezone flag
3. If true: Use campaign_timezone
4. If false: Use user's timezone
5. Schedule calls within first_call_time - last_call_time window
6. Timezone-aware date/time calculations
```

---

## 📚 API Reference

### User Profile Endpoints

#### Get User Profile
```typescript
GET /api/users/profile

Response:
{
  user: {
    id: string;
    email: string;
    name: string;
    timezone?: string;                 // e.g., "America/New_York"
    timezoneAutoDetected?: boolean;    // true if auto-detected
    // ... other fields
  }
}
```

#### Update User Profile
```typescript
PUT /api/users/profile

Request Body:
{
  timezone?: string;                 // e.g., "America/Los_Angeles"
  timezoneAutoDetected?: boolean;    // false for manual
  // ... other fields
}

Response:
{
  success: true,
  data: { ...user }
}
```

### Campaign Endpoints

#### Create Campaign
```typescript
POST /api/campaigns

Request Body:
{
  name: string;
  agent_id: string;
  // ... other fields
  use_custom_timezone?: boolean;     // Optional: Enable custom timezone
  campaign_timezone?: string;        // Optional: "America/Chicago"
}
```

#### Upload CSV Campaign
```typescript
POST /api/campaigns/upload

FormData:
- file: File
- name: string
- agent_id: string
// ... other fields
- use_custom_timezone: "true" | "false"
- campaign_timezone: string
```

---

## 🛠️ Utilities

### Backend Utilities

```typescript
import { 
  isValidTimezone, 
  formatTimeInTimezone,
  getCurrentTimeInTimezone,
  convertBetweenTimezones 
} from './utils/timezoneUtils';

// Validate timezone
const valid = isValidTimezone('America/New_York'); // true

// Format time in timezone
const formatted = formatTimeInTimezone(
  new Date(),
  'America/New_York',
  'PPpp' // format pattern
);

// Get current time in timezone
const time = getCurrentTimeInTimezone('America/New_York');

// Convert between timezones
const converted = convertBetweenTimezones(
  new Date(),
  'America/New_York',
  'Europe/London'
);
```

### Frontend Utilities

```typescript
import { detectBrowserTimezone, COMMON_TIMEZONES } from '@/utils/timezone';

// Detect browser timezone
const timezone = detectBrowserTimezone(); // "America/New_York"

// Get list of common timezones
const timezones = COMMON_TIMEZONES;
// [
//   { value: 'America/New_York', label: 'Eastern Time (ET)' },
//   { value: 'America/Chicago', label: 'Central Time (CT)' },
//   ...
// ]
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### User Timezone Settings
- [ ] Open Profile page
- [ ] Verify timezone settings card appears
- [ ] Check auto-detected timezone is correct
- [ ] Change timezone manually
- [ ] Click Save Settings
- [ ] Verify success toast appears
- [ ] Refresh page - timezone should persist

#### Campaign Creation
- [ ] Open Create Campaign modal
- [ ] Verify campaign timezone section appears
- [ ] Check default (user timezone) is shown
- [ ] Enable "Use custom timezone" checkbox
- [ ] Select different timezone
- [ ] Verify "Effective timezone" updates
- [ ] Submit campaign
- [ ] Verify campaign created successfully

#### Timezone Display
- [ ] Check dashboard shows times in user timezone
- [ ] Check campaign list shows times correctly
- [ ] Check emails use user timezone
- [ ] Check notifications use user timezone

---

## 🐛 Troubleshooting

### Common Issues

#### "Timezone not saving"
**Solution**: Check browser console for API errors. Verify backend is running.

#### "Times showing in wrong timezone"
**Solution**: 
1. Check user profile has correct timezone set
2. Verify browser timezone detection is working
3. Check campaign doesn't have custom timezone override

#### "TypeScript errors"
**Solution**: 
```powershell
cd backend; npx tsc --noEmit  # Check backend
cd Frontend; npm run type-check # Check frontend
```

#### "Component not rendering"
**Solution**: 
- Verify shadcn/ui components are installed
- Check imports use `@/components/ui/*`
- Ensure not using Material-UI imports

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  -- ... existing columns
  timezone VARCHAR(50) DEFAULT 'UTC',
  timezone_auto_detected BOOLEAN DEFAULT true,
  timezone_detected_from_ip VARCHAR(50)
);
```

### Call Campaigns Table
```sql
CREATE TABLE call_campaigns (
  -- ... existing columns
  campaign_timezone VARCHAR(50),
  use_custom_timezone BOOLEAN DEFAULT false
);
```

---

## 🎨 UI Components

### TimezoneSettingsCard
**Location**: `Frontend/src/components/settings/TimezoneSettingsCard.tsx`  
**Used in**: Profile page  
**Features**:
- Auto-detected timezone badge
- Timezone dropdown selector
- Save/Reset buttons
- Loading states
- Toast notifications

### CampaignTimezoneSelectorCard
**Location**: `Frontend/src/components/campaigns/CampaignTimezoneSelectorCard.tsx`  
**Used in**: Campaign creation form  
**Features**:
- Custom timezone checkbox
- Conditional timezone dropdown
- Effective timezone display
- Helper text

---

## 🔐 Security Considerations

### Timezone Validation
- ✅ All timezones validated using `isValidTimezone()`
- ✅ Uses Intl API (no external dependency for validation)
- ✅ Prevents invalid timezone injection

### Data Privacy
- ✅ IP-based detection uses offline geoip-lite (no external API calls)
- ✅ User can override detected timezone
- ✅ Timezone data not shared externally

---

## 🚀 Next Steps

### For Developers

#### Phase 5: Testing
```bash
# Write unit tests
npm test

# Write integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

#### Phase 6: Deployment
```bash
# 1. Backup database
pg_dump -h <host> -U <user> <db> > backup.sql

# 2. Run migrations
npm run migrate

# 3. Deploy backend
npm run deploy:backend

# 4. Deploy frontend
npm run deploy:frontend
```

#### Phase 7: Rollout
- Monitor error rates
- Check user feedback
- Gradual rollout (10% → 50% → 100%)
- Document any issues

---

## 📞 Support

### Documentation
- Phase 1-4 Complete: `TIMEZONE_MIGRATION_PHASE4_COMPLETE.md`
- Validation Report: `TIMEZONE_MIGRATION_VALIDATION_COMPLETE.md`
- This Quick Reference: `TIMEZONE_MIGRATION_QUICK_REFERENCE.md`

### Key Contacts
- **Backend Lead**: Review `backend/src/utils/timezoneUtils.ts`
- **Frontend Lead**: Review `Frontend/src/components/settings/TimezoneSettingsCard.tsx`
- **Database Admin**: Review migrations in `backend/src/migrations/`

---

## ✅ Quick Validation

### Is Everything Working?

Run these checks:

```bash
# 1. Backend compiles
cd backend
npx tsc --noEmit
# Should show: No errors ✅

# 2. Frontend compiles
cd Frontend
npm run type-check
# Should show: No errors ✅

# 3. Check files exist
ls backend/src/migrations/999_add_user_timezone.sql
ls backend/src/migrations/1000_add_campaign_timezone.sql
ls backend/src/utils/timezoneUtils.ts
ls Frontend/src/components/settings/TimezoneSettingsCard.tsx
# All should exist ✅

# 4. Check TypeScript interfaces
grep "timezone" Frontend/src/types/api.ts
# Should show User and UserProfileUpdate interfaces ✅
```

---

## 🎉 Summary

**Migration Complete**: 4/7 phases (57%)  
**Status**: ✅ Ready for Testing  
**Next Action**: Begin Phase 5 (Testing)

### What's Working
- ✅ User timezone settings
- ✅ Campaign timezone override
- ✅ Browser detection
- ✅ IP-based detection
- ✅ Timezone validation
- ✅ UI components (shadcn/ui)
- ✅ API integration
- ✅ Database schema

### What's Pending
- ⏳ Unit tests
- ⏳ Integration tests
- ⏳ E2E tests
- ⏳ Production deployment
- ⏳ User rollout

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: ✅ READY FOR USE
