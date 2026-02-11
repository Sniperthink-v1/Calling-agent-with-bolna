# Agent Name Update Fix (Bolna 400)

## Issue
Renaming an agent from settings returned:

```json
{"success":false,"error":"Failed to update agent: Bolna API error: 400"}
```

## Root Cause
`agentService.updateAgent()` always sent a full `PUT /v2/agent/:id` payload to Bolna, even for rename-only updates.  
For many existing agents, that synthetic full payload was invalid and Bolna returned `400`.

## Changes Implemented
1. Added a dedicated Bolna partial rename method:
   - `backend/src/services/bolnaService.ts`
   - New method: `patchAgentName(agentId, agentName)` using `PATCH /v2/agent/:agent_id`

2. Updated agent update flow to use partial rename:
   - `backend/src/services/agentService.ts`
   - Rename-only updates now call `bolnaService.patchAgentName(...)`
   - Full `PUT` is now used only when non-name Bolna config fields are being changed
   - Local-only fields (`description`, `is_active`) can update without forcing a Bolna full config update

3. Added stricter name validation:
   - Empty/whitespace-only names now fail fast on backend with a clear error

## Result
- `Update Name` now saves successfully and avoids the previous Bolna `400` failure for rename-only edits.
- UI continues to reflect updates immediately via existing optimistic updates in frontend state.

## Validation
- Backend compile/build succeeded:
  - `cd backend && npm run build`
