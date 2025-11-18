# Unused Database Objects Analysis

**Generated:** November 18, 2025  
**Database:** PostgreSQL  
**Project:** Calling Agent with Bolna AI

## Executive Summary

This document identifies database tables, views, columns, and other objects that are **no longer actively used** in the current codebase. These objects were created during early development phases or during migration between different systems (ElevenLabs → Bolna AI) but are now obsolete.

---

## 🔴 COMPLETELY UNUSED TABLES

### 1. **`call_analytics_cache`**
- **Created in:** `006_add_call_analytics_cache.sql`
- **Purpose:** Pre-calculated analytics cache for improved performance
- **Status:** ❌ **NOT USED**
- **Evidence:** 
  - No SELECT queries in codebase
  - Created to cache daily/weekly/monthly analytics
  - Replaced by real-time aggregation queries
- **Safe to Drop:** ✅ YES
- **Impact:** None - no code references this table

### 2. **`migration_status`**
- **Created in:** `004_bolna_migration_phase1.sql`
- **Purpose:** Track Bolna.ai migration progress
- **Status:** ❌ **NOT USED** (except in migration script itself)
- **Evidence:** Only referenced in `migrate_to_bolna_data.ts` (one-time migration script)
- **Safe to Drop:** ✅ YES (after migration is complete)
- **Impact:** None - migration is complete

### 3. **`migration_log`**
- **Created in:** `005_bolna_migration_phase2_complete.sql`
- **Purpose:** Log migration completion events
- **Status:** ❌ **NOT USED**
- **Evidence:** Only INSERT statement in migration file, never queried
- **Safe to Drop:** ✅ YES
- **Impact:** Historical logging only

### 4. **`trigger_performance_metrics`**
- **Created in:** `020_optimize_trigger_performance.sql`
- **Purpose:** Track database trigger execution performance
- **Status:** ⚠️ **PARTIALLY USED** (only in monitoring scripts)
- **Evidence:** Only used in `monitor-trigger-performance.ts` script
- **Safe to Drop:** ⚠️ CONDITIONAL (keep if you run performance monitoring)
- **Impact:** Monitoring only

### 5. **`trigger_error_log`**
- **Created in:** `021_fix_cache_invalidation_trigger_logic.sql`
- **Purpose:** Log trigger errors for debugging
- **Status:** ⚠️ **PARTIALLY USED** (only in test/debug scripts)
- **Evidence:** Only referenced in cache invalidation test scripts
- **Safe to Drop:** ⚠️ CONDITIONAL (useful for debugging)
- **Impact:** Debugging/testing only

### 6. **`twilio_processed_calls`**
- **Created in:** `042_add_not_connected_to_contacts.sql`
- **Purpose:** Track processed Twilio calls
- **Status:** ❌ **NOT USED**
- **Evidence:** Table created but no code references found
- **Safe to Drop:** ✅ YES
- **Impact:** None

### 7. **`password_reset_attempts`**
- **Created in:** `003_custom_auth_system.sql`
- **Purpose:** Track password reset attempts for security
- **Status:** ❌ **NOT USED**
- **Evidence:** Table created with cleanup function but never actually used in auth flow
- **Safe to Drop:** ⚠️ CONDITIONAL (may be needed for security auditing)
- **Impact:** Security monitoring

### 8. **`credit_notifications`**
- **Created in:** `048_enable_negative_credits_and_notifications.sql`
- **Purpose:** Track credit-related notifications
- **Status:** ❌ **REPLACED**
- **Evidence:** Replaced by unified `notifications` table in migration 051
- **Safe to Drop:** ✅ YES
- **Impact:** Functionality moved to `notifications` table

---

## 🟡 UNUSED VIEWS

### 1. **`recent_call_analytics`**
- **Created in:** `006_add_call_analytics_cache.sql`
- **Purpose:** View of recent analytics from cache
- **Status:** ❌ **NOT USED**
- **Evidence:** No SELECT queries in codebase
- **Safe to Drop:** ✅ YES

### 2. **`elevenlabs_backup_data`**
- **Created in:** `005_bolna_migration_phase2_complete.sql`
- **Purpose:** Backup view during ElevenLabs to Bolna migration
- **Status:** ❌ **NOT USED**
- **Evidence:** Migration complete, view never queried
- **Safe to Drop:** ✅ YES
- **Impact:** Historical migration data only

### 3. **`bolna_agents`**
- **Created in:** `006_complete_elevenlabs_removal.sql`
- **Purpose:** View of agents with Bolna configuration
- **Status:** ❌ **NOT USED**
- **Evidence:** No queries found, direct table queries used instead
- **Safe to Drop:** ✅ YES

### 4. **`active_user_sessions`**
- **Created in:** `003_custom_auth_system.sql` and `004_add_refresh_tokens.sql`
- **Purpose:** View of active user sessions
- **Status:** ❌ **NOT USED**
- **Evidence:** Direct `user_sessions` table queries used instead
- **Safe to Drop:** ✅ YES

### 5. **`user_login_stats`**
- **Created in:** `003_custom_auth_system.sql`
- **Purpose:** View of user login statistics
- **Status:** ❌ **NOT USED**
- **Evidence:** No SELECT queries found
- **Safe to Drop:** ✅ YES

