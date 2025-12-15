import { Router, Request, Response } from 'express';
import { LeadStageService, DEFAULT_LEAD_STAGES } from '../services/leadStageService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/lead-stages
 * @desc    Get all lead stages (default + custom) for the authenticated user
 * @access  Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stages = await LeadStageService.getAllStages(userId);
    
    return res.json({
      success: true,
      data: {
        stages,
        defaults: DEFAULT_LEAD_STAGES,
      },
    });
  } catch (error) {
    logger.error('Error getting lead stages:', error);
    return res.status(500).json({ error: 'Failed to get lead stages' });
  }
});

/**
 * @route   GET /api/lead-stages/custom
 * @desc    Get only custom lead stages for the authenticated user
 * @access  Private
 */
router.get('/custom', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customStages = await LeadStageService.getCustomStages(userId);
    
    return res.json({
      success: true,
      data: customStages,
    });
  } catch (error) {
    logger.error('Error getting custom lead stages:', error);
    return res.status(500).json({ error: 'Failed to get custom lead stages' });
  }
});

/**
 * @route   GET /api/lead-stages/stats
 * @desc    Get count of contacts in each stage
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await LeadStageService.getStageStats(userId);
    
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting stage stats:', error);
    return res.status(500).json({ error: 'Failed to get stage stats' });
  }
});

/**
 * @route   POST /api/lead-stages/custom
 * @desc    Add a new custom lead stage
 * @access  Private
 * @body    { name: string, color?: string }
 */
router.post('/custom', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, color } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Stage name is required' });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Stage name must be 100 characters or less' });
    }

    const updatedStages = await LeadStageService.addCustomStage(userId, name.trim(), color);
    
    return res.status(201).json({
      success: true,
      message: `Custom stage "${name}" created successfully`,
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error adding custom stage:', error);
    
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message?.includes('Invalid color format')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to add custom stage' });
  }
});

/**
 * @route   PUT /api/lead-stages/custom/:name
 * @desc    Update a custom lead stage (rename and/or change color)
 * @access  Private
 * @body    { newName?: string, color?: string }
 */
router.put('/custom/:name', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const oldName = decodeURIComponent(req.params.name);
    const { newName, color } = req.body;

    if (!newName && !color) {
      return res.status(400).json({ error: 'Either newName or color must be provided' });
    }

    if (newName && newName.trim().length > 100) {
      return res.status(400).json({ error: 'Stage name must be 100 characters or less' });
    }

    const updatedStages = await LeadStageService.updateCustomStage(
      userId,
      oldName,
      newName?.trim(),
      color
    );
    
    return res.json({
      success: true,
      message: `Custom stage updated successfully`,
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error updating custom stage:', error);
    
    if (error.message?.includes('Cannot edit default stages')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to update custom stage' });
  }
});

/**
 * @route   DELETE /api/lead-stages/custom/:name
 * @desc    Delete a custom lead stage (sets contacts to NULL)
 * @access  Private
 */
router.delete('/custom/:name', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stageName = decodeURIComponent(req.params.name);

    const updatedStages = await LeadStageService.deleteCustomStage(userId, stageName);
    
    return res.json({
      success: true,
      message: `Custom stage "${stageName}" deleted. Contacts with this stage have been unassigned.`,
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error deleting custom stage:', error);
    
    if (error.message?.includes('Cannot delete default stages')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to delete custom stage' });
  }
});

/**
 * @route   POST /api/lead-stages/bulk-update
 * @desc    Bulk update lead stage for multiple contacts
 * @access  Private
 * @body    { contactIds: string[], stage: string | null }
 */
router.post('/bulk-update', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contactIds, stage } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds must be a non-empty array' });
    }

    if (contactIds.length > 1000) {
      return res.status(400).json({ error: 'Cannot update more than 1000 contacts at once' });
    }

    const updatedCount = await LeadStageService.bulkUpdateLeadStage(
      userId,
      contactIds,
      stage || null
    );
    
    return res.json({
      success: true,
      message: `Updated ${updatedCount} contacts to stage "${stage || 'Unassigned'}"`,
      data: { updatedCount },
    });
  } catch (error: any) {
    logger.error('Error bulk updating lead stage:', error);
    
    if (error.message?.includes('does not exist')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to bulk update lead stage' });
  }
});

export default router;
