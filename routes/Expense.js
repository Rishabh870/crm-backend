import express from "express"
import {
    createExpense,
    getAllExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense
} from "../controllers/Expense.js"
import { protect, roleCheck } from "../middleware/authMiddleware.js"

const router = express.Router()

router.post('/', protect, roleCheck(['admin']), createExpense)

router.get('/', protect, roleCheck('admin', 'manager',), getAllExpenses);

// Get Single Expense by ID: Admins, Managers, and Team members can view a specific expense
router.get('/:id', protect, roleCheck('admin', 'manager',), getExpenseById);

// Update Expense: Only Admins and Managers can update expenses
router.put('/:id', protect, roleCheck('admin', 'manager'), updateExpense);

// Delete Expense: Only Admins can delete expenses
router.delete('/:id', protect, roleCheck('admin'), deleteExpense);

export default router