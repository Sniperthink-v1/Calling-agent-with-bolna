# Timezone Standardization - Complete Implementation Plan

## 📋 Executive Summary

**Goal:** Standardize the system to run on UTC with user-specific timezone conversions at query time.

**Key Decisions:**
- ✅ Database sessions: **UTC**
- ✅ Node.js process: **UTC**
- ✅ Storage: **All timestamps in UTC**
- ✅ Frontend receives: **ISO UTC strings**
- ✅ Conversion: **User timezone at query time using `AT TIME ZONE`**
- ⛔ Campaign logic: **DO NOT TOUCH** (already working correctly)
- ⛔ Old data: **Leave as-is** (test data only)

---

## 🔍 Phase 1: Backend Configuration Changes

### 1.1 Files to Modify

#### File 1: `backend/src/services/connectionPoolService.ts`

**Current Code (Line 38):**
```typescript
private sessionTimeZone: string = (process.env.DB_TIMEZONE || 'Asia/Kolkata').trim();
```

**Change To:**
```typescript
private sessionTimeZone: string = 'UTC';
```

**Current Code (Line 95):**
```typescript
const tzSql = tzIsValid ? tz : 'Asia/Kolkata';
if (!tzIsValid) {
  logger.warn('Invalid DB_TIMEZONE provided, falling back to Asia/Kolkata', { provided: tz });
}
```

**Change To:**
```typescript
const tzSql = 'UTC'; // Always use UTC for database sessions
```

---

#### File 2: `backend/src/server.ts`

**Current Code (Lines 40-44):**
```typescript
const timezone = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Kolkata';
process.env.TZ = timezone;
logger.info(`Server default timezone set to: ${timezone} (user-specific timezones are cached per-request)`);
console.log(`🌍 Server default timezone: ${timezone} (users can have their own timezones)`);
```

**Change To:**
```typescript
// Force UTC for consistent timestamp handling - user timezones are applied at query time
process.env.TZ = 'UTC';
logger.info('Server timezone set to UTC (user-specific timezones applied at query/display time)');
console.log('🌍 Server timezone: UTC (user timezones applied at query time)');
```

---

#### File 3: `backend/src/controllers/followUpController.ts`

**Current Code (Lines 43-49):**
```typescript
// Set session time zone for all connections from this Pool
const tz = (process.env.DB_TIMEZONE || 'Asia/Kolkata').trim();
const tzIsValid = /^[A-Za-z_\/+-:]{1,64}$/.test(tz);
const tzSql = tzIsValid ? tz : 'Asia/Kolkata';
this.pool.on('connect', (client) => {
  client.query(`SET TIME ZONE '${tzSql}'`).catch((err) => {
    console.warn('Failed to set session time zone for followUpController pool', tzSql, err?.message);
  });
});
```

**Change To:**
```typescript
// Set session time zone to UTC for all connections
this.pool.on('connect', (client) => {
  client.query(`SET TIME ZONE 'UTC'`).catch((err) => {
    console.warn('Failed to set session time zone for followUpController pool', err?.message);
  });
});
```

---

### 1.2 Files to Review (No Changes Needed)

These files use `AT TIME ZONE` correctly and will work with UTC base:

| File | Status | Notes |
|------|--------|-------|
| `dashboardAnalyticsService.ts` | ✅ OK | Uses `getUserTimezoneForQuery()` with `AT TIME ZONE` |
| `timezoneCacheService.ts` | ✅ OK | Caches user timezones, returns UTC as default |
| `timezoneUtils.ts` | ✅ OK | Conversion utilities work with any base |
| `InMemoryCampaignScheduler.ts` | ⛔ DO NOT TOUCH | Campaign logic works correctly |
| `CallCampaignService.ts` | ⛔ DO NOT TOUCH | Campaign logic works correctly |
| `CallCampaign.ts` model | ⛔ DO NOT TOUCH | Campaign logic works correctly |

---

## 🔍 Phase 2: API Endpoints Audit

