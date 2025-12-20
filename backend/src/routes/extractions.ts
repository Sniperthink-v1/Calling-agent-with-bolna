import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const CHAT_AGENT_SERVER_URL = process.env.CHAT_AGENT_SERVER_URL || 'http://localhost:4000';

/**
 * Normalize phone number for Chat Agent Server
 * Removes spaces only, keeps the '+' prefix
 * Input: "+91 8979556941" 
 * Output: "+918979556941"
 */
function normalizePhoneForChatServer(phone: string): string {
  return phone.replace(/\s/g, '');
}

/**
 * Extractions API Routes
 * 
 * Proxies requests to Chat Agent Server for extraction data (lead summaries from chat)
 * Base: /api/extractions
 * All routes require authentication
 */

/**
 * Get extraction summaries for a customer phone number
 * GET /api/extractions/summaries
 * 
 * Proxies to: GET /api/v1/extractions/summaries?customer_phone=...
 * 
 * Query params:
 * - customer_phone (required): Customer phone number in E.164 format
 * - latest_only (optional): Only return latest extraction per conversation (default: true)
 * - limit (optional): Max results (default: 50, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 */
router.get('/summaries', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    const { customer_phone, latest_only = 'true', limit = '50', offset = '0' } = req.query;

    if (!customer_phone) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'customer_phone query parameter is required',
      });
      return;
    }

    // Normalize phone number: remove +, spaces, dashes
    const normalizedPhone = normalizePhoneForChatServer(customer_phone as string);

    const queryParams = new URLSearchParams({
      customer_phone: normalizedPhone,
      latest_only: latest_only as string,
      limit: limit as string,
      offset: offset as string,
    });

    const url = `${CHAT_AGENT_SERVER_URL}/api/v1/extractions/summaries?${queryParams}`;

    logger.info('🔄 Proxying extraction summaries request', { userId, phone: normalizedPhone });

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });

    res.json(response.data);
  } catch (error: any) {
    logger.error('❌ Extraction summaries proxy failed', {
      error: error.message,
      status: error.response?.status,
    });

    // Forward error response if available
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch extraction summaries',
      message: error.message,
    });
  }
});

/**
 * Get full extraction data for a customer phone number
 * GET /api/extractions
 * 
 * Proxies to: GET /api/v1/extractions?customer_phone=...
 * 
 * Query params:
 * - customer_phone (required): Customer phone number in E.164 format
 * - lead_status (optional): Filter by lead status (Hot, Warm, Cold)
 * - min_score (optional): Minimum total score filter (5-15)
 * - latest_only (optional): Only return latest extraction per conversation (default: true)
 * - limit (optional): Max results (default: 50, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    const { 
      customer_phone, 
      lead_status, 
      min_score,
      latest_only = 'true', 
      limit = '50', 
      offset = '0' 
    } = req.query;

    if (!customer_phone) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'customer_phone query parameter is required',
      });
      return;
    }

    // Normalize phone number: remove +, spaces, dashes
    const normalizedPhone = normalizePhoneForChatServer(customer_phone as string);

    const queryParams = new URLSearchParams({
      customer_phone: normalizedPhone,
      latest_only: latest_only as string,
      limit: limit as string,
      offset: offset as string,
    });

    if (lead_status) {
      queryParams.append('lead_status', lead_status as string);
    }
    if (min_score) {
      queryParams.append('min_score', min_score as string);
    }

    const url = `${CHAT_AGENT_SERVER_URL}/api/v1/extractions?${queryParams}`;

    logger.info('🔄 Proxying full extractions request', { userId, phone: normalizedPhone });

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });

    res.json(response.data);
  } catch (error: any) {
    logger.error('❌ Full extractions proxy failed', {
      error: error.message,
      status: error.response?.status,
    });

    // Forward error response if available
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch extractions',
      message: error.message,
    });
  }
});

/**
 * Get batch extraction summaries for multiple phone numbers
 * POST /api/extractions/batch-summaries
 * 
 * Body:
 * - phoneNumbers (required): Array of phone numbers in E.164 format
 * 
 * Returns summaries for all phone numbers in a single request (more efficient for table view)
 */
router.post('/batch-summaries', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
      return;
    }

    const { phoneNumbers } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'phoneNumbers array is required in request body',
      });
      return;
    }

    // Limit batch size to prevent overload
    const limitedPhones = phoneNumbers.slice(0, 100);

    logger.info('🔄 Fetching batch extraction summaries', { 
      userId, 
      phoneCount: limitedPhones.length 
    });

    // Fetch summaries for each phone number in parallel (with concurrency limit)
    const results: Record<string, any> = {};
    const batchSize = 10; // Process 10 at a time to avoid overwhelming the server
    
    for (let i = 0; i < limitedPhones.length; i += batchSize) {
      const batch = limitedPhones.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (phone: string) => {
          try {
            // Normalize phone number: remove +, spaces, dashes
            const normalizedPhone = normalizePhoneForChatServer(phone);
            
            const queryParams = new URLSearchParams({
              customer_phone: normalizedPhone,
              latest_only: 'true',
              limit: '1', // Just get the latest summary
            });
            
            const url = `${CHAT_AGENT_SERVER_URL}/api/v1/extractions/summaries?${queryParams}`;
            
            const response = await axios.get(url, {
              timeout: 10000, // Shorter timeout for batch operations
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
              },
            });
            
            return { phone, data: response.data };
          } catch (error: any) {
            logger.warn(`Failed to fetch summary for ${phone}:`, error.message);
            return { phone, data: null };
          }
        })
      );
      
      // Process batch results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.data) {
          const { phone, data } = result.value;
          // Extract the first (latest) summary if available
          if (data.success && data.data && data.data.length > 0) {
            results[phone] = {
              in_detail_summary: data.data[0].in_detail_summary,
              smart_notification: data.data[0].smart_notification,
              lead_status_tag: data.data[0].lead_status_tag,
              total_score: data.data[0].total_score,
              extracted_at: data.data[0].extracted_at,
            };
          }
        }
      });
    }

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('❌ Batch extraction summaries failed', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch extraction summaries',
      message: error.message,
    });
  }
});

export default router;
