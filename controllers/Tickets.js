// controllers/ticketController.js
import Ticket from '../models/Ticket.js';
import User from '../models/User.js'; // Assuming your User model for agents
import Client from '../models/Client.js'; // Assuming your Client model
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for file uploads (ensure 'uploads/tickets' directory exists)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'tickets'); // Adjust based on your project structure
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
export const uploadTicketAttachments = multer({ storage: storage }).array('attachments', 5); // Export multer instance


// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (accessible by clients or agents)
export const createTicket = async (req, res) => {
    try {
        const { subject, description, category, priority, client } = req.body; // client ID will be sent from frontend

        let clientId = client; // Assuming client ID is always sent in body for this example

        if (!subject || !description || !clientId) {
            return res.status(400).json({ message: 'Subject, description, and client are required.' });
        }

        const newTicket = new Ticket({
            subject,
            description,
            category,
            priority,
            client: clientId,
            comments: [{ user: req.user.id, comment: 'Ticket created.' }] // req.user.id from auth middleware
        });

        if (req.files && req.files.length > 0) {
            newTicket.attachments = req.files.map(file => ({
                fileName: file.originalname,
                filePath: `/uploads/tickets/${file.filename}`, // Store URL accessible from frontend
                fileType: file.mimetype,
                fileSize: file.size,
            }));
        }

        const ticket = await newTicket.save();
        res.status(201).json(ticket);
    } catch (err) {
        console.error('Error creating ticket:', err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all tickets (with optional filtering)
// @route   GET /api/tickets
// @access  Private (agents/admin)
export const getTickets = async (req, res) => {
    try {
        const { status, assignedTo, client, category, priority } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (client) filter.client = client;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;

        const tickets = await Ticket.find(filter)
            .populate('client', 'name companyName email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        res.json(tickets);
    } catch (err) {
        console.error('Error getting tickets:', err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get a single ticket by ID
// @route   GET /api/tickets/:id
// @access  Private (agents/admin or the client who owns the ticket)
export const getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('client', 'name companyName email phone')
            .populate('assignedTo', 'name email')
            .populate('comments.user', 'name email');

        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket not found' });
        }

        // Authorization check: only agents/admin OR the owning client can view
        if (req.user.role !== 'admin' && req.user.role !== 'agent' && ticket.client.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to view this ticket' });
        }

        res.json(ticket);
    } catch (err) {
        console.error('Error getting ticket by ID:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Ticket not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Update a ticket (status, priority, assignedTo etc.)
// @route   PUT /api/tickets/:id
// @access  Private (agents/admin)
export const updateTicket = async (req, res) => {
    try {
        const { status, priority, assignedTo, description, category, subject } = req.body;
        const ticketFields = {};

        if (status) ticketFields.status = status;
        if (priority) ticketFields.priority = priority;
        if (assignedTo !== undefined) ticketFields.assignedTo = assignedTo === '' ? null : assignedTo; // Handle unassign
        if (description) ticketFields.description = description;
        if (category) ticketFields.category = category;
        if (subject) ticketFields.subject = subject;

        let ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket not found' });
        }

        // Only add comment if actual fields are updated (not just assigning/unassigning without other changes)
        const changes = Object.keys(ticketFields).filter(key => String(ticket[key]) !== String(ticketFields[key]));

        if (changes.length > 0) {
             const changeSummary = changes.map(key => `${key} changed from "${ticket[key]}" to "${ticketFields[key]}"`).join(', ');
             ticket.comments.push({
                 user: req.user.id,
                 comment: `Ticket updated: ${changeSummary}`
             });
        }


        ticket = await Ticket.findOneAndUpdate(
            { _id: req.params.id },
            { $set: ticketFields },
            { new: true }
        ).populate('client', 'name companyName email').populate('assignedTo', 'name email');

        res.json(ticket);
    } catch (err) {
        console.error('Error updating ticket:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Ticket not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Add a comment to a ticket
// @route   POST /api/tickets/:id/comments
// @access  Private (agents/admin or the client who owns the ticket)
export const addCommentToTicket = async (req, res) => {
    try {
        const { comment } = req.body;
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket not found' });
        }

        // Authorization check: only agents/admin OR the owning client can comment
        if (req.user.role !== 'admin' && req.user.role !== 'agent' && ticket.client.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to comment on this ticket' });
        }

        if (!comment || comment.trim() === '') {
            return res.status(400).json({ msg: 'Comment text is required' });
        }

        const newComment = {
            user: req.user.id,
            comment,
        };

        ticket.comments.push(newComment);
        await ticket.save();

        // Populate the user of the new comment before sending back
        const populatedComment = await Ticket.populate(newComment, { path: 'user', select: 'name email' });


        res.status(201).json(populatedComment); // Return the newly added comment
    } catch (err) {
        console.error('Error adding comment:', err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a ticket
// @route   DELETE /api/tickets/:id
// @access  Private (admin only)
export const deleteTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket not found' });
        }

        // Optional: Remove associated attachments from file system
        if (ticket.attachments && ticket.attachments.length > 0) {
            ticket.attachments.forEach(attachment => {
                // Ensure the path is correct relative to where your server runs
                const filePathToDelete = path.join(__dirname, '..', 'uploads', 'tickets', path.basename(attachment.filePath));
                if (fs.existsSync(filePathToDelete)) {
                    fs.unlink(filePathToDelete, (err) => { // Use fs.unlink for async deletion
                        if (err) console.error(`Error deleting file ${filePathToDelete}:`, err);
                    });
                }
            });
        }

        await Ticket.deleteOne({ _id: req.params.id });

        res.json({ msg: 'Ticket removed' });
    } catch (err) {
        console.error('Error deleting ticket:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Ticket not found' });
        }
        res.status(500).send('Server Error');
    }
};

// Middleware to check if user is admin/agent (moved from routes, can be a shared middleware or specific to controller)
export const authorizeAgent = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'agent')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Agents only.' });
    }
};