import express from 'express';
import { getActivitiesByLead, getActivitiesByClient,getActivitiesByProject } from '../controllers/Activity.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/lead/:leadId', protect, getActivitiesByLead);
router.get('/client/:clientId', protect, getActivitiesByClient);
router.get('/project/:projectId', protect, getActivitiesByProject);
export default router;