# Tab Icon Conflict Resolution Summary

## Issue
`Logs` and `Contacts` in the dashboard sidebar were both using the same `FileText` icon, causing visual ambiguity.

## Change Implemented
- Updated the `Contacts` tab icon from `FileText` to `Database`.
- Kept the `Logs` tab icon as `FileText`.

## File Updated
- `Frontend/src/components/dashboard/Sidebar.tsx`

## Result
- `Logs` and `Contacts` now have distinct icons and are easier to distinguish in the sidebar.
