# Duplicate Entries Fix Summary

## Issue
Unified call logs and smart notifications were showing **2 entries for 1 call** due to incorrect joining of the `lead_analytics` table without filtering by `analysis_type`.

## Root Cause
The `lead_analytics` table stores TWO types of analysis per call:
1. **`individual`** - One row per call, extracted from single transcript
2. **`complete`** - One row per user+phone combo, aggregates all historical calls

When queries joined `lead_analytics` without filtering by `analysis_type`, they returned duplicate rows because each call had both an individual and complete analysis record.

## Solution
Added `AND la.analysis_type = 'individual'` filter to all `LEFT JOIN lead_analytics` clauses that are used for:
- Unified call logs
- Call analytics
- Smart notifications
- Dashboard metrics

**Complete analysis should ONLY be used in the Lead Intelligence section**, not in unified call logs or general analytics.

## Files Modified

### 1. **backend/src/models/Call.ts**
- Fixed `findFilteredCalls()` method
- Changed:
  ```sql
  LEFT JOIN lead_analytics la ON c.id = la.call_id
  ```
  To:
  ```sql
  LEFT JOIN lead_analytics la ON c.id = la.call_id AND la.analysis_type = 'individual'
  ```

### 2. **backend/src/controllers/callAnalyticsController.ts**
- Fixed 4 analytics queries:
  - KPIs query (connection rate, demos scheduled, hot leads, etc.)
  - Sales funnel query (total unique calls, demo booked, customers)
  - Call source analytics (phone vs internet calls)
  - Source performance metrics

### 3. **backend/src/controllers/agentAnalyticsController.ts**
- Fixed 2 queries:
  - Hourly stats query (for agent performance)
  - Realtime stats query (for live monitoring)

### 4. **backend/src/services/dashboardAnalyticsService.ts**
- Fixed 2 queries:
  - Leads over time query
  - Aggregated stats query

## Impact

### Before Fix:
- ❌ Each call appeared twice in unified call logs
- ❌ Smart notifications duplicated
- ❌ Analytics metrics counted calls twice
- ❌ Dashboard stats inflated

### After Fix:
- ✅ Each call appears once in unified call logs
- ✅ Smart notifications show once per call
- ✅ Analytics metrics accurate
- ✅ Dashboard stats correct

## Analysis Type Usage

| Analysis Type | Purpose | Where Used |
|--------------|---------|------------|
| `individual` | Per-call analysis | Unified logs, analytics, notifications |
| `complete` | Aggregated historical analysis | Lead Intelligence ONLY |

## Key Principle

**Rule**: Always filter by `analysis_type = 'individual'` when joining `lead_analytics` for:
- Call logs
- Call lists
- Analytics dashboards
- Notifications
- Metrics calculations

**Exception**: Lead Intelligence section can use `analysis_type = 'complete'` for comprehensive lead profiles.

## Testing Recommendations

1. **Verify unified call logs** show one entry per call
2. **Check smart notifications** for duplicates
3. **Test analytics dashboard** for accurate counts
4. **Validate campaign metrics** show correct numbers
5. **Review Lead Intelligence** still works with complete analysis

## Database Structure

```sql
-- lead_analytics table structure
CREATE TABLE lead_analytics (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL,
  user_id UUID NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  analysis_type VARCHAR(20) NOT NULL CHECK (analysis_type IN ('individual', 'complete')),
  -- ... other fields
);

-- Individual: One row per call
-- Complete: One row per user+phone (UPSERT on each new call)
```

## Migration Impact
- ✅ No database schema changes required
- ✅ No data migration needed
- ✅ Only query logic updated
- ✅ Backward compatible

## Date
November 6, 2025
