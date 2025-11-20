/**
 * Timezone Detection Middleware
 * Detects user timezone from IP address and browser headers
 */

import { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';
import { logger } from '../utils/logger';
import { isValidTimezone } from '../utils/timezoneUtils';

/**
 * Extended request interface with timezone detection
 */
export interface TimezoneRequest extends Request {
  detectedTimezone?: {
    timezone: string;
    source: 'ip' | 'header' | 'default';
    confidence: 'high' | 'medium' | 'low';
  };
}

/**
 * Map country codes to common timezones
 * Used as fallback when geoip doesn't provide timezone
 */
const COUNTRY_TO_TIMEZONE: Record<string, string> = {
  'US': 'America/New_York',
  'CA': 'America/Toronto',
  'GB': 'Europe/London',
  'FR': 'Europe/Paris',
  'DE': 'Europe/Berlin',
  'IN': 'Asia/Kolkata',
  'JP': 'Asia/Tokyo',
  'CN': 'Asia/Shanghai',
  'AU': 'Australia/Sydney',
  'BR': 'America/Sao_Paulo',
  'MX': 'America/Mexico_City',
  'SG': 'Asia/Singapore',
  'AE': 'Asia/Dubai',
  'RU': 'Europe/Moscow',
  'ZA': 'Africa/Johannesburg',
  'NG': 'Africa/Lagos',
  'EG': 'Africa/Cairo',
  'KE': 'Africa/Nairobi',
  'AR': 'America/Argentina/Buenos_Aires',
  'NZ': 'Pacific/Auckland',
};

/**
 * Extract IP address from request, handling proxies and load balancers
 */
function extractIpAddress(req: Request): string | null {
  // Check X-Forwarded-For header (common for proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0];
    return ips.trim();
  }

  // Check X-Real-IP header (nginx, cloudflare)
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') {
    return cfIp.trim();
  }

  // Fallback to socket IP
  return req.socket.remoteAddress || req.ip || null;
}

/**
 * Detect timezone from IP address using geoip-lite
 */
function detectTimezoneFromIp(ip: string): string | null {
  try {
    // Skip localhost and private IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      logger.debug('Skipping timezone detection for local IP', { ip });
      return null;
    }

    const geo = geoip.lookup(ip);
    
    if (!geo) {
      logger.debug('No geo data found for IP', { ip });
      return null;
    }

    // Try to get timezone from geoip data
    if (geo.timezone && isValidTimezone(geo.timezone)) {
      logger.info('Timezone detected from IP', { 
        ip, 
        timezone: geo.timezone,
        country: geo.country 
      });
      return geo.timezone;
    }

    // Fallback to country-based timezone
    if (geo.country && COUNTRY_TO_TIMEZONE[geo.country]) {
      const fallbackTimezone = COUNTRY_TO_TIMEZONE[geo.country];
      logger.info('Using country-based timezone fallback', {
        ip,
        country: geo.country,
        timezone: fallbackTimezone
      });
      return fallbackTimezone;
    }

    logger.warn('Could not determine timezone from IP', { 
      ip, 
      country: geo.country 
    });
    return null;
  } catch (error) {
    logger.error('Error detecting timezone from IP', { ip, error });
    return null;
  }
}

/**
 * Detect timezone from browser header (X-Timezone)
 */
function detectTimezoneFromHeader(req: Request): string | null {
  const headerTimezone = req.headers['x-timezone'] as string;
  
  if (headerTimezone && isValidTimezone(headerTimezone)) {
    logger.debug('Timezone detected from header', { timezone: headerTimezone });
    return headerTimezone;
  }

  return null;
}

/**
 * Timezone detection middleware
 * Attaches detected timezone to request object
 */
export function timezoneDetectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const typedReq = req as TimezoneRequest;

  try {
    // Strategy 1: Try IP-based detection
    const ip = extractIpAddress(req);
    if (ip) {
      const ipTimezone = detectTimezoneFromIp(ip);
      if (ipTimezone) {
        typedReq.detectedTimezone = {
          timezone: ipTimezone,
          source: 'ip',
          confidence: 'high'
        };
        return next();
      }
    }

    // Strategy 2: Try browser header
    const headerTimezone = detectTimezoneFromHeader(req);
    if (headerTimezone) {
      typedReq.detectedTimezone = {
        timezone: headerTimezone,
        source: 'header',
        confidence: 'medium'
      };
      return next();
    }

    // Strategy 3: Default to UTC
    typedReq.detectedTimezone = {
      timezone: 'UTC',
      source: 'default',
      confidence: 'low'
    };

    logger.debug('No timezone detected, defaulting to UTC', {
      ip,
      hasHeader: !!req.headers['x-timezone']
    });

  } catch (error) {
    logger.error('Timezone detection middleware error', { error });
    // Set default on error
    typedReq.detectedTimezone = {
      timezone: 'UTC',
      source: 'default',
      confidence: 'low'
    };
  }

  next();
}

/**
 * Helper to get detected timezone from request
 */
export function getDetectedTimezone(req: Request): string {
  const typedReq = req as TimezoneRequest;
  return typedReq.detectedTimezone?.timezone || 'UTC';
}

/**
 * Helper to check if timezone was auto-detected vs default
 */
export function wasTimezoneAutoDetected(req: Request): boolean {
  const typedReq = req as TimezoneRequest;
  return typedReq.detectedTimezone?.source !== 'default';
}