### 6. **`call_source_analytics`**
- **Created in:** `017_add_call_source_detection.sql`
- **Purpose:** Analytics view for call sources (inbound/outbound)
- **Status:** ⚠️ **MINIMAL USE**
- **Evidence:** Only used in one test file (`callSourceDetection.test.ts`)
- **Safe to Drop:** ⚠️ CONDITIONAL (test-only usage)

### 7. **`user_performance_summary`**
- **Created in:** `026_add_user_analytics_cta_aggregation.sql`
- **Purpose:** Summary view of user performance metrics
- **Status:** ❌ **NOT USED**
- **Evidence:** No SELECT queries in application code
- **Safe to Drop:** ✅ YES

### 8. **`customer_analytics`**
- **Created in:** `032_enhance_lead_intelligence_and_customers.sql`
- **Purpose:** Analytics view for customer data
- **Status:** ❌ **NOT USED**
- **Evidence:** No application code references
- **Safe to Drop:** ✅ YES

### 9. **`queue_status_by_type`**
- **Created in:** `050_add_direct_calls_to_queue.sql`
- **Purpose:** View of call queue status grouped by type
- **Status:** ❌ **NOT USED**
- **Evidence:** Direct queue table queries used instead
- **Safe to Drop:** ✅ YES

### 10. **`user_concurrency_status`**
- **Created in:** `049_add_active_calls_tracking_and_call_source_management.sql`
- **Purpose:** View of user concurrent call status
- **Status:** ❌ **NOT USED**
- **Evidence:** No application references
- **Safe to Drop:** ✅ YES

### 11. **`system_concurrency_overview`**
- **Created in:** `049_add_active_calls_tracking_and_call_source_management.sql`
- **Purpose:** System-wide concurrency overview
- **Status:** ❌ **NOT USED**
- **Evidence:** No application references
- **Safe to Drop:** ✅ YES

---

## 🔵 UNUSED COLUMNS (Still Present in Tables)

### **`agents` table:**

1. **`elevenlabs_agent_id`** 
   - **Status:** 🔴 **DEPRECATED** (ElevenLabs migration complete)
   - **Should be dropped:** ✅ YES (after backup)
   - **Replacement:** `bolna_agent_id`
   - **Note:** Migration 006 was supposed to drop this but may not have been fully applied

2. **`elevenlabs_config`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

3. **`elevenlabs_voice_id`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

4. **`elevenlabs_model_id`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

### **`calls` table:**

1. **`elevenlabs_conversation_id`**
   - **Status:** 🔴 **DEPRECATED** (ElevenLabs migration complete)
   - **Should be dropped:** ✅ YES (after backup)
   - **Replacement:** `bolna_execution_id`
   - **Current usage:** Only in test files and migration scripts

2. **`elevenlabs_agent_config`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

3. **`elevenlabs_voice_settings`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

4. **`elevenlabs_metadata`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

### **`users` table:**

1. **`stack_auth_user_id`**
   - **Status:** 🔴 **REMOVED** in migration 003
   - **Verified:** ✅ Already dropped

2. **`password_reset_token`**
   - **Status:** ⚠️ **MINIMAL USE**
   - **Evidence:** Column exists but password reset flow seems incomplete
   - **Safe to drop:** ⚠️ Review password reset implementation first

3. **`password_reset_expires`**
   - **Status:** ⚠️ **MINIMAL USE**
   - **Same as above**

4. **`email_verification_token`**
   - **Status:** ✅ **ACTIVELY USED** (keep)

### **`transcripts` table:**

1. **`elevenlabs_transcript_id`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

### **`lead_analytics` table:**

1. **`elevenlabs_analysis_id`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES

### **`phone_numbers` table:**

1. **`elevenlabs_phone_number_id`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES
   - **Note:** Index `idx_phone_numbers_elevenlabs_id` already dropped in migration 031

2. **`bolna_phone_number_id`**
   - **Status:** 🔴 **DEPRECATED**
   - **Should be dropped:** ✅ YES
   - **Note:** Index already dropped in migration 031

---

## 🟢 TABLES WITH MINIMAL/TEST-ONLY USAGE

### 1. **`trigger_execution_log`**
- **Created in:** `022_create_trigger_execution_log.sql`
- **Purpose:** Log trigger executions for monitoring
- **Status:** ⚠️ **TEST/MONITORING ONLY**
- **Evidence:** Used in data integrity monitoring and test files
- **Safe to Drop:** ⚠️ CONDITIONAL
- **Recommendation:** Keep if you need trigger debugging, otherwise drop

### 2. **`admin_audit_log`**
- **Created in:** `002_add_admin_roles.sql`
- **Purpose:** Track admin actions
- **Status:** ✅ **ACTIVELY USED**
- **Evidence:** `AdminAuditLog.ts` model exists and is used
- **Safe to Drop:** ❌ NO - Keep this table