### 2.1 Endpoints Returning Timestamps (Must Return UTC ISO Strings)

| Endpoint | Controller | Current Behavior | Action |
|----------|------------|------------------|--------|
| `GET /api/calls` | `callController.getCalls` | Returns `created_at` as-is | ✅ OK - Returns Date objects which serialize to ISO |
| `GET /api/calls/:id` | `callController.getCall` | Returns `created_at` as-is | ✅ OK |
| `GET /api/dashboard/overview` | `dashboardController.getOverview` | Returns `recentActivity.timestamp` | ✅ OK - Already ISO string |
| `GET /api/dashboard/analytics` | `dashboardController.getAnalytics` | Returns chart data with dates | ✅ OK - Uses `AT TIME ZONE` |
| `GET /api/analytics/*` | `analyticsController.*` | Returns analytics data | ✅ OK |
| `GET /api/leads` | `leadsController.getLeads` | Returns `interactionDate` | ⚠️ Review |
| `GET /api/follow-ups` | `followUpController.getFollowUps` | Returns `followUpDate` | ⚠️ Review |
| `GET /api/demos/scheduled` | `demoRoutes` | Returns `demo_scheduled_at` | ✅ OK |
| `GET /api/contacts` | Contact routes | Returns `created_at`, `updated_at` | ✅ OK |

### 2.2 Endpoints Receiving Timestamps (Must Accept UTC or Parse Correctly)

| Endpoint | Current Behavior | Action |
|----------|------------------|--------|
| `POST /api/calls/initiate` | Uses `new Date()` | ✅ Will be UTC after server change |
| `POST /api/follow-ups` | Accepts `followUpDate` as YYYY-MM-DD | ✅ OK - Date only, no timezone |
| `PATCH /api/demos/:id/reschedule` | Accepts `rescheduled_to` | ⚠️ Review - should parse as UTC |
| Webhook endpoints | Uses `new Date()` | ✅ Will be UTC after server change |

---

## 🔍 Phase 3: Query Patterns Analysis

### 3.1 Queries Using `AT TIME ZONE` (Already Correct) ✅

These queries correctly convert UTC to user timezone:

```sql
-- dashboardAnalyticsService.ts - getOptimizedLeadsOverTime
DATE(c.created_at AT TIME ZONE $2) = s.day

-- dashboardAnalyticsService.ts - getOptimizedInteractionsOverTime
DATE(c.created_at AT TIME ZONE $2) = s.day

-- dashboardAnalyticsService.ts - getOptimizedAgentPerformance
date >= (NOW() AT TIME ZONE $2 - INTERVAL '30 days')::date

-- dashboardAnalyticsService.ts - getAggregatedStats
c.created_at >= (NOW() AT TIME ZONE $2 - INTERVAL '30 days')
```

### 3.2 Queries Using Direct Date Comparison (Need Review)

```sql
-- callController.ts - date range filtering
if (options?.startDate) {
  query += ` AND c.created_at >= $${paramIndex}`;
  params.push(options.startDate);
}
```

**Analysis:** This is correct because:
1. Frontend sends UTC dates
2. Database stores UTC timestamps
3. Comparison is UTC to UTC

### 3.3 Queries Using `CURRENT_TIMESTAMP` or `NOW()`

After changing to UTC session, these will return UTC:

| Location | Query | Behavior After Change |
|----------|-------|----------------------|
| `webhookService.ts` | `created_at` defaults | ✅ Will use UTC |
| `CallCampaignService.ts` | `started_at: new Date()` | ✅ Will be UTC |
| Various models | `created_at DEFAULT CURRENT_TIMESTAMP` | ✅ Will be UTC |

---

## 🔍 Phase 4: Frontend Requirements

### 4.1 Current Frontend Date Handling

The frontend receives timestamps and needs to display them in user's local timezone.

**Files to check in `Frontend/src/`:**

