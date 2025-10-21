// routes/ticketRoutes.js
import express from 'express';
import {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    addCommentToTicket,
    deleteTicket,
    uploadTicketAttachments, // Import multer middleware
    authorizeAgent // Import authorizeAgent middleware
} from '../controllers/ticketController.js';


const router = express.Router();

// @route   POST /api/tickets
// @desc    Create a new ticket with attachments
// @access  Private
router.post('/',  uploadTicketAttachments, createTicket);

// @route   GET /api/tickets
// @desc    Get all tickets (with filtering)
// @access  Private (agents/admin)
router.get('/',  getTickets);

// @route   GET /api/tickets/:id
// @desc    Get a single ticket by ID
// @access  Private (agents/admin or client who owns it)
router.get('/:id', getTicketById);

// @route   PUT /api/tickets/:id
// @desc    Update a ticket
// @access  Private (agents/admin)
router.put('/:id',   updateTicket);

// @route   POST /api/tickets/:id/comments
// @desc    Add a comment to a ticket
// @access  Private (agents/admin or client who owns it)
router.post('/:id/comments',  addCommentToTicket);

// @route   DELETE /api/tickets/:id
// @desc    Delete a ticket
// @access  Private (admin only)
router.delete('/:id',   deleteTicket);

export default router;