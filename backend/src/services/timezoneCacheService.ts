import { CacheManager } from './memoryCache';
import { logger } from '../utils/logger';
import database from '../config/database';

/**
 * User timezone cache entry
 */
interface UserTimezoneCache {
  timezone: string;
  timezoneAutoDetected: boolean;
  timezoneManuallySet: boolean;
  cachedAt: Date;
}

/**
 * Timezone Cache Service
 * 
 * Caches user timezones to avoid repeated database queries.
 * Invalidates cache when timezone changes.
 * 
 * Requirements:
 * - Cache timezone on user authentication
 * - Invalidate on timezone update
 * - Default to 'UTC' if not found
 */
export class TimezoneCacheService {
  private static timezoneCache = CacheManager.getCache<UserTimezoneCache>('timezone', {
    maxSize: 1000,
    maxMemory: 5 * 1024 * 1024, // 5MB
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  });

  /**
   * Get user timezone from cache or database
   */
  static async getUserTimezone(userId: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.timezoneCache.get(`user:${userId}`);
      if (cached) {
        logger.debug('Timezone retrieved from cache', { userId, timezone: cached.timezone });
        return cached.timezone;
      }

      // Fetch from database
      const result = await database.query(
        'SELECT timezone, timezone_auto_detected, timezone_manually_set FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        logger.warn('User not found for timezone lookup', { userId });
        return 'UTC';
      }

      const user = result.rows[0];
      const timezone = user.timezone || 'UTC';

      // Cache the result
      this.timezoneCache.set(`user:${userId}`, {
        timezone,
        timezoneAutoDetected: user.timezone_auto_detected || false,
        timezoneManuallySet: user.timezone_manually_set || false,
        cachedAt: new Date(),
      });

      logger.debug('Timezone fetched from database and cached', { userId, timezone });
      return timezone;
    } catch (error) {
      logger.error('Error fetching user timezone', { userId, error });
      return 'UTC'; // Fallback to UTC on error
    }
  }

  /**
   * Get user timezone from cache only (no database query)
   * Returns null if not cached
   */
  static getCachedTimezone(userId: string): string | null {
    const cached = this.timezoneCache.get(`user:${userId}`);
    return cached ? cached.timezone : null;
  }

  /**
   * Cache user timezone (called during authentication)
   */
  static cacheUserTimezone(
    userId: string,
    timezone: string,
    timezoneAutoDetected: boolean = false,
    timezoneManuallySet: boolean = false
  ): void {
    this.timezoneCache.set(`user:${userId}`, {
      timezone,
      timezoneAutoDetected,
      timezoneManuallySet,
      cachedAt: new Date(),
    });

    logger.debug('Timezone cached for user', { userId, timezone });
  }

  /**
   * Invalidate timezone cache for a user
   * Called when user updates their timezone
   */
  static invalidateUserTimezone(userId: string): void {
    this.timezoneCache.delete(`user:${userId}`);
    logger.info('Timezone cache invalidated', { userId });
  }

  /**
   * Invalidate all timezone caches
   * Use sparingly - only for major system changes
   */
  static invalidateAll(): void {
    this.timezoneCache.clear();
    logger.info('All timezone caches invalidated');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      size: this.timezoneCache.size,
      // Add more stats if needed from MemoryCache
    };
  }

  /**
   * Warm cache for multiple users
   * Useful for preloading active users
   */
  static async warmCache(userIds: string[]): Promise<void> {
    try {
      const result = await database.query(
        `SELECT id, timezone, timezone_auto_detected, timezone_manually_set 
         FROM users 
         WHERE id = ANY($1)`,
        [userIds]
      );

      for (const user of result.rows) {
        this.timezoneCache.set(`user:${user.id}`, {
          timezone: user.timezone || 'UTC',
          timezoneAutoDetected: user.timezone_auto_detected || false,
          timezoneManuallySet: user.timezone_manually_set || false,
          cachedAt: new Date(),
        });
      }

      logger.info('Timezone cache warmed', { userCount: result.rows.length });
    } catch (error) {
      logger.error('Error warming timezone cache', { error });
    }
  }
}

/**
 * Helper function for SQL queries - gets timezone with fallback
 */
export async function getUserTimezoneForQuery(userId: string): Promise<string> {
  return TimezoneCacheService.getUserTimezone(userId);
}
