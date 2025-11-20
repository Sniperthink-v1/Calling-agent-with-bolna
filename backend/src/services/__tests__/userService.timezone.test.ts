import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Pool } from 'pg';
import {
  getUserProfile,
  updateUserProfile,
  validateProfileData
} from '../../services/userService';

// Mock database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { pool } from '../../config/database';

describe('User Service - Timezone Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    test('should return user profile with timezone fields', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'America/New_York',
        timezone_auto_detected: false,
        timezone_detected_from_ip: 'America/Los_Angeles'
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser]
      });

      const profile = await getUserProfile('user-123');

      expect(profile).toMatchObject({
        id: 'user-123',
        timezone: 'America/New_York',
        timezoneAutoDetected: false
      });
    });

    test('should handle user without timezone set', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: null,
        timezone_auto_detected: true
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser]
      });

      const profile = await getUserProfile('user-123');

      expect(profile.timezone).toBeUndefined();
      expect(profile.timezoneAutoDetected).toBe(true);
    });

    test('should default timezoneAutoDetected to true when null', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'UTC',
        timezone_auto_detected: null
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser]
      });

      const profile = await getUserProfile('user-123');

      expect(profile.timezoneAutoDetected).toBe(true);
    });
  });

  describe('updateUserProfile', () => {
    test('should update user timezone successfully', async () => {
      const userId = 'user-123';
      const updateData = {
        timezone: 'Europe/London',
        timezoneAutoDetected: false
      };

      const mockUpdatedUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'Europe/London',
        timezone_auto_detected: false
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockUpdatedUser]
      });

      const result = await updateUserProfile(userId, updateData);

      expect(result).toMatchObject({
        id: userId,
        timezone: 'Europe/London',
        timezoneAutoDetected: false
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['Europe/London', false, userId])
      );
    });

    test('should validate timezone before update', async () => {
      const userId = 'user-123';
      const invalidData = {
        timezone: 'Invalid/Timezone'
      };

      await expect(
        updateUserProfile(userId, invalidData)
      ).rejects.toThrow(/invalid timezone/i);

      expect(pool.query).not.toHaveBeenCalled();
    });

    test('should allow valid IANA timezones', async () => {
      const validTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'UTC'
      ];

      for (const tz of validTimezones) {
        jest.clearAllMocks();
        
        (pool.query as jest.Mock).mockResolvedValue({
          rows: [{
            id: 'user-123',
            timezone: tz,
            timezone_auto_detected: false
          }]
        });

        const result = await updateUserProfile('user-123', {
          timezone: tz,
          timezoneAutoDetected: false
        });

        expect(result.timezone).toBe(tz);
      }
    });

    test('should update timezone to null when cleared', async () => {
      const userId = 'user-123';

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: userId,
          timezone: null,
          timezone_auto_detected: true
        }]
      });

      const result = await updateUserProfile(userId, {
        timezone: null
      });

      expect(result.timezone).toBeUndefined();
    });

    test('should update other profile fields along with timezone', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'Updated Name',
        timezone: 'America/Chicago',
        timezoneAutoDetected: false,
        company: 'Test Corp'
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: userId,
          name: 'Updated Name',
          timezone: 'America/Chicago',
          timezone_auto_detected: false,
          company: 'Test Corp'
        }]
      });

      const result = await updateUserProfile(userId, updateData);

      expect(result).toMatchObject({
        name: 'Updated Name',
        timezone: 'America/Chicago',
        timezoneAutoDetected: false,
        company: 'Test Corp'
      });
    });

    test('should handle database errors gracefully', async () => {
      (pool.query as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        updateUserProfile('user-123', { timezone: 'UTC' })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('validateProfileData', () => {
    test('should validate correct timezone format', () => {
      const validData = {
        timezone: 'America/New_York'
      };

      expect(() => validateProfileData(validData)).not.toThrow();
    });

    test('should reject invalid timezone format', () => {
      const invalidData = {
        timezone: 'PST'
      };

      expect(() => validateProfileData(invalidData))
        .toThrow(/invalid timezone/i);
    });

    test('should accept null timezone', () => {
      const data = {
        timezone: null
      };

      expect(() => validateProfileData(data)).not.toThrow();
    });

    test('should accept undefined timezone', () => {
      const data = {};

      expect(() => validateProfileData(data)).not.toThrow();
    });

    test('should validate timezoneAutoDetected as boolean', () => {
      expect(() => validateProfileData({
        timezoneAutoDetected: true
      })).not.toThrow();

      expect(() => validateProfileData({
        timezoneAutoDetected: false
      })).not.toThrow();

      expect(() => validateProfileData({
        timezoneAutoDetected: 'true' as any
      })).toThrow();
    });
  });

  describe('Timezone Auto-Detection Flow', () => {
    test('should store IP-detected timezone on first login', async () => {
      const userId = 'user-123';
      const detectedTimezone = 'America/Los_Angeles';

      const updateData = {
        timezone: detectedTimezone,
        timezoneAutoDetected: true,
        timezoneDetectedFromIP: detectedTimezone
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: userId,
          timezone: detectedTimezone,
          timezone_auto_detected: true,
          timezone_detected_from_ip: detectedTimezone
        }]
      });

      const result = await updateUserProfile(userId, updateData);

      expect(result.timezone).toBe(detectedTimezone);
      expect(result.timezoneAutoDetected).toBe(true);
    });

    test('should override auto-detected timezone with manual selection', async () => {
      const userId = 'user-123';

      // Initially auto-detected
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: userId,
          timezone: 'America/Los_Angeles',
          timezone_auto_detected: true
        }]
      });

      await updateUserProfile(userId, {
        timezone: 'America/Los_Angeles',
        timezoneAutoDetected: true
      });

      // User manually changes
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: userId,
          timezone: 'America/New_York',
          timezone_auto_detected: false
        }]
      });

      const result = await updateUserProfile(userId, {
        timezone: 'America/New_York',
        timezoneAutoDetected: false
      });

      expect(result.timezone).toBe('America/New_York');
      expect(result.timezoneAutoDetected).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle user with no timezone preference', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          timezone: null
        }]
      });

      const profile = await getUserProfile('user-123');

      expect(profile.timezone).toBeUndefined();
    });

    test('should handle concurrent timezone updates', async () => {
      const userId = 'user-123';
      const updates = [
        { timezone: 'America/New_York' },
        { timezone: 'Europe/London' },
        { timezone: 'Asia/Tokyo' }
      ];

      let callCount = 0;
      (pool.query as jest.Mock).mockImplementation(() => {
        const tz = updates[callCount % updates.length].timezone;
        callCount++;
        return Promise.resolve({
          rows: [{
            id: userId,
            timezone: tz
          }]
        });
      });

      const results = await Promise.all(
        updates.map(data => updateUserProfile(userId, data))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.timezone).toBe(updates[i].timezone);
      });
    });

    test('should preserve timezone when updating other fields', async () => {
      const userId = 'user-123';

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: userId,
          name: 'New Name',
          timezone: 'America/New_York',
          timezone_auto_detected: false
        }]
      });

      const result = await updateUserProfile(userId, {
        name: 'New Name'
        // No timezone in update
      });

      expect(result.timezone).toBe('America/New_York');
    });
  });
});
