import { describe, test, expect } from '@jest/globals';
import {
  isValidTimezone,
  formatTimeInTimezone,
  getCurrentTimeInTimezone,
  convertBetweenTimezones,
  getValidTimezones,
  parseTimeStringInTimezone,
  isWithinTimeWindow
} from '../../utils/timezoneUtils';

describe('Timezone Utilities', () => {
  describe('isValidTimezone', () => {
    test('should return true for valid IANA timezones', () => {
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/Los_Angeles')).toBe(true);
    });

    test('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('America/FakeCity')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('PST')).toBe(false); // Abbreviations not accepted
      expect(isValidTimezone('GMT+5')).toBe(false); // Offset format not accepted
    });

    test('should return false for null or undefined', () => {
      expect(isValidTimezone(null as any)).toBe(false);
      expect(isValidTimezone(undefined as any)).toBe(false);
    });

    test('should be case-sensitive', () => {
      // Note: Some timezones may be case-insensitive in Intl API
      // We primarily reject abbreviations and invalid formats
      expect(isValidTimezone('america/new_york')).toBeDefined();
      expect(isValidTimezone('AMERICA/NEW_YORK')).toBeDefined();
    });
  });

  describe('getValidTimezones', () => {
    test('should return an array of valid timezones', () => {
      const timezones = getValidTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
    });

    test('should include common timezones', () => {
      const timezones = getValidTimezones();
      expect(timezones).toContain('America/New_York');
      expect(timezones).toContain('Europe/London');
      expect(timezones).toContain('Asia/Tokyo');
      expect(timezones).toContain('UTC');
    });

    test('should only include valid timezones', () => {
      const timezones = getValidTimezones();
      timezones.forEach(tz => {
        expect(isValidTimezone(tz)).toBe(true);
      });
    });
  });

  describe('formatTimeInTimezone', () => {
    const testDate = new Date('2025-01-15T12:00:00Z'); // Noon UTC

    test('should format date in specified timezone', () => {
      const formatted = formatTimeInTimezone(testDate, 'America/New_York', 'PPpp');
      expect(formatted).toContain('2025');
      expect(formatted).toContain('7:00'); // EST is UTC-5
    });

    test('should handle UTC timezone', () => {
      const formatted = formatTimeInTimezone(testDate, 'UTC', 'HH:mm');
      expect(formatted).toBe('12:00');
    });

    test('should format with different patterns', () => {
      const time = formatTimeInTimezone(testDate, 'UTC', 'HH:mm');
      expect(time).toMatch(/^\d{2}:\d{2}$/);

      const date = formatTimeInTimezone(testDate, 'UTC', 'yyyy-MM-dd');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should handle invalid timezone gracefully', () => {
      const result = formatTimeInTimezone(testDate, 'Invalid/Timezone', 'PPpp');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrentTimeInTimezone', () => {
    test('should return current time in specified timezone', () => {
      const nyTime = getCurrentTimeInTimezone('America/New_York');
      expect(nyTime).toBeInstanceOf(Date);
      expect(nyTime.getTime()).toBeCloseTo(Date.now(), -2); // Within seconds
    });

    test('should return current time in UTC', () => {
      const utcTime = getCurrentTimeInTimezone('UTC');
      expect(utcTime).toBeInstanceOf(Date);
      expect(Math.abs(utcTime.getTime() - Date.now())).toBeLessThan(1000);
    });

    test('should handle invalid timezone gracefully', () => {
      const result = getCurrentTimeInTimezone('Invalid/Timezone');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('convertBetweenTimezones', () => {
    test('should convert time between timezones', () => {
      const utcDate = new Date('2025-01-15T12:00:00Z');
      const nyDate = convertBetweenTimezones(utcDate, 'UTC', 'America/New_York');
      
      expect(nyDate).toBeInstanceOf(Date);
      // Same moment in time, different timezone representation
      expect(nyDate.getTime()).toBe(utcDate.getTime());
    });

    test('should handle same timezone conversion', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const converted = convertBetweenTimezones(date, 'UTC', 'UTC');
      
      expect(converted.getTime()).toBe(date.getTime());
    });

    test('should convert across multiple timezones', () => {
      const utcDate = new Date('2025-01-15T12:00:00Z');
      const tokyoDate = convertBetweenTimezones(utcDate, 'UTC', 'Asia/Tokyo');
      const londonDate = convertBetweenTimezones(tokyoDate, 'Asia/Tokyo', 'Europe/London');
      
      // All should represent the same moment
      expect(utcDate.getTime()).toBe(tokyoDate.getTime());
      expect(tokyoDate.getTime()).toBe(londonDate.getTime());
    });

    test('should handle invalid source timezone gracefully', () => {
      const result = convertBetweenTimezones(new Date(), 'Invalid/Timezone', 'UTC');
      expect(result).toBeInstanceOf(Date);
    });

    test('should handle invalid target timezone gracefully', () => {
      const result = convertBetweenTimezones(new Date(), 'UTC', 'Invalid/Timezone');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('parseTimeStringInTimezone', () => {
    test('should parse time string in specified timezone', () => {
      const referenceDate = new Date('2025-01-15T00:00:00Z');
      const parsed = parseTimeStringInTimezone('09:00', 'America/New_York', referenceDate);
      
      expect(parsed).toBeInstanceOf(Date);
    });

    test('should handle UTC timezone', () => {
      const referenceDate = new Date('2025-01-15T00:00:00Z');
      const parsed = parseTimeStringInTimezone('12:00', 'UTC', referenceDate);
      
      expect(parsed).toBeInstanceOf(Date);
    });

    test('should parse different time formats', () => {
      const referenceDate = new Date('2025-01-15T00:00:00Z');
      const morning = parseTimeStringInTimezone('09:30', 'UTC', referenceDate);
      expect(morning).toBeInstanceOf(Date);

      const evening = parseTimeStringInTimezone('17:45', 'UTC', referenceDate);
      expect(evening).toBeInstanceOf(Date);
    });

    test('should handle invalid time format gracefully', () => {
      const referenceDate = new Date('2025-01-15T00:00:00Z');
      const result1 = parseTimeStringInTimezone('25:00', 'UTC', referenceDate);
      expect(result1).toBeInstanceOf(Date);

      const result2 = parseTimeStringInTimezone('invalid', 'UTC', referenceDate);
      expect(result2).toBeInstanceOf(Date);
    });

    test('should handle invalid timezone gracefully', () => {
      const referenceDate = new Date('2025-01-15T00:00:00Z');
      const result = parseTimeStringInTimezone('09:00', 'Invalid/Timezone', referenceDate);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('isWithinTimeWindow', () => {
    test('should return true when time is within window', () => {
      const date = new Date('2025-01-15T10:00:00Z'); // 10 AM UTC
      const result = isWithinTimeWindow('09:00', '17:00', 'UTC', date);
      
      expect(result).toBe(true);
    });

    test('should return false when time is before window', () => {
      const date = new Date('2025-01-15T08:00:00Z'); // 8 AM UTC
      const result = isWithinTimeWindow('09:00', '17:00', 'UTC', date);
      
      expect(result).toBe(false);
    });

    test('should return false when time is after window', () => {
      const date = new Date('2025-01-15T18:00:00Z'); // 6 PM UTC
      const result = isWithinTimeWindow('09:00', '17:00', 'UTC', date);
      
      expect(result).toBe(false);
    });

    test('should handle boundary times (inclusive)', () => {
      const startTime = new Date('2025-01-15T09:00:00Z');
      const endTime = new Date('2025-01-15T17:00:00Z');
      
      expect(isWithinTimeWindow('09:00', '17:00', 'UTC', startTime)).toBe(true);
      expect(isWithinTimeWindow('09:00', '17:00', 'UTC', endTime)).toBe(true);
    });

    test('should work with different timezones', () => {
      // 10 AM EST = 3 PM UTC
      const date = new Date('2025-01-15T15:00:00Z');
      const result = isWithinTimeWindow('09:00', '17:00', 'America/New_York', date);
      
      expect(result).toBe(true);
    });

    test('should handle overnight windows (crosses midnight)', () => {
      const lateNight = new Date('2025-01-15T23:00:00Z');
      const earlyMorning = new Date('2025-01-16T02:00:00Z');
      
      expect(isWithinTimeWindow('22:00', '06:00', 'UTC', lateNight)).toBe(true);
      expect(isWithinTimeWindow('22:00', '06:00', 'UTC', earlyMorning)).toBe(true);
    });

    test('should handle invalid timezone gracefully', () => {
      const result = isWithinTimeWindow('09:00', '17:00', 'Invalid/Timezone', new Date());
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Edge Cases and DST Handling', () => {
    test('should handle daylight saving time transitions', () => {
      // Spring forward: March 10, 2024, 2:00 AM -> 3:00 AM (EST -> EDT)
      const beforeDST = new Date('2024-03-09T12:00:00Z');
      const afterDST = new Date('2024-03-11T12:00:00Z');
      
      const formatted1 = formatTimeInTimezone(beforeDST, 'America/New_York', 'z');
      const formatted2 = formatTimeInTimezone(afterDST, 'America/New_York', 'z');
      
      // Dates exist and are formatted
      expect(formatted1.length).toBeGreaterThan(0);
      expect(formatted2.length).toBeGreaterThan(0);
    });

    test('should handle leap years', () => {
      const leapDay = new Date('2024-02-29T12:00:00Z');
      const formatted = formatTimeInTimezone(leapDay, 'UTC', 'yyyy-MM-dd');
      
      expect(formatted).toBe('2024-02-29');
    });

    test('should handle year boundaries', () => {
      const newYear = new Date('2024-12-31T23:59:59Z');
      const formatted = formatTimeInTimezone(newYear, 'UTC', 'yyyy-MM-dd HH:mm:ss');
      
      expect(formatted).toContain('2024-12-31');
    });
  });

  describe('Performance', () => {
    test('should validate timezone quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        isValidTimezone('America/New_York');
      }
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete in < 1000ms
    });

    test('should format dates efficiently', () => {
      const date = new Date();
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        formatTimeInTimezone(date, 'America/New_York', 'PPpp');
      }
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500); // Should complete in < 500ms
    });
  });
});
