# User Impersonation Feature - Implementation Summary

## Overview
Implemented a complete "Sign in as User" feature that allows admins to view and interact with the platform from any user's perspective. This is useful for client demonstrations and troubleshooting.

## Features Implemented

### 1. **User Selection Dialog** (`UserImpersonationDialog.tsx`)
- **Location**: `Frontend/src/components/admin/UserImpersonationDialog.tsx`
- **Features**:
  - Search users by name or email
  - Display all users in a table with details (name, email, role, join date)
  - Click "Sign in as [User]" button to impersonate
  - Fetches admin users list from `/api/admin/users`

### 2. **Impersonation Banner** (`ImpersonationBanner.tsx`)
- **Location**: `Frontend/src/components/admin/ImpersonationBanner.tsx`
- **Features**:
  - Orange banner at top of user dashboard when impersonating
  - Shows: "You are viewing as: [User Name]"
  - "Exit to Admin" button to restore admin session
  - Sticky positioning (always visible at top)

### 3. **Admin Sidebar Integration**
- **Location**: `Frontend/src/components/admin/AdminSidebar.tsx`
- **Changes**:
  - Added purple "Sign in as User" button below navigation menu
  - Button appears in both desktop and mobile views
  - Opens the UserImpersonationDialog on click

### 4. **User Dashboard Integration**
- **Location**: `Frontend/src/pages/Dashboard.tsx`
- **Changes**:
  - Added `ImpersonationBanner` component at top of dashboard
  - Banner only shows when `impersonating_user_id` is in localStorage
  - Adjusted layout to accommodate banner (flex-col wrapper)

### 5. **Backend Impersonation Endpoint**
- **Route**: `POST /api/admin/impersonate/:userId`
- **Location**: `backend/src/routes/admin.ts` + `backend/src/controllers/adminController.ts`
- **Features**:
  - Admin-only access (requires `requireAdmin` middleware)
  - Validates user exists and is active
  - Generates JWT token for target user
  - Marks token as `impersonated: true` in payload
  - Logs impersonation action for audit trail
  - Returns token + user details

## How It Works

### Impersonation Flow:
1. **Admin clicks "Sign in as User"** → Opens dialog with user list
2. **Admin selects a user** → Frontend calls `POST /api/admin/impersonate/:userId`
3. **Backend generates user token** → Returns JWT for that user
4. **Frontend stores tokens**:
   - Backs up admin token: `localStorage.setItem('admin_token_backup', adminToken)`
   - Stores user info: `localStorage.setItem('impersonating_user_id', userId)`
   - Stores user name: `localStorage.setItem('impersonating_user_name', userName)`
   - Replaces active token: `localStorage.setItem('token', userToken)`
5. **Redirect to user dashboard** → `navigate('/dashboard')` + page reload
6. **Banner appears** → Shows "Viewing as [User]" with exit button
7. **All API calls use user token** → Admin sees exactly what user sees

### Exit Flow:
1. **Admin clicks "Exit to Admin"** in banner
2. **Frontend restores admin token**:
   - Retrieves: `localStorage.getItem('admin_token_backup')`
   - Restores: `localStorage.setItem('token', adminToken)`
3. **Clears impersonation data**:
   - Removes: `impersonating_user_id`, `impersonating_user_name`, `admin_token_backup`
4. **Redirect to admin panel** → `navigate('/admin')` + page reload

## Security Features

1. **Admin-only access**: `requireAdmin` middleware enforces authorization
2. **Audit logging**: All impersonations logged via `logAdminAction('IMPERSONATE_USER', 'user')`
3. **Active user check**: Cannot impersonate inactive users
4. **Token marking**: Impersonated tokens marked with `impersonated: true` flag
5. **24-hour expiry**: Impersonation tokens expire after 24 hours
6. **Session isolation**: Admin token safely backed up in localStorage

## UI/UX Details

### Color Scheme:
- **Impersonation Button**: Purple (`bg-purple-600`)
- **Warning Banner**: Orange (`bg-orange-600`) - highly visible
- **Exit Button**: White text on orange with white border

### Visibility:
- Banner is sticky (z-50) - always visible when scrolling
- Button prominently placed in admin sidebar
- Clear messaging: "You are viewing as [Name]" + "All actions will be performed as this user"

## Files Modified/Created

### Created:
1. `Frontend/src/components/admin/UserImpersonationDialog.tsx` (165 lines)
2. `Frontend/src/components/admin/ImpersonationBanner.tsx` (46 lines)

### Modified:
1. `Frontend/src/components/admin/AdminSidebar.tsx`
   - Added `UserCheck` import
   - Added `UserImpersonationDialog` import
   - Added `Button` import
   - Added state: `isImpersonationDialogOpen`
   - Added button in desktop sidebar footer
   - Added button in mobile menu footer
   - Rendered dialog component

2. `Frontend/src/pages/Dashboard.tsx`
   - Added `ImpersonationBanner` import
   - Added banner above main dashboard container
   - Wrapped layout in flex-col for proper banner positioning

3. `backend/src/routes/admin.ts`
   - Added route: `POST /admin/impersonate/:userId`

4. `backend/src/controllers/adminController.ts`
   - Added `jwt` import
   - Added `impersonateUser()` method (65 lines)

## API Endpoints Used

### Frontend → Backend:
1. `GET /api/admin/users` - Fetch all users for selection
2. `POST /api/admin/impersonate/:userId` - Generate impersonation token

### Data Flow:
```
Admin Dashboard
    ↓
"Sign in as User" button
    ↓
User Selection Dialog (fetches users)
    ↓
Click user → POST /impersonate/:userId
    ↓
Backend validates → generates JWT
    ↓
Frontend stores tokens + user info
    ↓
Redirect to /dashboard (as that user)
    ↓
ImpersonationBanner shows at top
    ↓
All API calls use user token
    ↓
"Exit to Admin" → restore admin token
    ↓
Redirect to /admin
```

## LocalStorage Keys

| Key | Purpose | When Set | When Cleared |
|-----|---------|----------|--------------|
| `token` | Current active auth token | Always | Never (replaced during impersonation) |
| `admin_token_backup` | Original admin token | During impersonation | On exit |
| `impersonating_user_id` | ID of impersonated user | During impersonation | On exit |
| `impersonating_user_name` | Name of impersonated user | During impersonation | On exit |

## Testing Checklist

- [ ] Admin can see "Sign in as User" button in sidebar
- [ ] Clicking button opens dialog with user list
- [ ] Search filters users by name/email
- [ ] Clicking "Sign in as [User]" generates token and redirects
- [ ] User dashboard shows orange banner with user name
- [ ] All tabs/features work from user's perspective
- [ ] "Exit to Admin" restores admin session
- [ ] Cannot impersonate inactive users
- [ ] Impersonation is logged in audit trail
- [ ] Mobile view shows button correctly

## Benefits

1. **Client Demonstrations**: Show potential clients their data without logging out
2. **Troubleshooting**: Debug user-specific issues by viewing their exact interface
3. **Support**: Help users navigate features while seeing their view
4. **QA Testing**: Test multi-user scenarios easily
5. **Audit Trail**: All impersonations logged for security compliance

## Notes

- Impersonation tokens expire after 24 hours
- Admin privileges are NOT carried over to impersonated session
- All actions appear as if the user performed them (use responsibly!)
- Banner ensures admin always knows they're viewing as another user
- Original admin session safely preserved and easily restored
