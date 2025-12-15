import { Router, Request, Response } from 'express';
import { LeadStageService, LeadStage, PREDEFINED_LEAD_STAGES } from '../services/leadStageService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/lead-stages
 * @desc    Get all lead stages for the authenticated user (sorted by order)
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
        // Include predefined stages for reference (e.g., reset to defaults)
        predefinedStages: PREDEFINED_LEAD_STAGES,
      },
    });
  } catch (error) {
    logger.error('Error getting lead stages:', error);
    return res.status(500).json({ error: 'Failed to get lead stages' });
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
 * @route   POST /api/lead-stages
 * @desc    Add a new lead stage
 * @access  Private
 * @body    { name: string, color?: string }
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<any> => {
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

    const updatedStages = await LeadStageService.addStage(userId, name.trim(), color);
    
    return res.status(201).json({
      success: true,
      message: `Stage "${name}" created successfully`,
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error adding stage:', error);
    
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message?.includes('Invalid color format')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to add stage' });
  }
});

/**
 * @route   PUT /api/lead-stages/reorder
 * @desc    Reorder all stages (for drag-and-drop)
 * @access  Private
 * @body    { orderedStageNames: string[] }
 * NOTE: This route MUST be defined BEFORE /:name to avoid route conflicts
 */
router.put('/reorder', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderedStageNames } = req.body;

    if (!Array.isArray(orderedStageNames) || orderedStageNames.length === 0) {
      return res.status(400).json({ error: 'orderedStageNames must be a non-empty array' });
    }

    const updatedStages = await LeadStageService.reorderStages(userId, orderedStageNames);
    
    return res.json({
      success: true,
      message: 'Stages reordered successfully',
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error reordering stages:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('All stages must be included')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to reorder stages' });
  }
});

/**
 * @route   PUT /api/lead-stages/replace-all
 * @desc    Replace all stages at once (full update from customizer popup)
 * @access  Private
 * @body    { stages: LeadStage[] }
 * NOTE: This route MUST be defined BEFORE /:name to avoid route conflicts
 */
router.put('/replace-all', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { stages } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ error: 'stages must be an array' });
    }

    // Validate each stage has required fields
    for (const stage of stages) {
      if (!stage.name || typeof stage.name !== 'string' || stage.name.trim().length === 0) {
        return res.status(400).json({ error: 'Each stage must have a valid name' });
      }
      if (stage.name.trim().length > 100) {
        return res.status(400).json({ error: 'Stage names must be 100 characters or less' });
      }
      if (!stage.color || !/^#[0-9A-Fa-f]{6}$/.test(stage.color)) {
        return res.status(400).json({ error: `Invalid color format for stage "${stage.name}". Use hex format like #FF5733` });
      }
    }

    const updatedStages = await LeadStageService.replaceAllStages(userId, stages);
    
    return res.json({
      success: true,
      message: 'All stages updated successfully',
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error replacing all stages:', error);
    
    if (error.message?.includes('Duplicate') || error.message?.includes('cannot be empty') || error.message?.includes('Invalid color')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to update stages' });
  }
});

/**
 * @route   POST /api/lead-stages/reset-to-defaults
 * @desc    Reset stages to predefined defaults
 * @access  Private
 * NOTE: This route MUST be defined BEFORE /:name to avoid route conflicts
 */
router.post('/reset-to-defaults', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updatedStages = await LeadStageService.replaceAllStages(userId, PREDEFINED_LEAD_STAGES);
    
    return res.json({
      success: true,
      message: 'Stages reset to defaults successfully',
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error resetting stages to defaults:', error);
    return res.status(500).json({ error: 'Failed to reset stages to defaults' });
  }
});

/**
 * @route   POST /api/lead-stages/bulk-update
 * @desc    Bulk update lead stage for multiple contacts
 * @access  Private
 * @body    { contactIds: string[], stage: string | null }
 * NOTE: This route MUST be defined BEFORE /:name to avoid route conflicts
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

/**
 * @route   PUT /api/lead-stages/:name
 * @desc    Update a lead stage (rename and/or change color)
 * @access  Private
 * @body    { newName?: string, color?: string }
 * NOTE: This wildcard route MUST be defined AFTER all specific PUT routes (/reorder, /replace-all)
 */
router.put('/:name', authenticateToken, async (req: Request, res: Response): Promise<any> => {
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

    const updatedStages = await LeadStageService.updateStage(
      userId,
      oldName,
      newName?.trim(),
      color
    );
    
    return res.json({
      success: true,
      message: `Stage updated successfully`,
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error updating stage:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message?.includes('Invalid color format')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to update stage' });
  }
});

/**
 * @route   DELETE /api/lead-stages/:name
 * @desc    Delete a lead stage (sets contacts to NULL)
 * @access  Private
 * NOTE: This wildcard route MUST be defined AFTER all specific DELETE routes
 */
router.delete('/:name', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stageName = decodeURIComponent(req.params.name);

    const updatedStages = await LeadStageService.deleteStage(userId, stageName);
    
    return res.json({
      success: true,
      message: `Stage "${stageName}" deleted. Contacts with this stage have been unassigned.`,
      data: updatedStages,
    });
  } catch (error: any) {
    logger.error('Error deleting stage:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to delete stage' });
  }
});

export default router;
