/**
 * Email Tracking Routes
 * 
 * PUBLIC endpoints (no authentication) for tracking email opens and clicks.
 * These are called by email clients when they load the tracking pixel or
 * when users click tracked links.
 */

import { Router, Request, Response } from 'express';
import emailTrackingService from '../services/emailTrackingService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /track/open/:trackingId.png
 * 
 * Tracking pixel endpoint. Called when an email client loads the embedded
 * 1x1 transparent pixel image. Records the open event and returns the pixel.
 * 
 * This is a PUBLIC endpoint - no authentication required.
 */
router.get('/open/:trackingId.png', async (req: Request, res: Response) => {
  try {
    const trackingId = req.params.trackingId.replace('.png', '');
    
    // Get request metadata
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Record the open event (async, don't wait)
    emailTrackingService.recordTrackingEvent({
      emailId: trackingId,
      eventType: 'open',
      ipAddress,
      userAgent
    }).catch(err => {
      logger.error('Failed to record open event:', err);
    });

    // Return the transparent 1x1 pixel
    const pixel = emailTrackingService.getTransparentPixel();
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Prevent caching in proxies
      'Surrogate-Control': 'no-store'
    });
    
    res.send(pixel);
  } catch (error) {
    logger.error('Error in tracking pixel endpoint:', error);
    
    // Still return a valid pixel to not break email rendering
    const pixel = emailTrackingService.getTransparentPixel();
    res.set('Content-Type', 'image/png');
    res.send(pixel);
  }
});

/**
 * GET /track/click/:trackingId/:linkId
 * 
 * Link click tracking endpoint. Called when a user clicks a tracked link.
 * Records the click event and redirects to the original URL.
 * 
 * Query params:
 * - url: The original URL to redirect to (URL encoded)
 * 
 * This is a PUBLIC endpoint - no authentication required.
 */
router.get('/click/:trackingId/:linkId', async (req: Request, res: Response) => {
  try {
    const { trackingId, linkId } = req.params;
    const originalUrl = req.query.url as string;
    
    if (!originalUrl) {
      logger.warn('Click tracking missing URL', { trackingId, linkId });
      res.status(400).send('Missing redirect URL');
      return;
    }
    
    // Decode the URL
    const decodedUrl = decodeURIComponent(originalUrl);
    
    // Get request metadata
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Record the click event (async, don't wait for redirect)
    emailTrackingService.recordTrackingEvent({
      emailId: trackingId,
      eventType: 'click',
      ipAddress,
      userAgent,
      clickedUrl: decodedUrl,
      linkId
    }).catch(err => {
      logger.error('Failed to record click event:', err);
    });

    // Redirect to the original URL
    res.redirect(302, decodedUrl);
  } catch (error) {
    logger.error('Error in link click tracking:', error);
    
    // Try to redirect anyway if we have a URL
    const originalUrl = req.query.url as string;
    if (originalUrl) {
      res.redirect(302, decodeURIComponent(originalUrl));
    } else {
      res.status(500).send('Tracking error');
    }
  }
});

/**
 * GET /track/unsubscribe/:trackingId
 * 
 * Optional: Unsubscribe tracking endpoint.
 * Can be used to track unsubscribe clicks and handle list management.
 */
router.get('/unsubscribe/:trackingId', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;
    
    // Record the unsubscribe event
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    
    await emailTrackingService.recordTrackingEvent({
      emailId: trackingId,
      eventType: 'click',
      ipAddress,
      userAgent,
      clickedUrl: 'unsubscribe',
      linkId: 'unsubscribe'
    });

    // TODO: Add actual unsubscribe logic here
    // For now, show a simple confirmation page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 400px; margin: 0 auto; }
          h1 { color: #333; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Unsubscribed</h1>
          <p>You have been successfully unsubscribed from our mailing list.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error in unsubscribe endpoint:', error);
    res.status(500).send('An error occurred');
  }
});

/**
 * Helper function to get client IP address
 * Handles proxies and load balancers
 */
function getClientIp(req: Request): string {
  // Check various headers for the real IP
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    return ips.split(',')[0].trim();
  }
  
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  }
  
  // Fall back to connection remote address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export default router;
