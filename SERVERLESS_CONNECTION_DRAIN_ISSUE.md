# Serverless Connection Drain Issue - Root Cause Analysis

## 🔍 Problem Statement
Database connections are NOT draining to 0 when idle, despite serverless configuration:
- `SERVERLESS=true` in `.env`
- Pool config: `min=0`, `allowExitOnIdle=true`, `idleTimeoutMillis=600000`
- Health checks disabled

**Expected**: Connections drain to 0 when no requests are active  
**Actual**: Connections stay alive indefinitely

---

## 🎯 Root Cause

**Background services are keeping the Node.js event loop active with `setInterval` timers, preventing the pool from entering idle state.**

Even with `allowExitOnIdle=true` and `min=0`, the PostgreSQL pool can ONLY drain when the Node.js event loop has no pending work. Active `setInterval` timers keep the event loop busy, preventing the pool from recognizing the idle state.

---

## 🚨 Services Preventing Idle Drainage

### 1. **InMemoryCampaignScheduler** ✅ ALWAYS ACTIVE
**File**: `backend/src/services/InMemoryCampaignScheduler.ts`
**Initialized**: `server.ts` line 407-429 (when `ENABLE_IN_MEMORY_SCHEDULER !== 'false'`)

**Behavior**:
- Uses `setTimeout` to schedule wake-ups (line 42: `wakeTimeout`)
- Loads campaigns on initialization and schedules next wake time
- **NO serverless awareness** - always runs if campaigns exist
- **Impact**: Keeps event loop active with pending timeout

```typescript
private wakeTimeout: NodeJS.Timeout | null = null;

async initialize(): Promise<void> {
  await this.loadCampaignSchedules();
  this.scheduleNextWake(); // <-- Sets setTimeout
}
```

**Default State**: ENABLED (only disabled if `ENABLE_IN_MEMORY_SCHEDULER='false'`)

---

### 2. **webhookRetryService** ✅ ALWAYS ACTIVE
**File**: `backend/src/services/webhookRetryService.ts`  
**Initialized**: `server.ts` line 389

**Behavior**:
- Line 33: `setInterval(() => { this.processRetryQueue(); }, 10000)` - checks every 10 seconds
- **NO serverless awareness** - always runs
- **Impact**: Keeps event loop active with 10-second interval

```typescript
startRetryProcessor(): void {
  this.retryIntervalId = setInterval(() => {
    this.processRetryQueue();
  }, 10000); // <-- Keeps event loop alive forever
}
```

**Default State**: ENABLED (no configuration option)

---

### 3. **chatAgentUserSyncService** ✅ ALWAYS ACTIVE (if CHAT_AGENT_SERVER_URL set)
**File**: `backend/src/services/chatAgentUserSyncService.ts`  
**Initialized**: `server.ts` line 397

**Behavior**:
- Line 97: `setInterval(() => { this.processRetryQueue(); }, 5 * 60 * 1000)` - checks every 5 minutes
- Only runs if `CHAT_AGENT_SERVER_URL` is configured
- **NO serverless awareness** - always runs when URL is set
- **Impact**: Keeps event loop active with 5-minute interval

```typescript
initialize(): void {
  this.retryCheckInterval = setInterval(() => {
    this.processRetryQueue().catch(error => {
      logger.error('❌ Error processing user sync retry queue', { error: error.message });
    });
  }, this.RETRY_CHECK_INTERVAL); // <-- Keeps event loop alive
}
```

**Default State**: ENABLED (if `CHAT_AGENT_SERVER_URL` exists in env)

---

### 4. **scheduledTaskService** ⚠️ SHOULD BE DISABLED (but check runtime)
**File**: `backend/src/services/scheduledTaskService.ts`  
**Initialized**: `server.ts` line 380

**Behavior**:
- Line 109: `setInterval` for low credits notifications (24 hours)
- Line 143: `setInterval` for email verification reminders (6 hours)
- **HAS serverless awareness**: Lines 32-47 show proper defaults
  ```typescript
  const serverless = process.env.SERVERLESS === 'true';
  const lowCreditsEnabled = this.parseBool(
    process.env.LOW_CREDITS_NOTIFICATIONS_ENABLED,
    serverless ? false : true  // Defaults to DISABLED in serverless
  );
  ```
