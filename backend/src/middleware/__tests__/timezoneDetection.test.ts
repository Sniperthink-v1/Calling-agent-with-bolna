import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  timezoneDetectionMiddleware,
  getTimezoneFromRequest,
  detectTimezoneFromIP
} from '../../middleware/timezoneDetection';

// Mock geoip-lite
jest.mock('geoip-lite', () => ({
  lookup: jest.fn()
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

import geoip from 'geoip-lite';

describe('Timezone Detection Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn()
    };
    mockResponse = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('timezoneDetectionMiddleware', () => {
    test('should use X-Timezone header when provided', () => {
      mockRequest.headers = {
        'x-timezone': 'America/New_York'
      };

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).timezone).toBe('America/New_York');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should detect timezone from IP when header not provided', () => {
      mockRequest.ip = '8.8.8.8'; // Google DNS
      (geoip.lookup as jest.Mock).mockReturnValue({
        timezone: 'America/Los_Angeles'
      });

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).timezone).toBe('America/Los_Angeles');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should fallback to UTC when no timezone detected', () => {
      mockRequest.ip = '127.0.0.1'; // Localhost
      (geoip.lookup as jest.Mock).mockReturnValue(null);

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).timezone).toBe('UTC');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should prefer X-Timezone header over IP detection', () => {
      mockRequest.headers = {
        'x-timezone': 'Europe/London'
      };
      mockRequest.ip = '8.8.8.8';
      (geoip.lookup as jest.Mock).mockReturnValue({
        timezone: 'America/Los_Angeles'
      });

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).timezone).toBe('Europe/London');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle invalid X-Timezone header gracefully', () => {
      mockRequest.headers = {
        'x-timezone': 'Invalid/Timezone'
      };
      mockRequest.ip = '8.8.8.8';
      (geoip.lookup as jest.Mock).mockReturnValue({
        timezone: 'America/Los_Angeles'
      });

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should fallback to IP detection or UTC
      expect((mockRequest as any).timezone).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle missing IP address', () => {
      delete mockRequest.ip;

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).timezone).toBe('UTC');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should call next() exactly once', () => {
      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTimezoneFromRequest', () => {
    test('should extract timezone from X-Timezone header', () => {
      mockRequest.headers = {
        'x-timezone': 'America/New_York'
      };

      const timezone = getTimezoneFromRequest(mockRequest as Request);
      expect(timezone).toBe('America/New_York');
    });

    test('should handle case-insensitive header names', () => {
      mockRequest.headers = {
        'X-TIMEZONE': 'America/Chicago'
      };
      (mockRequest.get as jest.Mock).mockReturnValue('America/Chicago');

      const timezone = getTimezoneFromRequest(mockRequest as Request);
      expect(timezone).toBe('America/Chicago');
    });

    test('should return null when header not present', () => {
      mockRequest.headers = {};

      const timezone = getTimezoneFromRequest(mockRequest as Request);
      expect(timezone).toBeNull();
    });

    test('should trim whitespace from header value', () => {
      mockRequest.headers = {
        'x-timezone': '  America/Denver  '
      };
      (mockRequest.get as jest.Mock).mockReturnValue('  America/Denver  ');

      const timezone = getTimezoneFromRequest(mockRequest as Request);
      expect(timezone).toBe('America/Denver');
    });

    test('should return null for empty header value', () => {
      mockRequest.headers = {
        'x-timezone': ''
      };
      (mockRequest.get as jest.Mock).mockReturnValue('');

      const timezone = getTimezoneFromRequest(mockRequest as Request);
      expect(timezone).toBeNull();
    });
  });

  describe('detectTimezoneFromIP', () => {
    test('should detect timezone from valid IP address', () => {
      const ip = '8.8.8.8';
      (geoip.lookup as jest.Mock).mockReturnValue({
        timezone: 'America/Los_Angeles'
      });

      const timezone = detectTimezoneFromIP(ip);
      expect(timezone).toBe('America/Los_Angeles');
      expect(geoip.lookup).toHaveBeenCalledWith(ip);
    });

    test('should return null for localhost IP', () => {
      const timezone = detectTimezoneFromIP('127.0.0.1');
      expect(timezone).toBeNull();
    });

    test('should return null for private IP ranges', () => {
      expect(detectTimezoneFromIP('192.168.1.1')).toBeNull();
      expect(detectTimezoneFromIP('10.0.0.1')).toBeNull();
      expect(detectTimezoneFromIP('172.16.0.1')).toBeNull();
    });

    test('should return null when geoip lookup fails', () => {
      (geoip.lookup as jest.Mock).mockReturnValue(null);

      const timezone = detectTimezoneFromIP('1.2.3.4');
      expect(timezone).toBeNull();
    });

    test('should return null for invalid IP address', () => {
      const timezone = detectTimezoneFromIP('invalid-ip');
      expect(timezone).toBeNull();
    });

    test('should handle IPv6 addresses', () => {
      const ipv6 = '2001:4860:4860::8888'; // Google DNS
      (geoip.lookup as jest.Mock).mockReturnValue({
        timezone: 'America/Los_Angeles'
      });

      const timezone = detectTimezoneFromIP(ipv6);
      expect(timezone).toBe('America/Los_Angeles');
    });

    test('should return null when timezone not in geoip data', () => {
      (geoip.lookup as jest.Mock).mockReturnValue({
        country: 'US'
        // No timezone field
      });

      const timezone = detectTimezoneFromIP('1.2.3.4');
      expect(timezone).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    test('should set timezone from header in real-world scenario', () => {
      const req = {
        headers: {
          'x-timezone': 'Asia/Tokyo',
          'user-agent': 'Mozilla/5.0'
        },
        ip: '8.8.8.8',
        get: (header: string) => req.headers[header.toLowerCase()]
      } as any;

      timezoneDetectionMiddleware(req, {} as Response, mockNext);

      expect(req.timezone).toBe('Asia/Tokyo');
    });

    test('should handle multiple concurrent requests', () => {
      const requests = [
        { headers: { 'x-timezone': 'America/New_York' }, ip: '1.1.1.1' },
        { headers: { 'x-timezone': 'Europe/London' }, ip: '2.2.2.2' },
        { headers: { 'x-timezone': 'Asia/Tokyo' }, ip: '3.3.3.3' }
      ];

      requests.forEach(reqData => {
        const req = {
          ...reqData,
          get: (header: string) => reqData.headers[header.toLowerCase()]
        } as any;

        timezoneDetectionMiddleware(req, {} as Response, () => {});

        expect(req.timezone).toBe(reqData.headers['x-timezone']);
      });
    });

    test('should work in middleware chain', () => {
      const middlewareChain = [
        timezoneDetectionMiddleware,
        (req: any, res: Response, next: NextFunction) => {
          expect(req.timezone).toBeDefined();
          next();
        }
      ];

      let finalNextCalled = false;
      const finalNext = () => { finalNextCalled = true; };

      middlewareChain[0](
        mockRequest as Request,
        mockResponse as Response,
        () => middlewareChain[1](
          mockRequest as Request,
          mockResponse as Response,
          finalNext
        )
      );

      expect(finalNextCalled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should not throw error on malformed request', () => {
      const badRequest = {} as Request;

      expect(() => {
        timezoneDetectionMiddleware(badRequest, mockResponse as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle geoip-lite throwing error', () => {
      (geoip.lookup as jest.Mock).mockImplementation(() => {
        throw new Error('Geoip error');
      });

      mockRequest.ip = '8.8.8.8';

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).timezone).toBe('UTC');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle undefined headers object', () => {
      delete mockRequest.headers;

      timezoneDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).timezone).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
