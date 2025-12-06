# 🔍 Demo Book DateTime Race Condition - Debug Investigation

## Problem Statement

You're seeing this log message:
```
[2025-12-06T03:56:57.846Z] [DEBUG] ⏭️ Skipping calendar meeting scheduling {
  execution_id: 'e9358586-13c7-46d5-8228-72797c96898a',
  has_demo_datetime: false,
  has_email: true,
  is_valid_time: true,
  reason: 'No demo_book_datetime in AI analysis'
}
```

But the AI extraction DID include the datetime and it WAS saved to the database:
```json
{
  "demo_book_datetime": "2025-12-06T17:00:00+05:30",
  "extraction": {
    "email_address": "sddhantjaiii@gmail.com",
    "name": "Siddhant"
  }
}
```

## Hypothesis

There are several possible causes:

### 1. **Race Condition** (Most Likely)
The calendar scheduling code runs before `individualData.demo_book_datetime` is fully populated, even though it's inside the same `.then()` callback.

### 2. **Data Mutation**
Something between AI extraction and calendar scheduling is nullifying or removing the `demo_book_datetime` field.

### 3. **Scope Issue**
A nested `try-catch` block might be catching an error and the calendar code is running in a different scope than we think.

### 4. **Type Coercion**
The value might be present but evaluating to `false` due to JavaScript type coercion (e.g., empty string, `"null"`, etc.).

## Debug Logs Added

We've added **5 strategic debug logs** to trace the data flow:

### 1. **Immediately After AI Extraction** (`webhookService.ts` ~line 773)
```typescript
logger.info('🔍 DEBUG: IndividualData extracted', {
  execution_id: executionId,
  full_individualData: JSON.stringify(individualData, null, 2),
  has_demo_book_datetime: !!individualData?.demo_book_datetime,
  demo_book_datetime_value: individualData?.demo_book_datetime,
  demo_book_datetime_type: typeof individualData?.demo_book_datetime,
  extraction_email: individualData?.extraction?.email_address,
  lead_status: individualData?.lead_status_tag
});
```

**What to check:**
- Is `demo_book_datetime` present in the full object?
- What's its exact value and type?
- Does it match what OpenAI returned?

### 2. **Inside OpenAI Extraction Service** (`openaiExtractionService.ts` ~line 320)
```typescript
logger.info('Individual call data extracted successfully', {
  executionId,
  totalScore: analysis.total_score,
  leadStatusTag: analysis.lead_status_tag,
  intentScore: analysis.intent_score,
  demo_book_datetime: analysis.demo_book_datetime,
  has_demo_datetime: !!analysis.demo_book_datetime,
});

logger.debug('🔍 DEBUG: Complete analysis object from OpenAI', {
  executionId,
  analysis: JSON.stringify(analysis, null, 2)
});
```

**What to check:**
- Does OpenAI's response actually contain `demo_book_datetime`?
- Is it being parsed correctly from JSON?

### 3. **After processDualAnalysis** (`webhookService.ts` ~line 857)
```typescript
logger.info('🔍 DEBUG: IndividualData after processDualAnalysis', {
  execution_id: executionId,
  has_demo_book_datetime: !!individualData?.demo_book_datetime,
  demo_book_datetime_value: individualData?.demo_book_datetime,
  demo_book_datetime_type: typeof individualData?.demo_book_datetime,
});
```

**What to check:**
- Is `demo_book_datetime` still present after database write?
- Did `processDualAnalysis` mutate the original object?

### 4. **Before Contact Update** (`webhookService.ts` ~line 870)
Already existed but check:
```typescript
logger.info('🔄 Updating contact with extracted AI data', {
  execution_id: executionId,
  phone_number: updatedCall.phone_number,
  has_individual_data: !!individualData,
  extracted_name: individualData?.extraction?.name,
  extracted_email: individualData?.extraction?.email_address,
  extracted_company: individualData?.extraction?.company_name
});
```

### 5. **Right Before Calendar Scheduling** (`webhookService.ts` ~line 963)
```typescript
logger.info('🔍 DEBUG: IndividualData before calendar scheduling', {
  execution_id: executionId,
  has_individualData: !!individualData,
  has_demo_book_datetime: !!individualData?.demo_book_datetime,
  demo_book_datetime_value: individualData?.demo_book_datetime,
  demo_book_datetime_type: typeof individualData?.demo_book_datetime,
  extraction_email: individualData?.extraction?.email_address,
  contact_created: contactResult.created,
  contact_id: contactResult.contactId
});
```

**What to check:**
- This is the smoking gun! 
- At this point, is `demo_book_datetime` missing?
- If yes, compare with log #1 to see where it disappeared

## How to Test

1. **Restart the backend server:**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Trigger a test call** with demo booking:
   - Make a call where the AI agent books a demo
   - Use a phrase like "Book a demo for me at 5 PM today"

3. **Watch the logs** for the 5 debug markers:
   ```
   🔍 DEBUG: Complete analysis object from OpenAI
   🔍 DEBUG: IndividualData extracted
   🔍 DEBUG: IndividualData after processDualAnalysis
   🔍 DEBUG: IndividualData before calendar scheduling
   ⏭️ Skipping calendar meeting scheduling
   ```

4. **Analyze the sequence:**
   - Compare `demo_book_datetime` values across all 5 logs
   - Look for the exact point where it becomes `undefined` or `null`

## Expected Outcomes

### Scenario A: Value Disappears Between Logs
If `demo_book_datetime` is present in log #1-3 but missing in log #5:
- **Root Cause:** Data mutation or scope issue
- **Fix:** Track down what's modifying `individualData` between those points

### Scenario B: Value Never Present
If `demo_book_datetime` is `null` or `undefined` from the start (log #1):
- **Root Cause:** OpenAI prompt not returning the field, or parsing issue
- **Fix:** Check OpenAI prompt configuration or response parsing

### Scenario C: Value Present but Type Wrong
If `demo_book_datetime` shows up as `"null"` (string) or empty string:
- **Root Cause:** Type coercion in conditional check
- **Fix:** Add explicit null/empty string checks

### Scenario D: Async Timing Issue
If logs appear out of order or calendar log appears BEFORE extraction log:
- **Root Cause:** Race condition with async operations
- **Fix:** Ensure proper `await` chains and add explicit synchronization

## Additional Investigation

If the logs don't reveal the issue, check:

1. **Database Write Timing:**
   ```sql
   SELECT 
     id, 
     call_id, 
     demo_book_datetime, 
     created_at 
   FROM lead_analytics 
   WHERE call_id = 'your_call_id' 
   ORDER BY created_at DESC;
   ```
   - Check if `demo_book_datetime` was written correctly to DB
   - Check timing vs when calendar code ran

2. **Contact Update Service:**
   Check `ContactAutoCreationService.createOrUpdateContact()` - does it modify the `leadData` object passed to it?

3. **Promise Chain:**
   Verify the entire `.then()` callback is executing sequentially without any hidden async breaks

## Next Steps

1. ✅ Deploy the debug logs (this commit)
2. ⏳ Run test call with demo booking
3. 🔍 Analyze the log sequence
4. 🎯 Identify where `demo_book_datetime` disappears
5. 🔧 Implement targeted fix based on findings

---

**Files Modified:**
- `backend/src/services/webhookService.ts` - Added 3 debug logs
- `backend/src/services/openaiExtractionService.ts` - Added 2 debug logs

**Log Level:** Set `LOG_LEVEL=debug` in `.env` to see all debug logs
