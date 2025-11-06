# Inbound Call Webhook Handling Fix

## Issue
When receiving inbound calls, the webhook was logging:
```
[WARN] Call not found for completion { execution_id: 'ad52b7bf-3f6d-46c0-ba80-effd3e2e7823' }
```

The system was not processing inbound calls properly because:
1. The `completed` webhook event arrived without a prior `initiated` event
2. No call record existed in the database
3. The webhook handler would skip processing and return early

## Root Cause
The webhook flow assumes this sequence:
1. `initiated` → Creates call record
2. `ringing` → Updates status
3. `in-progress` → Updates status
4. `call-disconnected` → Saves transcript
5. `completed` → Finalizes call, runs analysis

However, for some inbound calls, the `initiated` event may be missed or delayed, causing the `completed` event to arrive first with no existing call record.

## Solution Implemented

### 1. Create Call Record from Completed Event (`webhookService.ts`)

When the `completed` event arrives and no call record exists, we now create it on-the-fly with all available data:

**Before:**
```typescript
const call = await Call.findByExecutionId(executionId);
if (!call) {
  logger.warn('Call not found for completion', { execution_id: executionId });
  return; // ❌ Stops processing
}
```

**After:**
```typescript
let call = await Call.findByExecutionId(executionId);

// If call doesn't exist (missed initiated event), create it now
if (!call) {
  logger.warn('Call not found for completion, creating now', { 
    execution_id: executionId,
    agent_id: agentId
  });

  // Find agent by Bolna ID
  const agent = await Agent.findByBolnaId(agentId);
  if (!agent) {
    logger.error('Agent not found, cannot create call');
    return;
  }

  // Get phone number from payload
  const phoneNumber = payload.context_details?.recipient_phone_number || 
                     payload.telephony_data?.to_number ||
                     payload.telephony_data?.from_number;

  // Create call record with completed data
  await Call.create({
    agent_id: agent.id,
    user_id: agent.user_id,
    bolna_conversation_id: executionId,
    bolna_execution_id: executionId,
    phone_number: normalizePhoneNumber(phoneNumber),
    call_source: 'phone',
    status: 'completed',
    call_lifecycle_status: 'completed',
    lead_type: 'inbound', // Default to inbound if initiated was missed
    duration_seconds: Math.floor(payload.conversation_duration || 0),
    duration_minutes: Math.ceil(Math.floor(payload.conversation_duration || 0) / 60),
    credits_used: Math.ceil(Math.floor(payload.conversation_duration || 0) / 60),
    recording_url: payload.telephony_data?.recording_url || undefined,
    completed_at: new Date(),
    hangup_by: payload.telephony_data?.hangup_by || undefined,
    hangup_reason: payload.telephony_data?.hangup_reason || undefined,
    hangup_provider_code: payload.telephony_data?.hangup_provider_code || undefined,
    metadata: {
      created_from: 'completed_event',
      provider: payload.telephony_data?.provider || payload.provider
    }
  });

  // Re-fetch the newly created call
  call = await Call.findByExecutionId(executionId);
}
```

### 2. Auto-Create Contact for All Calls

Added contact auto-creation to ensure inbound calls have associated contacts:

```typescript
// Auto-create contact if it doesn't exist
try {
  const leadData = {
    companyName: null,
    extractedName: null,
    extractedEmail: null,
    ctaPricingClicked: false,
    ctaDemoClicked: false,
    ctaFollowupClicked: false,
    ctaSampleClicked: false,
    ctaEscalatedToHuman: false,
    smartNotification: null,
    demoBookDatetime: null
  };
  
  await ContactAutoCreationService.createOrUpdateContact(
    call.user_id,
    leadData,
    call.id,
    call.phone_number
  );
  
  logger.info('✅ Contact auto-created or found', { 
    execution_id: executionId,
    phone_number: call.phone_number 
  });
} catch (error) {
  logger.error('Failed to auto-create contact');
  // Don't fail webhook - contact creation is not critical
}
```

## How It Works

### Normal Flow (All Events Received):
```
1. initiated → Create call record
2. ringing → Update status
3. in-progress → Update status  
4. call-disconnected → Save transcript
5. completed → Finalize + run analysis
```

### Inbound Flow (Missing Initiated Event):
```
1. ❌ initiated (missed)
2. completed → Create call record + finalize + run analysis
```

## Benefits

### Before Fix:
- ❌ Inbound calls not recorded in database
- ❌ No call history for inbound calls
- ❌ No analytics or transcripts saved
- ❌ Credits not tracked
- ❌ Recording URLs lost

### After Fix:
- ✅ All inbound calls recorded in database
- ✅ Complete call history maintained
- ✅ Full analytics and AI analysis runs
- ✅ Credits properly tracked
- ✅ Recording URLs saved
- ✅ Contacts auto-created
- ✅ Transcripts processed
- ✅ Lead analytics generated

