# Duplicate Entries - Visual Explanation

## Problem Illustration

### Before Fix (Duplicates):

```
Call Record:
┌─────────────────────────────────┐
│ Call ID: abc-123                │
│ Phone: +91 9876543210           │
│ User: user-456                  │
│ Status: completed               │
└─────────────────────────────────┘
           │
           │ LEFT JOIN lead_analytics (NO FILTER)
           │
           ├──────────────────────────┬─────────────────────────
           │                          │
           ▼                          ▼
┌────────────────────────┐  ┌────────────────────────┐
│ Lead Analytics Row 1   │  │ Lead Analytics Row 2   │
│ analysis_type:         │  │ analysis_type:         │
│   'individual'         │  │   'complete'           │
│ smart_notification:    │  │ smart_notification:    │
│   "John booked demo"   │  │   "John booked demo"   │
└────────────────────────┘  └────────────────────────┘

RESULT: 2 rows in unified call logs ❌
```

### After Fix (Correct):

```
Call Record:
┌─────────────────────────────────┐
│ Call ID: abc-123                │
│ Phone: +91 9876543210           │
│ User: user-456                  │
│ Status: completed               │
└─────────────────────────────────┘
           │
           │ LEFT JOIN lead_analytics 
           │ WHERE analysis_type = 'individual' ✅
           │
           ▼
┌────────────────────────┐  ┌────────────────────────┐
│ Lead Analytics Row 1   │  │ Lead Analytics Row 2   │
│ analysis_type:         │  │ analysis_type:         │
│   'individual' ✅      │  │   'complete'           │
│ smart_notification:    │  │ (FILTERED OUT) 🚫     │
│   "John booked demo"   │  │                        │
└────────────────────────┘  └────────────────────────┘

RESULT: 1 row in unified call logs ✅
```

## Analysis Type Comparison

| Feature | Individual Analysis | Complete Analysis |
|---------|-------------------|------------------|
| **Purpose** | Per-call insights | Historical aggregation |
| **Rows per call** | 1 new row | Updates existing row |
| **When created** | After each call | After each call (UPSERT) |
| **Data scope** | Single call transcript | All previous calls |
| **Where used** | Unified logs, notifications | Lead Intelligence only |
| **Smart notification** | Current call summary | Overall contact summary |
| **Lead score** | Call-specific | Aggregated across all calls |

## Query Pattern Fix

### ❌ WRONG (Causes Duplicates):
```sql
SELECT c.*, la.smart_notification
FROM calls c
LEFT JOIN lead_analytics la ON c.id = la.call_id
WHERE c.user_id = $1
```

### ✅ CORRECT (No Duplicates):
```sql
SELECT c.*, la.smart_notification
FROM calls c
LEFT JOIN lead_analytics la 
  ON c.id = la.call_id 
  AND la.analysis_type = 'individual'
WHERE c.user_id = $1
```

## Real Example

### Database State After 1 Call:

```
calls table:
┌─────────┬──────────────┬────────────┬───────────┐
│ id      │ phone_number │ user_id    │ status    │
├─────────┼──────────────┼────────────┼───────────┤
│ call-1  │ +91 98765... │ user-123   │ completed │
└─────────┴──────────────┴────────────┴───────────┘

lead_analytics table:
┌─────────┬─────────┬──────────────┬───────────────┬─────────────────────┐
│ id      │ call_id │ phone_number │ analysis_type │ smart_notification  │
├─────────┼─────────┼──────────────┼───────────────┼─────────────────────┤
│ la-1    │ call-1  │ +91 98765... │ individual    │ "John booked demo"  │
│ la-2    │ call-1  │ +91 98765... │ complete      │ "John booked demo"  │
└─────────┴─────────┴──────────────┴───────────────┴─────────────────────┘
```

### OLD Query Result (2 rows):
```json
[
  {
    "call_id": "call-1",
    "smart_notification": "John booked demo",  // From individual
    "analysis_type": "individual"
  },
  {
    "call_id": "call-1", 
    "smart_notification": "John booked demo",  // From complete
    "analysis_type": "complete"
  }
]
```

### NEW Query Result (1 row):
```json
[
  {
    "call_id": "call-1",
    "smart_notification": "John booked demo",  // Only individual
    "analysis_type": "individual"
  }
]
```

## When to Use Each Analysis Type

### Use `individual` analysis for:
- ✅ Unified call logs
- ✅ Call list views
- ✅ Smart notifications
- ✅ Per-call analytics
- ✅ Dashboard metrics
- ✅ Agent performance
- ✅ Campaign tracking

### Use `complete` analysis for:
- ✅ Lead Intelligence section
- ✅ Contact profile view
- ✅ Historical trend analysis
- ✅ Lead scoring over time
- ✅ Multi-call journey tracking

## Summary

The fix ensures that:
1. Each call appears **once** in unified logs
2. Smart notifications are **not duplicated**
3. Analytics counts are **accurate**
4. Complete analysis is **still available** for Lead Intelligence

The key is to always filter by `analysis_type = 'individual'` when joining `lead_analytics` for call-level views and only use `complete` for aggregated lead views.