### 3. **`dashboard_cache`**
- **Created in:** `010_add_kpi_update_triggers.sql`
- **Purpose:** Cache dashboard data
- **Status:** ⚠️ **PARTIALLY USED**
- **Evidence:** Referenced in test files and scripts
- **Safe to Drop:** ⚠️ Review dashboard caching strategy first

---

## 📊 MATERIALIZED VIEWS

### 1. **`user_kpi_summary`**
- **Created in:** `012_create_user_kpi_materialized_view.sql`
- **Purpose:** Pre-calculated KPIs for all users
- **Status:** ✅ **ACTIVELY USED**
- **Evidence:** Used in `dashboardKpiService.ts`
- **Safe to Drop:** ❌ NO - Keep this

---

## 🛠️ RECOMMENDED CLEANUP ACTIONS

### Phase 1: Safe to Drop Immediately
```sql
-- Tables
DROP TABLE IF EXISTS call_analytics_cache CASCADE;
DROP TABLE IF EXISTS migration_status CASCADE;
DROP TABLE IF EXISTS migration_log CASCADE;
DROP TABLE IF EXISTS twilio_processed_calls CASCADE;

-- Views
DROP VIEW IF EXISTS recent_call_analytics;
DROP VIEW IF EXISTS elevenlabs_backup_data;
DROP VIEW IF EXISTS bolna_agents;
DROP VIEW IF EXISTS active_user_sessions;
DROP VIEW IF EXISTS user_login_stats;
DROP VIEW IF EXISTS user_performance_summary;
DROP VIEW IF EXISTS customer_analytics;
DROP VIEW IF EXISTS queue_status_by_type;
DROP VIEW IF EXISTS user_concurrency_status;
DROP VIEW IF EXISTS system_concurrency_overview;
```

### Phase 2: Drop After Backup (ElevenLabs Columns)
```sql
-- BACKUP FIRST!
-- Create backup table
CREATE TABLE elevenlabs_migration_backup AS
SELECT 
  a.id as agent_id,
  a.elevenlabs_agent_id,
  a.bolna_agent_id,
  c.id as call_id,
  c.elevenlabs_conversation_id,
  c.bolna_execution_id
FROM agents a
LEFT JOIN calls c ON a.id = c.agent_id
WHERE a.elevenlabs_agent_id IS NOT NULL 
   OR c.elevenlabs_conversation_id IS NOT NULL;

-- Then drop columns
ALTER TABLE agents 
  DROP COLUMN IF EXISTS elevenlabs_agent_id,
  DROP COLUMN IF EXISTS elevenlabs_config,
  DROP COLUMN IF EXISTS elevenlabs_voice_id,
  DROP COLUMN IF EXISTS elevenlabs_model_id;

ALTER TABLE calls
  DROP COLUMN IF EXISTS elevenlabs_conversation_id,
  DROP COLUMN IF EXISTS elevenlabs_agent_config,
  DROP COLUMN IF EXISTS elevenlabs_voice_settings,
  DROP COLUMN IF EXISTS elevenlabs_metadata;

ALTER TABLE transcripts 
  DROP COLUMN IF EXISTS elevenlabs_transcript_id;

ALTER TABLE lead_analytics 
  DROP COLUMN IF EXISTS elevenlabs_analysis_id;

ALTER TABLE phone_numbers
  DROP COLUMN IF EXISTS elevenlabs_phone_number_id,
  DROP COLUMN IF EXISTS bolna_phone_number_id;
```

### Phase 3: Review and Decide
```sql
-- These require investigation before dropping:
-- - trigger_performance_metrics (useful for monitoring)
-- - trigger_error_log (useful for debugging)
-- - trigger_execution_log (used in data integrity monitoring)
-- - password_reset_attempts (security feature - may be incomplete)
-- - dashboard_cache (review caching strategy)
-- - call_source_analytics (test-only usage)
```

---

## 📈 ESTIMATED STORAGE IMPACT

Based on the analysis:
- **Unused tables:** ~7-10 tables
- **Unused views:** ~11 views
- **Deprecated columns:** ~15+ columns across multiple tables
- **Potential storage savings:** Varies based on data volume, but ElevenLabs columns likely contain duplicate data

---

## ⚠️ IMPORTANT NOTES

1. **Always backup before dropping any database objects**
2. **Test in staging environment first**
3. **Some "unused" objects may be useful for debugging or future analytics**
4. **Coordinate with team before dropping anything**
5. **Check application logs for any runtime errors after dropping**

---

## 🔍 HOW THIS ANALYSIS WAS CONDUCTED

1. ✅ Analyzed all 80+ migration files
2. ✅ Searched entire codebase for table/view references
3. ✅ Identified deprecated objects from migration history
4. ✅ Cross-referenced with active application code
5. ✅ Categorized by usage level and safety

---

## 📝 MAINTENANCE RECOMMENDATION

**Create a regular audit process:**
- Review database objects quarterly
- Document new migrations clearly
- Mark deprecated objects in migration comments
- Use database object naming conventions (e.g., `legacy_`, `deprecated_`)
- Consider automated tools for schema analysis

---

**Document Version:** 1.0  
**Analyst:** GitHub Copilot  
**Review Status:** Initial Analysis - Requires Team Review
