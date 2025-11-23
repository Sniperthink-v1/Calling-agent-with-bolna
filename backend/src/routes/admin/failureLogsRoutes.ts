import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { failureLogModel } from '../../models/FailureLog';

const router = Router();

/**
 * @route GET /api/admin/failure-logs
 * @desc Get recent failure logs from database
 * @access Admin only
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await failureLogModel.getRecentFailures(limit, offset);

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit,
        offset,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Error fetching failure logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failure logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/admin/failure-logs/stats
 * @desc Get failure statistics
 * @access Admin only
 */
router.get('/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const hoursBack = parseInt(req.query.hours as string) || 24;

    const [byEndpoint, byStatus, trend] = await Promise.all([
      failureLogModel.getFailureStatsByEndpoint(hoursBack),
      failureLogModel.getFailureCountByStatus(hoursBack),
      failureLogModel.getFailureTrend(hoursBack)
    ]);

    res.json({
      success: true,
      data: {
        byEndpoint,
        byStatus,
        trend,
        timeRange: `Last ${hoursBack} hours`
      }
    });
  } catch (error) {
    console.error('Error fetching failure stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failure statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/admin/failure-logs/by-status
 * @desc Get failures by status code range (4xx or 5xx)
 * @access Admin only
 */
router.get('/by-status/:range', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const range = req.params.range; // '4xx' or '5xx'
    const limit = parseInt(req.query.limit as string) || 50;

    if (range !== '4xx' && range !== '5xx') {
      return res.status(400).json({
        success: false,
        message: 'Invalid status range. Use 4xx or 5xx'
      });
    }

    const minStatus = range === '4xx' ? 400 : 500;
    const maxStatus = range === '4xx' ? 499 : 599;

    const logs = await failureLogModel.getFailuresByStatusRange(minStatus, maxStatus, limit);

    res.json({
      success: true,
      data: logs,
      range: range
    });
  } catch (error) {
    console.error('Error fetching failures by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failures by status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/admin/failure-logs/by-endpoint
 * @desc Get failures for a specific endpoint
 * @access Admin only
 */
router.get('/by-endpoint', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const endpoint = req.query.endpoint as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint parameter is required'
      });
    }

    const logs = await failureLogModel.getFailuresByEndpoint(endpoint, limit);

    res.json({
      success: true,
      data: logs,
      endpoint
    });
  } catch (error) {
    console.error('Error fetching failures by endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failures by endpoint',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/admin/failure-logs/:id
 * @desc Get detailed failure log by ID
 * @access Admin only
 */
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await failureLogModel.getFailureDetails(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Failure log not found'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching failure log details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failure log details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/admin/failure-logs/cleanup
 * @desc Clean up old failure logs
 * @access Admin only
 */
router.post('/cleanup', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const daysToKeep = parseInt(req.body.daysToKeep as string) || 30;

    const deletedCount = await failureLogModel.cleanupOldLogs(daysToKeep);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old failure logs`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up failure logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up failure logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/admin/failure-logs/search
 * @desc Search failure logs by error message
 * @access Admin only
 */
router.get('/search/message', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter (q) is required'
      });
    }

    const logs = await failureLogModel.searchByErrorMessage(searchTerm, limit);

    res.json({
      success: true,
      data: logs,
      searchTerm,
      count: logs.length
    });
  } catch (error) {
    console.error('Error searching failure logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search failure logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
