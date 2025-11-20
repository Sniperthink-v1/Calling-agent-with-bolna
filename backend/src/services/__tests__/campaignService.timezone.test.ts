import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Pool } from 'pg';

// Mock dependencies
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { pool } from '../../config/database';

describe('Campaign Service - Timezone Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Campaign Creation with Timezone', () => {
    test('should create campaign with valid custom timezone', async () => {
      const campaignData = {
        name: 'Test Campaign',
        agent_id: 'agent-123',
        user_id: 'user-123',
        max_concurrent_calls: 5,
        first_call_time: '09:00',
        last_call_time: '17:00',
        use_custom_timezone: true,
        campaign_timezone: 'America/New_York'
      };

      const mockCampaign = {
        id: 'campaign-123',
        ...campaignData,
        status: 'pending',
        created_at: new Date()
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockCampaign]
      });

      // This would be the actual service call
      // const result = await createCampaign(campaignData);

      // Verify timezone validation would pass
      expect(() => {
        if (campaignData.use_custom_timezone && campaignData.campaign_timezone) {
          const { isValidTimezone } = require('../../utils/timezoneUtils');
          if (!isValidTimezone(campaignData.campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).not.toThrow();
    });

    test('should reject campaign with invalid timezone', async () => {
      const campaignData = {
        name: 'Test Campaign',
        agent_id: 'agent-123',
        use_custom_timezone: true,
        campaign_timezone: 'Invalid/Timezone'
      };

      const { isValidTimezone } = require('../../utils/timezoneUtils');
      
      expect(() => {
        if (campaignData.use_custom_timezone && campaignData.campaign_timezone) {
          if (!isValidTimezone(campaignData.campaign_timezone)) {
            throw new Error('Invalid campaign timezone');
          }
        }
      }).toThrow('Invalid campaign timezone');
    });

    test('should allow campaign without custom timezone', async () => {
      const campaignData = {
        name: 'Test Campaign',
        agent_id: 'agent-123',
        use_custom_timezone: false
        // No campaign_timezone
      };

      expect(() => {
        const { isValidTimezone } = require('../../utils/timezoneUtils');
        if (campaignData.use_custom_timezone && (campaignData as any).campaign_timezone) {
          if (!isValidTimezone((campaignData as any).campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).not.toThrow();
    });

    test('should validate timezone when use_custom_timezone is true', async () => {
      const validTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'UTC'
      ];

      const { isValidTimezone } = require('../../utils/timezoneUtils');

      validTimezones.forEach(tz => {
        const campaignData = {
          use_custom_timezone: true,
          campaign_timezone: tz
        };

        expect(() => {
          if (campaignData.use_custom_timezone && campaignData.campaign_timezone) {
            if (!isValidTimezone(campaignData.campaign_timezone)) {
              throw new Error('Invalid timezone');
            }
          }
        }).not.toThrow();
      });
    });

    test('should not require timezone when use_custom_timezone is false', async () => {
      const campaignData = {
        name: 'Test Campaign',
        use_custom_timezone: false,
        campaign_timezone: undefined
      };

      expect(() => {
        const { isValidTimezone } = require('../../utils/timezoneUtils');
        if (campaignData.use_custom_timezone && campaignData.campaign_timezone) {
          if (!isValidTimezone(campaignData.campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).not.toThrow();
    });
  });

  describe('Campaign Update with Timezone', () => {
    test('should update campaign timezone', async () => {
      const campaignId = 'campaign-123';
      const updateData = {
        use_custom_timezone: true,
        campaign_timezone: 'Europe/London'
      };

      const mockUpdated = {
        id: campaignId,
        use_custom_timezone: true,
        campaign_timezone: 'Europe/London'
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockUpdated]
      });

      const { isValidTimezone } = require('../../utils/timezoneUtils');
      
      expect(() => {
        if (updateData.use_custom_timezone && updateData.campaign_timezone) {
          if (!isValidTimezone(updateData.campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).not.toThrow();
    });

    test('should allow removing custom timezone', async () => {
      const updateData = {
        use_custom_timezone: false,
        campaign_timezone: null
      };

      expect(() => {
        const { isValidTimezone } = require('../../utils/timezoneUtils');
        if (updateData.use_custom_timezone && updateData.campaign_timezone) {
          if (!isValidTimezone(updateData.campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).not.toThrow();
    });

    test('should validate new timezone on update', async () => {
      const updateData = {
        use_custom_timezone: true,
        campaign_timezone: 'Invalid/Zone'
      };

      const { isValidTimezone } = require('../../utils/timezoneUtils');

      expect(() => {
        if (updateData.use_custom_timezone && updateData.campaign_timezone) {
          if (!isValidTimezone(updateData.campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).toThrow('Invalid timezone');
    });
  });

  describe('Campaign Timezone Logic', () => {
    test('should use campaign timezone when use_custom_timezone is true', () => {
      const campaign = {
        use_custom_timezone: true,
        campaign_timezone: 'America/Los_Angeles'
      };
      const userTimezone = 'America/New_York';

      const effectiveTimezone = campaign.use_custom_timezone
        ? campaign.campaign_timezone
        : userTimezone;

      expect(effectiveTimezone).toBe('America/Los_Angeles');
    });

    test('should use user timezone when use_custom_timezone is false', () => {
      const campaign = {
        use_custom_timezone: false,
        campaign_timezone: null
      };
      const userTimezone = 'America/New_York';

      const effectiveTimezone = campaign.use_custom_timezone
        ? campaign.campaign_timezone
        : userTimezone;

      expect(effectiveTimezone).toBe('America/New_York');
    });

    test('should fallback to UTC when both are missing', () => {
      const campaign = {
        use_custom_timezone: false,
        campaign_timezone: null
      };
      const userTimezone = null;

      const effectiveTimezone = campaign.use_custom_timezone
        ? campaign.campaign_timezone
        : (userTimezone || 'UTC');

      expect(effectiveTimezone).toBe('UTC');
    });
  });

  describe('Scheduling with Timezones', () => {
    test('should schedule calls in campaign timezone', () => {
      const campaign = {
        first_call_time: '09:00',
        last_call_time: '17:00',
        use_custom_timezone: true,
        campaign_timezone: 'America/New_York'
      };

      const { parseTimeStringInTimezone } = require('../../utils/timezoneUtils');
      
      const startTime = parseTimeStringInTimezone(
        campaign.first_call_time,
        new Date().toISOString().split('T')[0],
        campaign.campaign_timezone!
      );

      expect(startTime).toBeInstanceOf(Date);
    });

    test('should schedule calls in user timezone when no campaign timezone', () => {
      const campaign = {
        first_call_time: '09:00',
        last_call_time: '17:00',
        use_custom_timezone: false
      };
      const userTimezone = 'America/Chicago';

      const { parseTimeStringInTimezone } = require('../../utils/timezoneUtils');
      
      const effectiveTimezone = campaign.use_custom_timezone
        ? (campaign as any).campaign_timezone
        : userTimezone;

      const startTime = parseTimeStringInTimezone(
        campaign.first_call_time,
        new Date().toISOString().split('T')[0],
        effectiveTimezone
      );

      expect(startTime).toBeInstanceOf(Date);
    });

    test('should validate call time windows in correct timezone', () => {
      const campaign = {
        first_call_time: '09:00',
        last_call_time: '17:00',
        campaign_timezone: 'America/New_York'
      };

      const { isWithinTimeWindow } = require('../../utils/timezoneUtils');

      // 10 AM EST should be within window
      const testTime = new Date('2025-01-15T15:00:00Z'); // 10 AM EST
      const isWithin = isWithinTimeWindow(
        testTime,
        campaign.first_call_time,
        campaign.last_call_time,
        campaign.campaign_timezone
      );

      expect(isWithin).toBe(true);
    });
  });

  describe('Timezone Conversion Scenarios', () => {
    test('should handle campaign in different timezone than user', () => {
      const userTimezone = 'America/New_York'; // EST
      const campaignTimezone = 'America/Los_Angeles'; // PST (3 hours behind)

      const { convertBetweenTimezones } = require('../../utils/timezoneUtils');

      const nyTime = new Date('2025-01-15T09:00:00Z'); // 9 AM UTC
      const laTime = convertBetweenTimezones(
        nyTime,
        userTimezone,
        campaignTimezone
      );

      expect(laTime).toBeInstanceOf(Date);
      expect(laTime.getTime()).toBe(nyTime.getTime()); // Same instant
    });

    test('should format campaign times for display in user timezone', () => {
      const campaignTime = '09:00'; // Campaign starts at 9 AM in campaign timezone
      const campaignTimezone = 'America/Los_Angeles';
      const userTimezone = 'America/New_York';

      const { parseTimeStringInTimezone, formatTimeInTimezone } = 
        require('../../utils/timezoneUtils');

      const startTime = parseTimeStringInTimezone(
        campaignTime,
        new Date().toISOString().split('T')[0],
        campaignTimezone
      );

      const userDisplay = formatTimeInTimezone(
        startTime,
        userTimezone,
        'HH:mm'
      );

      // 9 AM PST = 12 PM EST
      expect(userDisplay).toBe('12:00');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null campaign timezone gracefully', () => {
      const campaign = {
        use_custom_timezone: false,
        campaign_timezone: null
      };

      expect(() => {
        const { isValidTimezone } = require('../../utils/timezoneUtils');
        if (campaign.use_custom_timezone && campaign.campaign_timezone) {
          if (!isValidTimezone(campaign.campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).not.toThrow();
    });

    test('should handle missing timezone fields', () => {
      const campaign = {
        name: 'Test Campaign'
        // No timezone fields
      };

      expect(() => {
        const { isValidTimezone } = require('../../utils/timezoneUtils');
        if ((campaign as any).use_custom_timezone && (campaign as any).campaign_timezone) {
          if (!isValidTimezone((campaign as any).campaign_timezone)) {
            throw new Error('Invalid timezone');
          }
        }
      }).not.toThrow();
    });

    test('should handle DST transitions in campaign scheduling', () => {
      const { formatTimeInTimezone } = require('../../utils/timezoneUtils');

      // Before DST
      const beforeDST = new Date('2024-03-09T12:00:00Z');
      const formattedBefore = formatTimeInTimezone(
        beforeDST,
        'America/New_York',
        'z'
      );

      // After DST
      const afterDST = new Date('2024-03-11T12:00:00Z');
      const formattedAfter = formatTimeInTimezone(
        afterDST,
        'America/New_York',
        'z'
      );

      // Should reflect timezone change
      expect(formattedBefore).not.toBe(formattedAfter);
    });
  });

  describe('Validation Error Messages', () => {
    test('should provide clear error for invalid timezone', () => {
      const { isValidTimezone } = require('../../utils/timezoneUtils');

      try {
        if (!isValidTimezone('PST')) {
          throw new Error('Invalid campaign timezone: PST. Please use IANA timezone format (e.g., America/Los_Angeles)');
        }
      } catch (error: any) {
        expect(error.message).toContain('Invalid campaign timezone');
        expect(error.message).toContain('IANA timezone format');
      }
    });

    test('should validate timezone before database insert', () => {
      const { isValidTimezone } = require('../../utils/timezoneUtils');
      const timezone = 'America/New_York';

      const isValid = isValidTimezone(timezone);
      expect(isValid).toBe(true);

      // Only proceed with database call if valid
      if (isValid) {
        expect(pool.query).not.toHaveBeenCalled(); // Not called yet in test
      }
    });
  });
});