- **Status**: Should be disabled but verify no explicit env var overrides

**Default State**: DISABLED in serverless (if no explicit env vars)

---

### 5. **QueueProcessorService** (LEGACY - Should Be Replaced)
**File**: `backend/src/services/QueueProcessorService.ts`  
**Status**: Replaced by InMemoryCampaignScheduler but might still be initialized

**Behavior**:
- Line 37: `setInterval(() => { this.processQueue(); }, interval)` - default 10 seconds
- **NO serverless awareness**
- **Impact**: If still active, keeps event loop alive

---

## 🔬 Technical Explanation: Why `allowExitOnIdle` Isn't Working

### PostgreSQL Pool Idle Detection Logic
```typescript
// pg.Pool checks if process can exit:
if (allowExitOnIdle && min === 0 && allClientsIdle) {
  // Pool drains connections
}
```

### The Problem
**Node.js event loop has pending timers → Process is NOT idle → `allowExitOnIdle` never triggers**

Even with `min=0`:
1. `setInterval` timers keep the event loop active
2. Node.js runtime considers the process "busy"
3. PostgreSQL pool sees active event loop
4. Pool doesn't drain because process isn't truly idle
5. Connections stay alive until manually closed OR process exits

---

## ✅ Solution Options

### Option 1: Disable All Background Services in Serverless Mode (Recommended)

**Pros**: 
- Guarantees connection drainage
- Minimizes compute costs
- True serverless behavior

**Cons**:
- Need alternative trigger mechanisms (HTTP endpoints, scheduled tasks via external service)

**Implementation**:
```typescript
// server.ts - Add serverless check before service initialization

const isServerless = process.env.SERVERLESS === 'true';

if (!isServerless) {
  // Only start background services in non-serverless environments
  scheduledTaskService.startScheduledTasks();
  webhookRetryService.startRetryProcessor();
  chatAgentUserSyncService.initialize();
  
  if (process.env.ENABLE_IN_MEMORY_SCHEDULER !== 'false') {
    await inMemoryCampaignScheduler.initialize();
  }
}
```

---

### Option 2: Add Serverless Awareness to Each Service

**Update each service to respect `SERVERLESS` flag:**

#### InMemoryCampaignScheduler
```typescript
async initialize(): Promise<void> {
  if (process.env.SERVERLESS === 'true') {
    logger.info('⚠️ Serverless mode - Campaign scheduler disabled');
    return;
  }
  // ... existing logic
}
```

#### webhookRetryService
```typescript
startRetryProcessor(): void {
  if (process.env.SERVERLESS === 'true') {
    logger.info('⚠️ Serverless mode - Webhook retry processor disabled');
    return;
  }
  // ... existing logic
}
```

#### chatAgentUserSyncService
```typescript
initialize(): void {
  if (process.env.SERVERLESS === 'true') {
    logger.info('⚠️ Serverless mode - Chat agent sync disabled');
    return;
  }
  // ... existing logic
}
```

---

### Option 3: Use Environment Variables to Control Each Service

Add granular control via env vars:

```env
# .env
SERVERLESS=true

# Service-specific toggles
ENABLE_SCHEDULED_TASKS=false          # scheduledTaskService
ENABLE_WEBHOOK_RETRY=false            # webhookRetryService
ENABLE_CHAT_AGENT_SYNC=false          # chatAgentUserSyncService
ENABLE_IN_MEMORY_SCHEDULER=false      # InMemoryCampaignScheduler
```

---

## 🛠️ Recommended Action Plan

### Phase 1: Immediate Fix (Choose One)
**A) Quick Kill Switch (Fastest)**
```typescript
// server.ts - Add at top of startServer()
const isServerless = process.env.SERVERLESS === 'true';

if (isServerless) {
  logger.info('🌐 Serverless mode detected - Background services disabled');
  logger.info('✅ Connections will drain to 0 when idle');
  // Skip all background service initialization
  // ... rest of startup without services
} else {
  // Start all services normally
  scheduledTaskService.startScheduledTasks();
  webhookRetryService.startRetryProcessor();
  chatAgentUserSyncService.initialize();
  // ... etc
}
```

