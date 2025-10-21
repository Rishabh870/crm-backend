import express from 'express';
import upload from '../middleware/multer.js';
import {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService
} from '../controllers/Service.js';

const router = express.Router();

// Routes
router.post('/add', upload.single('image'), createService);
router.get('/', getAllServices);
router.get('/:id', getServiceById);
router.put('/update/:id', upload.single('image'), updateService);
router.delete('/:id', deleteService);

export default router;
