import express from 'express';
import {
  createEvent,
  getUserEvents,
  deleteEvent,
  updateEvent,
  getTodayEventsCount
} from '../controllers/Event.js';
import { protect,roleCheck } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add', createEvent);
router.get('/user/:userId', getUserEvents);
router.delete('/:eventId', deleteEvent);
router.put('/:eventId', updateEvent);
router.get('/today-count', protect, roleCheck(['admin', 'manager', 'sales', 'support', 'team']), getTodayEventsCount); // New route

export default router;
