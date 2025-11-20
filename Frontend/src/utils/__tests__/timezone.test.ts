import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { detectBrowserTimezone, COMMON_TIMEZONES } from '../timezone';

describe('Frontend Timezone Utilities', () => {
  let originalDateTimeFormat: any;

  beforeEach(() => {
    // Store original Intl.DateTimeFormat
    originalDateTimeFormat = Intl.DateTimeFormat;
  });

  afterEach(() => {
    // Restore original Intl.DateTimeFormat
    (global as any).Intl.DateTimeFormat = originalDateTimeFormat;
  });

  describe('detectBrowserTimezone', () => {
    test('should detect browser timezone using Intl API', () => {
      const timezone = detectBrowserTimezone();
      
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
      // Should be a valid IANA timezone format
      expect(timezone).toMatch(/^[A-Za-z]+\/[A-Za-z_]+$/);
    });

    test('should return consistent timezone on multiple calls', () => {
      const tz1 = detectBrowserTimezone();
      const tz2 = detectBrowserTimezone();
      
      expect(tz1).toBe(tz2);
    });

    test('should fallback to UTC when Intl API fails', () => {
      // Mock Intl.DateTimeFormat to throw error
      (global as any).Intl = {
        DateTimeFormat: () => {
          throw new Error('Intl API not available');
        }
      };

      const timezone = detectBrowserTimezone();
      expect(timezone).toBe('UTC');
    });

    test('should handle invalid timezone from Intl API', () => {
      // Mock Intl.DateTimeFormat to return invalid timezone
      (global as any).Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
        resolvedOptions: () => ({ timeZone: '' })
      }));

      const timezone = detectBrowserTimezone();
      expect(timezone).toBe('UTC');
    });

    test('should detect common timezones correctly', () => {
      const commonZones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Asia/Tokyo'
      ];

      const timezone = detectBrowserTimezone();
      
      // Browser timezone should be a valid IANA timezone
      expect(timezone).toBeTruthy();
      expect(timezone).not.toBe('');
    });
  });

  describe('COMMON_TIMEZONES', () => {
    test('should be an array of timezone objects', () => {
      expect(Array.isArray(COMMON_TIMEZONES)).toBe(true);
      expect(COMMON_TIMEZONES.length).toBeGreaterThan(0);
    });

    test('should have correct structure for each timezone', () => {
      COMMON_TIMEZONES.forEach(tz => {
        expect(tz).toHaveProperty('value');
        expect(tz).toHaveProperty('label');
        expect(typeof tz.value).toBe('string');
        expect(typeof tz.label).toBe('string');
      });
    });

    test('should include UTC', () => {
      const utc = COMMON_TIMEZONES.find(tz => tz.value === 'UTC');
      expect(utc).toBeDefined();
      expect(utc?.label).toContain('UTC');
    });

    test('should include major US timezones', () => {
      const usTimezones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles'
      ];

      usTimezones.forEach(tzValue => {
        const tz = COMMON_TIMEZONES.find(t => t.value === tzValue);
        expect(tz).toBeDefined();
        expect(tz?.label).toBeTruthy();
      });
    });

    test('should include major international timezones', () => {
      const intlTimezones = [
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney'
      ];

      intlTimezones.forEach(tzValue => {
        const tz = COMMON_TIMEZONES.find(t => t.value === tzValue);
        expect(tz).toBeDefined();
        expect(tz?.label).toBeTruthy();
      });
    });

    test('should have user-friendly labels', () => {
      COMMON_TIMEZONES.forEach(tz => {
        // Labels should not just be the value
        expect(tz.label).not.toBe(tz.value);
        // Labels should be readable
        expect(tz.label.length).toBeGreaterThan(2);
      });
    });

    test('should not have duplicate values', () => {
      const values = COMMON_TIMEZONES.map(tz => tz.value);
      const uniqueValues = new Set(values);
      
      expect(uniqueValues.size).toBe(values.length);
    });

    test('should be sorted in a logical order', () => {
      // First item should be UTC
      expect(COMMON_TIMEZONES[0].value).toBe('UTC');
      
      // US timezones should be early in the list
      const usIndex = COMMON_TIMEZONES.findIndex(
        tz => tz.value.startsWith('America/')
      );
      expect(usIndex).toBeLessThan(10); // Should be in first 10
    });
  });

  describe('Timezone Detection Edge Cases', () => {
    test('should handle browser without timezone support', () => {
      // Mock browser without Intl API
      const originalIntl = (global as any).Intl;
      delete (global as any).Intl;

      const timezone = detectBrowserTimezone();
      
      expect(timezone).toBe('UTC');

      // Restore Intl
      (global as any).Intl = originalIntl;
    });

    test('should handle partial Intl API support', () => {
      // Mock Intl without DateTimeFormat
      (global as any).Intl = {};

      const timezone = detectBrowserTimezone();
      
      expect(timezone).toBe('UTC');
    });

    test('should handle DateTimeFormat without resolvedOptions', () => {
      (global as any).Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({}));

      const timezone = detectBrowserTimezone();
      
      expect(timezone).toBe('UTC');
    });

    test('should handle resolvedOptions without timeZone', () => {
      (global as any).Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
        resolvedOptions: () => ({})
      }));

      const timezone = detectBrowserTimezone();
      
      expect(timezone).toBe('UTC');
    });
  });

  describe('Timezone Format Validation', () => {
    test('should return valid IANA timezone format', () => {
      const timezone = detectBrowserTimezone();
      
      // IANA format: Area/Location or UTC
      const ianaFormat = /^(UTC|[A-Z][a-z]+\/[A-Za-z_]+)$/;
      expect(timezone).toMatch(ianaFormat);
    });

    test('should not return abbreviations', () => {
      const timezone = detectBrowserTimezone();
      
      // Should not be abbreviations like EST, PST, GMT
      const abbreviations = ['EST', 'PST', 'CST', 'MST', 'GMT', 'BST'];
      expect(abbreviations).not.toContain(timezone);
    });

    test('should not return offset formats', () => {
      const timezone = detectBrowserTimezone();
      
      // Should not be offset format like GMT+5, UTC-8
      expect(timezone).not.toMatch(/GMT[+-]\d+/);
      expect(timezone).not.toMatch(/UTC[+-]\d+/);
    });
  });

  describe('Integration with Common Timezones', () => {
    test('detected timezone should match one in COMMON_TIMEZONES or be valid', () => {
      const detected = detectBrowserTimezone();
      const isInCommon = COMMON_TIMEZONES.some(tz => tz.value === detected);
      const isUTC = detected === 'UTC';
      
      // Should either be in common list or be UTC (fallback)
      expect(isInCommon || isUTC).toBe(true);
    });

    test('all common timezones should be valid IANA format', () => {
      const ianaFormat = /^(UTC|[A-Z][a-z]+\/[A-Za-z_]+)$/;
      
      COMMON_TIMEZONES.forEach(tz => {
        expect(tz.value).toMatch(ianaFormat);
      });
    });
  });

  describe('Performance', () => {
    test('should detect timezone quickly', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        detectBrowserTimezone();
      }
      
      const duration = performance.now() - start;
      
      // Should complete 100 calls in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle rapid successive calls', () => {
      const calls = Array(1000).fill(null).map(() => detectBrowserTimezone());
      
      // All calls should return the same timezone
      const firstTz = calls[0];
      expect(calls.every(tz => tz === firstTz)).toBe(true);
    });
  });

  describe('Browser Compatibility', () => {
    test('should work in modern browsers', () => {
      // Modern browsers have Intl.DateTimeFormat
      expect(typeof Intl).toBe('object');
      expect(typeof Intl.DateTimeFormat).toBe('function');
      
      const timezone = detectBrowserTimezone();
      expect(timezone).toBeTruthy();
    });

    test('should gracefully degrade in older browsers', () => {
      // Simulate older browser
      const originalIntl = (global as any).Intl;
      (global as any).Intl = undefined;

      const timezone = detectBrowserTimezone();
      
      // Should fallback to UTC
      expect(timezone).toBe('UTC');

      // Restore
      (global as any).Intl = originalIntl;
    });
  });

  describe('Real-world Scenarios', () => {
    test('should detect timezone for user profile setup', () => {
      const userTimezone = detectBrowserTimezone();
      
      // Simulate saving to user profile
      const userProfile = {
        timezone: userTimezone,
        timezoneAutoDetected: true
      };
      
      expect(userProfile.timezone).toBeTruthy();
      expect(userProfile.timezoneAutoDetected).toBe(true);
    });

    test('should provide timezone for API headers', () => {
      const timezone = detectBrowserTimezone();
      
      // Simulate X-Timezone header
      const headers = {
        'X-Timezone': timezone
      };
      
      expect(headers['X-Timezone']).toBeTruthy();
      expect(typeof headers['X-Timezone']).toBe('string');
    });

    test('should find matching timezone in common list for UI', () => {
      const detected = detectBrowserTimezone();
      
      // Find in common timezones for dropdown
      const match = COMMON_TIMEZONES.find(tz => tz.value === detected);
      
      if (match) {
        expect(match.label).toBeTruthy();
        expect(match.value).toBe(detected);
      } else {
        // Should be UTC fallback
        expect(detected).toBe('UTC');
      }
    });
  });
});
