// routes/categoryRoutes.js
import express from 'express';
import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/Category.js'; // Remember .js extension!

// Assuming your auth middleware is also ESM
import { protect,roleCheck } from '../middleware/authMiddleware.js'; // Adjust path and name as needed

const router = express.Router();

router.route('/')
    .get(getAllCategories)
    .post(protect, roleCheck(["admin", "sales", "support"]), createCategory);

router.route('/:id')
    .get(getCategoryById)
    .put(protect, roleCheck(["admin", "sales", "support"]), updateCategory)
    .delete(protect, roleCheck(["admin"]), deleteCategory);

export default router; // Export the router itself