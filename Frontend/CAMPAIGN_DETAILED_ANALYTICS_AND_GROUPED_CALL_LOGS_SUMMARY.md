# Campaign Detailed Analytics and Grouped Call Logs - Implementation Summary

## Objective
Improve campaign visibility by:
1. Expanding the "Detailed Analytics" section into a true detailed view.
2. Grouping campaign call logs lead-centrically with retry context.
3. Keeping full attempt-level auditability via expandable nested history.
4. Applying grouped lead view not only from campaign redirect flow, but also when users open Calling Agent Logs directly.

## What Was Implemented

### 1) Campaign Details: richer detailed analytics
- Added a toggle in Campaign Details: `Summary` / `Detailed`.
- `Summary` includes operational metrics such as:
  - Average call duration
  - Queued calls
  - In progress calls
  - Attempted calls
- `Detailed` includes:
  - Total call attempts
  - Connected calls
  - Connection Success Rate
  - Total credits used
  - Attempt distribution (`contacted`, `busy`, `no-answer`, `failed`, `not_attempted`)

### 2) Campaign Details: lead-centric grouped logs
- Added in-dialog grouped logs section: "Detailed Call Logs (Grouped by Lead)".
- Calls are grouped by lead identity (`contactId`, fallback by normalized phone/name).
- Each group row shows:
  - Lead name
  - Phone number
  - Last status
  - Retry count badge
  - Last attempt timestamp
- Clicking a lead row expands nested attempt history.
- Expanded attempt rows display:
  - Attempt number
  - Timestamp
  - Duration
  - Agent
  - Status

### 3) View Call Logs button now opens grouped mode
- Campaign Details `View Call Logs` now stores:
  - `filterCampaignId`
  - `callLogsGroupByLead=true`
- This ensures users land in `Calling Agent Logs` with the same grouped-by-lead context.

### 4) Direct Calling Agent Logs now defaults to grouped mode
- `UnifiedCallLogs` now defaults `groupByLead` to `true`.
- Behavior is now consistent whether users:
  - Navigate from Campaign Details, or
  - Open Calling Agent Logs directly from sidebar/navigation.

## Technical Notes

### Data and grouping
- Grouping logic is computed in frontend from fetched call list:
  - Sort attempts chronologically inside each group.
  - Derive `latest` attempt and `retryCount = attempts - 1`.

### Existing features preserved
- Existing filters (agent/campaign/status/type/date) remain active.
- Selection behavior still works; selecting a grouped row selects all attempts for that lead.
- Transcript and recording actions remain available on grouped rows and nested attempts.

## Files Updated
- `Frontend/src/components/campaigns/CampaignDetailsDialog.tsx`
- `Frontend/src/components/call/UnifiedCallLogs.tsx`
- `Frontend/src/components/call/CallLogs.tsx`

## Validation
- Frontend production build completed successfully:
  - `cd Frontend && npm run build`
