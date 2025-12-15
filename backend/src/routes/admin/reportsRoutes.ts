import { Router } from 'express';
import { ReportController } from '../../controllers/reportController';
import { requireAdmin, logAdminAction } from '../../middleware/adminAuth';

const router = Router();

router.post(
  '/generate',
  requireAdmin,
  logAdminAction('GENERATE_REPORT', 'system'),
  ReportController.generateReport
);

export default router;
