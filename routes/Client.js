// routes/clientRoutes.js
import express from 'express';
import {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient,
    addNote,
    addFollowUp,
    getTotalClients,
    getProjectsByClientId,
    getContectPersonByClientId,
    getTotalContactPerson,
    getContactsLast7Days,
    getSubscriptionByClientId,
    getExpenseByClientId,
    getInvoiceByClientId,
     setupClientLogin,
  clientLogin,
  clientForgotPassword,
  clientResetPassword,

  addClientFiles,
  listClientFiles,
  deleteClientFile,
  addReminder,
  getReminders,
  completeReminder,
  deleteReminder,
  addServiceToClient,
  updateClientService,
  deleteClientService
} from '../controllers/Client.js'; // Adjust path if your controller is named differently or in another directory

import { protect, roleCheck } from '../middleware/authMiddleware.js'; // Adjust path to your auth middleware
import upload from '../middleware/multer.js';

const router = express.Router();

// --- Main Client Management Routes ---
// These routes are typically accessed by Admin, Manager, and Sales roles.
// Permissions might vary (e.g., Sales can only create/view/update their assigned clients).

// POST /api/clients - Create a new client
// Roles: Admin, Sales, Manager
router.post('/', protect, roleCheck(['admin', 'sales', 'manager']), createClient);

router.get("/:clientId/projects", protect, getProjectsByClientId);
router.get("/:clientId/contactpersons", protect, getContectPersonByClientId);
router.get("/:clientId/subscriptions", protect, getSubscriptionByClientId);
router.get("/:clientId/expenses", protect, getExpenseByClientId);
router.get("/:clientId/invoices", protect, getInvoiceByClientId);

router.post("/:id/services",  protect, addServiceToClient);
router.put("/:id/services/:serviceId",  protect, updateClientService);
router.delete("/:id/services/:serviceId",  protect, deleteClientService);
// GET /api/clients - Get all clients (or filtered by role in controller)
// Roles: Admin, Manager (can see all); Sales (can see assigned only)
router.get('/all', protect, roleCheck(['admin', 'sales', 'manager']), getAllClients);

// GET /api/clients/:id - Get a single client by ID
// Roles: Admin, Manager (any client); Sales (only assigned client)
router.get('/single/:id', protect, getClientById);

// PUT /api/clients/:id - Update client details by ID
// Roles: Admin, Manager (any client); Sales (only assigned client)
router.put('/:id', protect, roleCheck(['admin', 'sales', 'manager']), updateClient);

// DELETE /api/clients/:id - Delete a client by ID
// Roles: Admin only (highly sensitive operation)
router.delete('/:id', protect, roleCheck(['admin']), deleteClient);

router.post("/:id/note", protect, roleCheck(['admin', 'manager', 'sales', 'support', 'team']), addNote);
router.post("/:id/followup", protect, roleCheck(['admin', 'manager', 'sales', 'support', 'team']), addFollowUp);
router.get("/total", protect, getTotalClients);

router.get("/totalcontactperson", protect, getTotalContactPerson );

router.get("/loggedInLast7Days", protect, getContactsLast7Days);
router.post('/setup-login', setupClientLogin);

// ✅ Client login
router.post('/login', clientLogin);

// ✅ Client forgot password
router.post('/forgot-password', clientForgotPassword);

// ✅ Client reset password
router.post('/reset-password/:token', clientResetPassword);


router.get("/:id/files", protect, roleCheck(["admin", "sales", "manager"]), listClientFiles);
router.post("/:id/files", protect, roleCheck(["admin", "sales", "manager"]), upload.array("files", 10), addClientFiles);
router.delete("/:id/files/:fileId", protect, roleCheck(["admin", "sales", "manager"]), deleteClientFile);
router.post("/:id/reminders", protect, roleCheck(["admin", "sales", "manager"]), addReminder);
router.get("/:id/reminders", protect, roleCheck(["admin", "sales", "manager"]), getReminders);
router.patch("/:id/reminders/:reminderId/complete",protect, roleCheck(["admin", "sales", "manager"]), completeReminder);
router.delete("/:id/reminders/:reminderId", protect, roleCheck(["admin", "sales", "manager"]), deleteReminder);
export default router;