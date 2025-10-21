// routes/contactPersonRoutes.js (Example)
import express from 'express';
import {
  createContactPerson,
  getAllContactPersons,
  getContactPersonById,
  updateContactPerson,
  deleteContactPerson
} from '../controllers/ContactPerson.js';
// import { protect, authorize } from '../middleware/authMiddleware.js'; // Your auth middleware
import { protect, roleCheck } from '../middleware/authMiddleware.js';
const router = express.Router();

// Optionally apply auth middleware to all routes or specific ones
// router.use(protect);

router.route('/')
  .post(protect, roleCheck(["admin", "manager", "sales"]),createContactPerson) 
  .get(getAllContactPersons);

router.route('/:id')
  .get(getContactPersonById)
  .put(updateContactPerson)
  .delete(deleteContactPerson);

export default router;