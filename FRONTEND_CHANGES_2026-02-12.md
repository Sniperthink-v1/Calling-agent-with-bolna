# Frontend Changes - 2026-02-12

## Scope
This document summarizes the UI and navigation updates made across dashboard, client panel, lead management, and campaign analytics navigation.

## Files Changed

1. `Frontend/src/components/dashboard/Sidebar.tsx`
- Renamed sidebar tab label from `Lead Intelligence` to `Lead Management`.
- Kept tab id as `lead-intelligence` to avoid route/state breakage.

2. `Frontend/src/components/clientPanel/ClientPanelLayout.tsx`
- Renamed client panel tab text from `Lead Intelligence` to `Lead Management`.
- Kept tab value as `lead-intelligence` to preserve existing tab wiring.

3. `Frontend/src/components/dashboard/LeadIntelligence.tsx`
- Moved row action controls (`Call`, `Add Interaction`, `Convert`) into the main top-level intelligence table.
- Added an always-visible `Actions` column in the main intelligence table header and body.
- Removed duplicate conditional actions rendering from the tactical-only block.
- Kept follow-up/demo tactical columns gated in actions mode only (`showAnalyticsTacticalColumns = false`).
- Updated in-view wording:
  - loading text: `Loading lead management...`
  - main title: `Lead Management`
  - top toggle label: `Management` (for the analytics workspace button)
  - subtitle block under title is currently commented out.

4. `Frontend/src/components/campaigns/CampaignDetailsDialog.tsx`
- Updated campaign details CTA behavior:
  - replaced call logs redirect with analytics redirect.
  - now sets `sessionStorage['analyticsFilterCampaignId'] = campaign.id`.
  - now navigates to `/dashboard?tab=analytics&subtab=call`.
- Updated button label from `View Call Logs` to `View Detailed Analytics`.

## Behavior Impact
- Users now see `Lead Management` in sidebar and client panel while internal routing remains unchanged.
- Core lead actions are now accessible directly in the main intelligence table (top-level view).
- Campaign "View Detailed Analytics" now lands directly on the Analytics page with campaign filter pre-applied.

## Notes
- No backend/API contract changes were introduced.
- These changes are frontend-only and rely on existing sessionStorage filter handling in call analytics.