| Component | Date Fields | Required Change |
|-----------|-------------|-----------------|
| Call list components | `created_at`, `completed_at` | Add timezone conversion |
| Analytics charts | Date labels | Already using user timezone from backend |
| Demo scheduler | `demo_scheduled_at` | Add timezone conversion |
| Follow-up list | `followUpDate` | Date-only, no change needed |

### 4.2 Frontend Timezone Conversion Pattern

**Recommended approach:**

```typescript
// Frontend utility: src/utils/timezone.ts

/**
 * Convert UTC ISO string to user's local timezone for display
 */
export function formatDateTimeLocal(utcIsoString: string): string {
  const date = new Date(utcIsoString);
  return date.toLocaleString(); // Uses browser's timezone
}

/**
 * Format date only (ignores time component)
 */
export function formatDateLocal(utcIsoString: string): string {
  const date = new Date(utcIsoString);
  return date.toLocaleDateString();
}

/**
 * Format time only in local timezone
 */
export function formatTimeLocal(utcIsoString: string): string {
  const date = new Date(utcIsoString);
  return date.toLocaleTimeString();
}

/**
 * Format with specific options
 */
export function formatDateTime(
  utcIsoString: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(utcIsoString);
  return date.toLocaleString(undefined, options);
}
```

### 4.3 Frontend Date Sending Pattern

When frontend needs to send dates to backend:

```typescript
// Send current time as UTC ISO string
const now = new Date().toISOString(); // Always UTC

// For date pickers, convert local to UTC before sending
const localDate = new Date('2025-12-04T10:00:00'); // User selected in local time
const utcIsoString = localDate.toISOString(); // Converts to UTC
```

---

## 🔍 Phase 5: Database Triggers Analysis

### 5.1 Triggers Using Timezone Conversion (Already Correct) ✅

From `fix_all_timezone_triggers.sql`:

```sql
-- Correctly converts UTC to user timezone for date aggregation
SELECT DATE(NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE user_tz) INTO target_date;
```

This pattern is correct:
1. `NEW.created_at` is stored in UTC
2. `AT TIME ZONE 'UTC'` interprets it as UTC
3. `AT TIME ZONE user_tz` converts to user's timezone
4. `DATE()` extracts the date in user's timezone

### 5.2 Trigger Functions Status

| Function | Status | Notes |
|----------|--------|-------|
| `trg_calls_daily_analytics` | ✅ Correct | Uses `AT TIME ZONE` pattern |
| `trg_calls_hourly_analytics` | ✅ Correct | Uses `AT TIME ZONE` pattern |
| `recompute_agent_daily_from_calls` | ✅ Correct | Uses `AT TIME ZONE` pattern |
| `get_next_queued_call` | ⛔ DO NOT TOUCH | Campaign logic |

---

## 🔍 Phase 6: Webhook Processing

### 6.1 Current Webhook Timestamp Handling

In `webhookService.ts`:

```typescript
// Stage 1: handleInitiated
await Call.create({
  // ...
  created_at: new Date(), // Currently IST, will become UTC
});
```

**After Changes:** `new Date()` will return UTC because `process.env.TZ = 'UTC'`

### 6.2 Bolna.ai Webhook Payloads

Regarding your question about Bolna webhook timestamps:

**It doesn't matter because:**
1. We use `new Date()` for `created_at`, not Bolna's timestamp
2. Bolna sends timestamps in their format, but we don't directly store them
3. Duration and other metrics are calculated from our timestamps

**What we store from Bolna:**
- `bolna_execution_id` - String ID
- `bolna_conversation_id` - String ID
- `transcript` - Text content
- `recording_url` - URL string
- `duration_seconds` - Numeric value

None of these are timestamps that need timezone handling.

---

## 📝 Implementation Checklist

### Phase 1: Backend Changes (30 mins)

- [ ] **1.1** Update `connectionPoolService.ts` - Set session timezone to UTC
- [ ] **1.2** Update `server.ts` - Set process.env.TZ to UTC
- [ ] **1.3** Update `followUpController.ts` - Set pool session to UTC

### Phase 2: Verification (15 mins)