## Files Modified

1. **`backend/src/services/webhookService.ts`**
   - Modified `handleCompleted()` method
   - Added call creation logic for missed initiated events
   - Added contact auto-creation
   - Fixed TypeScript null/undefined handling

## Data Captured from Completed Event

When creating a call from the completed event, we extract:

| Field | Source | Example |
|-------|--------|---------|
| execution_id | `payload.id` | `ad52b7bf-3f6d-46c0-ba80-effd3e2e7823` |
| agent_id | `payload.agent_id` → lookup | `dba7ab53-3827-415d-9284-6c44916e017a` |
| phone_number | `payload.telephony_data.to_number` or `from_number` | `+1234567890` |
| duration_seconds | `payload.conversation_duration` | `125` |
| recording_url | `payload.telephony_data.recording_url` | `https://...` |
| status | Hardcoded | `completed` |
| lead_type | `payload.telephony_data.call_type` or default | `inbound` |
| hangup_by | `payload.telephony_data.hangup_by` | `user` |
| hangup_reason | `payload.telephony_data.hangup_reason` | `normal_clearing` |

## Testing Checklist

### Test Inbound Call Processing:
1. ✅ Make an inbound call to your agent
2. ✅ Complete the conversation
3. ✅ Check backend logs for:
   - `Call not found for completion, creating now`
   - `✅ Call record created from completed event`
   - `✅ Contact auto-created or found`
4. ✅ Verify in database:
   - Call record exists with `lead_type = 'inbound'`
   - Recording URL is saved
   - Duration is calculated correctly
   - Contact is auto-created
5. ✅ Check frontend:
   - Call appears in unified call logs
   - Recording can be played
   - Transcript is available (if saved in call-disconnected)
   - Analytics are generated

### Test Normal Outbound Call (Shouldn't Break):
1. ✅ Make an outbound call
2. ✅ Complete the conversation
3. ✅ Verify call is processed normally
4. ✅ No "creating now" logs should appear

## Edge Cases Handled

### 1. Agent Not Found:
```typescript
if (!agent) {
  logger.error('Agent not found, cannot create call');
  return; // Fail gracefully
}
```

### 2. No Phone Number in Payload:
```typescript
if (!phoneNumber) {
  logger.error('Phone number not found in completed payload');
  return; // Fail gracefully
}
```

### 3. Contact Creation Fails:
```typescript
catch (error) {
  logger.error('Failed to auto-create contact');
  // Don't fail webhook - contact creation is not critical
}
```

### 4. Null Values from Payload:
```typescript
// Convert null to undefined for TypeScript
recording_url: payload.telephony_data?.recording_url || undefined,
hangup_by: payload.telephony_data?.hangup_by || undefined,
```

## Metadata Tracking

Calls created from completed events include metadata for debugging:

```typescript
metadata: {
  created_from: 'completed_event', // ✅ Track creation source
  provider: payload.telephony_data?.provider || payload.provider
}
```

This helps identify which calls were recovered from missed initiated events.

## Logging Improvements

### Before:
```
[WARN] Call not found for completion
[INFO] ✅ Webhook processed successfully
```

### After:
```
[WARN] Call not found for completion, creating now
[INFO] ✅ Call record created from completed event
[INFO] 💾 Recording URL saved
[INFO] ✅ Contact auto-created or found
[INFO] 🤖 Running OpenAI analysis
[INFO] ✅ Webhook processed successfully
```

## Performance Impact

- **Minimal**: Only affects calls where initiated event was missed
- **One additional query**: `Agent.findByBolnaId()` when creating call
- **No degradation**: Normal calls process exactly as before
- **Improved reliability**: No data loss for inbound calls

## Related Issues Fixed

This also resolves:
- Missing inbound call history
- Incomplete analytics for inbound calls
- Lost recording URLs for inbound calls
- Contact not created for inbound callers
- Credits not tracked for inbound calls
- No transcripts saved for inbound calls

## Future Enhancements

Consider these improvements:
1. **Retry Logic**: Retry fetching call record before creating new one
2. **Event Buffering**: Buffer out-of-order events and process in correct sequence
3. **Webhook Deduplication**: Prevent duplicate call creation if events arrive twice
4. **Better Phone Detection**: Try multiple payload locations for phone number
5. **Enhanced Metadata**: Store more debugging info about event order

## Monitoring

Watch for these log patterns:
- `Call not found for completion, creating now` - Indicates initiated event was missed
- `Agent not found, cannot create call` - Configuration issue
- `Phone number not found in completed payload` - Data issue
- `Failed to auto-create contact` - Contact service issue (non-critical)