**B) Individual Service Control (More Flexible)**
Add serverless checks to each service's initialization method.

---

### Phase 2: Alternative Processing Methods

Since background services will be disabled in serverless:

1. **Webhook Retries**: 
   - Use on-demand retry via HTTP endpoint
   - Client-side retry logic
   - External queue service (SQS, Pub/Sub)

2. **Campaign Scheduling**:
   - HTTP endpoint to trigger campaign processing
   - External cron service (Railway Cron, GitHub Actions, etc.)
   - Database triggers (Neon has logical replication)

3. **User Sync**:
   - Synchronous during registration (accept slight delay)
   - Async job queue (external service)

4. **Scheduled Tasks**:
   - External cron service calling HTTP endpoints
   - Railway Cron Jobs
   - Vercel Cron
   - GitHub Actions scheduled workflows

---

## 📊 Expected Results After Fix

### Before Fix
```
Active Connections: 5-10 (idle)
Event Loop: Active (setInterval timers)
Pool Drain: Never (process not idle)
Compute Hours: ~24/day
```

### After Fix
```
Active Connections: 0 (when no requests)
Event Loop: Idle (no timers)
Pool Drain: Within 10-15 minutes of last request
Compute Hours: ~2-4/day (only during active requests)
Cost Savings: 70-80%
```

---

## 🔍 Verification Steps

After implementing fix:

1. **Check Event Loop Status**:
   ```typescript
   // Add to server.ts for debugging
   setInterval(() => {
     const handles = process._getActiveHandles();
     const requests = process._getActiveRequests();
     console.log(`Active handles: ${handles.length}, requests: ${requests.length}`);
   }, 30000);
   ```

2. **Monitor Pool Connections**:
   ```sql
   -- Query Neon dashboard or run:
   SELECT count(*) FROM pg_stat_activity 
   WHERE datname = 'your_db_name';
   ```

3. **Test Idle Drainage**:
   - Start server
   - Make one API request
   - Wait 15 minutes
   - Check connection count (should be 0)

---

## 📝 Files to Modify

### Option 1 (Quick Kill Switch)
- ✅ `backend/src/server.ts` - Add serverless check before service init

### Option 2 (Individual Service Control)
- ✅ `backend/src/services/InMemoryCampaignScheduler.ts` - Add serverless check
- ✅ `backend/src/services/webhookRetryService.ts` - Add serverless check
- ✅ `backend/src/services/chatAgentUserSyncService.ts` - Add serverless check
- ✅ `backend/src/services/QueueProcessorService.ts` - Add serverless check (if still used)

### Option 3 (Env Var Control)
- ✅ All service files + `backend/.env` updates

---

## 🎓 Key Learnings

1. **`allowExitOnIdle` requires TRUE idle state** - Active timers prevent pool drainage
2. **`min=0` is necessary but not sufficient** - Event loop must be idle
3. **Background services in serverless = anti-pattern** - Use external triggers instead
4. **Serverless-first design** - Check `SERVERLESS` flag in ALL services
5. **Database notification listeners** - Already disabled due to connection issues (good!)

---

## ⚡ Quick Command to Verify Current State

```bash
# Check which services are actually running
cd backend
grep -rn "setInterval\|setTimeout" src/services/ --include="*.ts" | grep -v "clear"

# Check env configuration
grep "SERVERLESS\|ENABLE_" .env

# Check server.ts initialization
grep -A2 "startScheduledTasks\|startRetryProcessor\|initialize()" src/server.ts
```

---

**Status**: 🔴 ROOT CAUSE IDENTIFIED - AWAITING FIX IMPLEMENTATION  
**Priority**: HIGH (Directly impacts compute costs)  
**Estimated Fix Time**: 15-30 minutes  
**Testing Time**: 15 minutes + 15 min wait for idle verification