- [ ] **2.1** Start backend server
- [ ] **2.2** Check logs for "Server timezone: UTC"
- [ ] **2.3** Run query: `SHOW timezone` - Should return 'UTC'
- [ ] **2.4** Run query: `SELECT CURRENT_TIMESTAMP` - Should be UTC

### Phase 3: API Testing (30 mins)

- [ ] **3.1** Test `GET /api/calls` - Verify timestamps are UTC ISO strings
- [ ] **3.2** Test `GET /api/dashboard/overview` - Verify recentActivity timestamps
- [ ] **3.3** Test `GET /api/dashboard/analytics` - Verify chart data
- [ ] **3.4** Test `POST /api/calls/initiate` - Verify call creates with UTC timestamp
- [ ] **3.5** Test webhook - Verify call lifecycle timestamps are UTC

### Phase 4: Frontend Updates (Optional - Can be done later)

- [ ] **4.1** Create `src/utils/timezone.ts` with conversion helpers
- [ ] **4.2** Update call list to use `formatDateTimeLocal()`
- [ ] **4.3** Update demo list to use `formatDateTimeLocal()`
- [ ] **4.4** Test date display in different browser timezones

### Phase 5: Analytics Verification (15 mins)

- [ ] **5.1** Create a test call
- [ ] **5.2** Verify `agent_analytics` date matches user timezone expectation
- [ ] **5.3** Verify dashboard charts show correct date labels

---

## 🔧 Code Changes Summary

### Files to Modify (3 files)

1. **`backend/src/services/connectionPoolService.ts`**
   - Line 38: Change default timezone to 'UTC'
   - Line 95: Hardcode 'UTC' instead of fallback

2. **`backend/src/server.ts`**
   - Lines 40-44: Set `process.env.TZ = 'UTC'`

3. **`backend/src/controllers/followUpController.ts`**
   - Lines 43-49: Set pool session to 'UTC'

### Files NOT to Touch ⛔

- `InMemoryCampaignScheduler.ts`
- `CallCampaignService.ts`
- `CallCampaign.ts` model
- `campaignRoutes.ts`
- Any file with "campaign" in the name

---

## 🧪 Verification Queries

After implementation, run these to verify:

```sql
-- 1. Check session timezone
SHOW timezone;
-- Expected: UTC

-- 2. Check current timestamp
SELECT CURRENT_TIMESTAMP, NOW();
-- Expected: Current UTC time

-- 3. Check a recent call
SELECT id, created_at, 
       created_at AT TIME ZONE 'Asia/Kolkata' as ist_time
FROM calls 
ORDER BY created_at DESC 
LIMIT 1;
-- created_at should be UTC, ist_time should be +5:30

-- 4. Check analytics aggregation
SELECT 
  date,
  DATE(c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as expected_date
FROM agent_analytics aa
JOIN calls c ON c.agent_id = aa.agent_id
WHERE aa.date = CURRENT_DATE
LIMIT 5;
-- date should match expected_date for IST users
```

---

## 📊 Summary

| Aspect | Before | After |
|--------|--------|-------|
| DB Session | Asia/Kolkata | UTC |
| Node.js TZ | Asia/Kolkata | UTC |
| `new Date()` | IST | UTC |
| `CURRENT_TIMESTAMP` | IST | UTC |
| Timestamps stored | IST (accidentally) | UTC |
| Frontend receives | Mixed | UTC ISO strings |
| User sees | Confusing | Correct local time |
| Analytics dates | Based on IST | Based on user TZ |

---

## ✅ Ready to Implement?

The changes are minimal (3 files) and low-risk because:

1. **Triggers already handle timezone correctly** - They use `AT TIME ZONE` pattern
2. **Analytics queries already use user timezone** - They call `getUserTimezoneForQuery()`
3. **Campaign logic is untouched** - You said it works correctly
4. **Frontend can adapt gradually** - JavaScript `Date` handles UTC automatically

**Shall I proceed with implementing these changes?**
