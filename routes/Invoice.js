import express from 'express';
import {
    createInvoice,
    getAllInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice
} from '../controllers/Invoice.js'; // Adjust the path if your controller file is named differently (e.g., invoiceController.js)


import { protect, roleCheck } from "../middleware/authMiddleware.js";



const router = express.Router();


router.post('/', protect, roleCheck('admin', 'manager'), createInvoice);

// GET /api/invoices - Get all invoices
// 'admin', 'manager', 'sales', 'support', 'team' can view all invoices
// Clients might view only their own invoices (requires additional logic in controller/middleware)
router.get('/', protect, roleCheck('admin', 'manager', 'sales', 'support', 'team', 'client'), getAllInvoices);

// GET /api/invoices/:id - Get a single invoice by ID
// 'admin', 'manager', 'sales', 'support', 'team' can view any invoice
// Clients should only view their own invoices (requires additional logic in controller/middleware to check invoice.client against req.user.clientId)
router.get('/:id', protect, roleCheck('admin', 'manager', 'sales', 'support', 'team', 'client'), getInvoiceById);

// PUT /api/invoices/:id - Update an invoice
// Only 'admin' and 'manager' roles can update invoices
router.put('/:id', protect, roleCheck('admin', 'manager'), updateInvoice);

// DELETE /api/invoices/:id - Delete an invoice
// Only 'admin' can delete invoices
router.delete('/:id', protect, roleCheck('admin'), deleteInvoice);


export default router;

