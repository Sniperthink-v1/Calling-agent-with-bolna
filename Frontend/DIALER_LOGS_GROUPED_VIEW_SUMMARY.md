# Dialer Logs Grouped View Summary

## Requirement
Group call logs in the **Make a Call -> Dialer Logs** view so repeated attempts to the same contact are not shown as separate top-level rows.

## Implemented
- Reworked `PlivoDialerLogs` to render **grouped-by-contact** rows.
- Grouping key priority:
  1. `contact_id`
  2. normalized `to_phone_number`
  3. normalized `contact_name` fallback
- Each grouped row now shows:
  - contact name
  - latest call status
  - latest call duration
  - retry count (`attempts - 1`)
- Added **expand/collapse** interaction:
  - collapsed view: single summary row per contact
  - expanded view: full attempt history for that contact

## Attempt History
- Attempts are ordered chronologically (oldest -> newest) internally and displayed with newest attempt first in expanded mode.
- Each attempt row includes:
  - timestamp
  - status badge
  - duration
  - team member (if available)
  - hangup reason (if available)

## Actions Preserved
All existing actions remain available both at summary level and per attempt:
- View Transcript
- Lead Intelligence
- Play Recording

The shared audio player drawer now follows the active attempt in grouped mode.

## File Updated
- `Frontend/src/pages/PlivoDialerLogs.tsx`

## Validation
- Frontend build passed:
  - `npm --prefix Frontend run build`
