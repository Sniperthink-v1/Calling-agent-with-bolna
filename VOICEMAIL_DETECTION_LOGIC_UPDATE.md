# Voicemail Detection Logic Update

## Summary
Calls that are technically emitted as `completed` by Bolna but are actually voicemail outcomes are no longer treated as successful completed calls.

The webhook flow now detects voicemail signals and remaps those outcomes to a retryable failed path using `busy` lifecycle status.

## Problem
Previously, some voicemail calls were saved as:
- `status = completed`
- `call_lifecycle_status = completed`

This incorrectly signaled a successful interaction and prevented campaign retry logic from running.

## Implemented Behavior
### 1. Voicemail detection on `completed` webhooks
In `WebhookService`, voicemail is detected from multiple payload signals:
- `answered_by_voice_mail === true`
- `smart_status` contains voicemail/greeting markers
- `telephony_data.hangup_reason` contains voicemail/greeting markers
- `error_message` contains voicemail/greeting markers
- `summary` contains voicemail markers
- transcript marker fallback (stricter threshold)

### 2. Outcome remapping for retry compatibility
If voicemail is detected on a `completed` webhook:
- The call is routed to failed handling, not normal completed handling
- Lifecycle outcome is mapped to `busy` (retryable)
- Base call `status` remains `failed`
- `hangup_reason` is overridden with a voicemail-specific reason
- voicemail metadata is persisted:
  - `voicemail_detected: true`
  - `voicemail_signals: [...]`
  - `voicemail_detected_at: <timestamp>`

### 3. Follow-up email context
For voicemail-detected calls, follow-up email processing receives `callStatus = voicemail` for appropriate template/prompt behavior.

## Why `busy` (instead of new `voicemail` lifecycle status)
Current retry logic is already designed around retryable outcomes:
- `busy`
- `no-answer`

To avoid schema and reporting breakage in this change set, voicemail detections are normalized to `busy` for queue retries, while still preserving voicemail semantics in call metadata and hangup reason.

## Files Changed
- `backend/src/services/webhookService.ts`

## Validation
- Backend compile/build passed:
  - `cd backend && npm run build`
