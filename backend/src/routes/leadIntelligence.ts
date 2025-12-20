import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest, requireLeadEditAccess } from '../middleware/auth';
import { LeadIntelligenceController } from '../controllers/leadIntelligenceController';
import { Response } from 'express';

const router = Router();
const leadIntelligenceController = new LeadIntelligenceController();

// Get grouped leads for intelligence view
router.get('/', authenticateToken, (req, res) => {
  return leadIntelligenceController.getLeadIntelligence(req as AuthenticatedRequest, res);
});

// Get team members for assignment dropdown
router.get('/team-members', authenticateToken, (req, res) => {
  return leadIntelligenceController.getTeamMembersForAssignment(req as AuthenticatedRequest, res);
});

// Get detailed timeline for a specific lead group
router.get('/:groupId/timeline', authenticateToken, (req, res) => {
  return leadIntelligenceController.getLeadTimeline(req as AuthenticatedRequest, res);
});

// Get lead intelligence events (manual edits/assignments for timeline)
router.get('/:groupId/events', authenticateToken, (req, res) => {
  return leadIntelligenceController.getLeadEvents(req as AuthenticatedRequest, res);
});

// Edit lead intelligence fields (requires edit access - owner, manager, or agent)
router.patch('/:groupId', authenticateToken, requireLeadEditAccess, (req, res) => {
  return leadIntelligenceController.editLeadIntelligence(req as AuthenticatedRequest, res);
});

export default router;