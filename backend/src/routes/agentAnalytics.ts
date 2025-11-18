import { Router } from 'express';
import { agentAnalyticsController } from '../controllers/agentAnalyticsController';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateAgentOwnership, AgentOwnershipRequest } from '../middleware/agentOwnership';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Agent performance overview
router.get('/:agentId/overview', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentOverview(req as AgentOwnershipRequest, res));

// Agent performance metrics for specific time periods
router.get('/:agentId/metrics', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentMetrics(req as AgentOwnershipRequest, res));

// Agent call outcomes and detailed analytics




// Agent comparison with other agents
router.get('/:agentId/comparison', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentComparison(req as AgentOwnershipRequest, res));


// Real-time agent statistics
router.get('/:agentId/realtime', validateAgentOwnership, (req, res) => agentAnalyticsController.getRealtimeStats(req as AgentOwnershipRequest, res));

export default router;