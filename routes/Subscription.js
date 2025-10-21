import express from 'express';
import {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updatedSubscription,
  deleteSubscription,
  addNote
} from '../controllers/Subscription.js';

import { protect,roleCheck } from '../middleware/authMiddleware.js'; // Adjust if you use auth

const router = express.Router();

// Create new subscription
router.post('/', protect,roleCheck(["admin", "manager", "sales"]), createSubscription);

// Get all subscriptions (with optional filters)
router.get('/', protect,roleCheck(["admin", "manager", "sales"]), getSubscriptions);

// Get single subscription by ID
router.get('/:id', protect,roleCheck(["admin", "manager", "sales"]), getSubscriptionById);

// Update subscription
router.put('/:id', protect,roleCheck(["admin", "manager", "sales"]), updatedSubscription);

// Delete subscription
router.delete('/:id', protect,roleCheck(["admin", "manager", "sales"]), deleteSubscription);
router.post("/:id/note", protect,roleCheck(['admin', 'manager', 'sales', 'support', 'team']), addNote);

export default router;
