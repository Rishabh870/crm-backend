import Client from '../models/Client.js';
import fs from 'fs/promises';
import path from 'path';
import Activity from '../models/Activity.js';
import ContactPerson from '../models/ContactPerson.js';
import Subscription from '../models/Subscription.js';
import Expense from '../models/Expense.js';
import Invoice from '../models/Invoice.js';
import Task from '../models/Task.js';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import Project from '../models/Projects.js';
import { getTransporter } from '../config/email.config.js';
import mongoose from "mongoose";
// Helper function to generate the next sequential custom client ID
// This function finds the highest existing customClientId and increments it.
// Note: In a highly concurrent environment, a more robust solution might involve
// using a separate sequence collection with atomic updates or a database-level trigger
// to prevent potential race conditions, although Mongoose's unique index
// will prevent duplicates from being saved.
const generateNextCustomClientId = async () => {
    try {
        // Find the client with the highest customClientId
        const latestClient = await Client.findOne({ customClientId: { $ne: null } })
                                       .sort({ customClientId: -1 }) // Sort in descending order to get the latest
                                       .select('customClientId') // Select only the customClientId field
                                       .lean(); // Return a plain JavaScript object for performance

        let nextNumber = 1;
        if (latestClient && latestClient.customClientId) {
            // Extract the numeric part from the last customClientId (e.g., "CUST-001" -> 1)
            const lastId = latestClient.customClientId;
            const lastNumberMatch = lastId.match(/\d+$/); // Regex to find trailing digits

            if (lastNumberMatch) {
                nextNumber = parseInt(lastNumberMatch[0], 10) + 1;
            }
        }
        // Format the next number with leading zeros (e.g., 1 -> "001", 12 -> "012")
        return `CUST-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
        console.error("Error generating custom client ID:", error);
        // Fallback or throw error if ID generation fails
        throw new Error("Failed to generate custom client ID.");
    }
};


export const createClient = async (req, res) => {
    try {
        const {
            name,
            companyName,
            email,
            phone,
            address,
            createdBy,
            status,
            accountManager,
            clientType,
            Notes,
            gstNumber,
            clientLevel,
            website
        } = req.body;

        // Generate a unique custom client ID before creating the client
        const customClientId = await generateNextCustomClientId();

        const clientData = {
            customClientId, // Assign the newly generated custom ID
            name,
            email,
            phone,
            address,
            companyName,
            accountManager,
            clientType,
            clientLevel,
            createdBy,
            status,
            gstNumber,
            website
        };
        if (Array.isArray(Notes) && Notes.length > 0) {
            clientData.Notes = Notes;
        } else {
            clientData.Notes = [];
        }
if (Array.isArray(services) && services.length > 0) {
      clientData.services = services.map((s) => ({
        service: s.service,
        quantity: s.quantity || 1,
        unitPrice: s.unitPrice,
        discount: s.discount || 0,
        paid: s.paid || 0,
        pending: s.pending || 0,
        startDate: s.startDate || new Date(),
        expiryDate: s.expiryDate || null,
      }));
    }
        const client = await Client.create(clientData);

        await Activity.create({
            type: 'client_created',
            description: 'Client created',
            user: client.createdBy,
            client: client._id,
        });

        res.status(201).json({ message: "Client created", client });
    } catch (err) {
        console.error("❌ Error creating client:", err);
        // Handle specific error for duplicate customClientId if it occurs (e.g., race condition)
        if (err.code === 11000 && err.keyPattern && err.keyPattern.customClientId) {
            return res.status(409).json({ message: "Failed to create client: A similar custom ID was just generated. Please try again." });
        }
        res.status(500).json({ message: err.message });
    }
};

export const getAllClients = async (req, res) => {


    try {
        const clients = await Client.find()
            .populate('accountManager', 'name email') 
            .sort({ createdAt: -1 }); 

        res.status(200).json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Server error fetching clients.', error: error.message });
    }
};

export const getClientById = async (req, res) => {



    try {
        const client = await Client.findById(req.params.id)
            .populate('accountManager', 'name email')
            .populate("createdBy", "name email")
            
        if (!client) {
            return res.status(404).json({ message: 'Client not found.' });
        }
        res.status(200).json(client);
    } catch (error) {
        console.error('Error fetching client by ID:', error);
        res.status(500).json({ message: 'Server error fetching client.', error: error.message });
    }
};

export const updateClient = async (req, res) => {
    try{
        const { id } = req.params;
        const updateData = req.body;
 if (Array.isArray(updateData.services)) {
      updateData.services = updateData.services.map((s) => ({
        service: s.service,
        quantity: s.quantity || 1,
        unitPrice: s.unitPrice,
        discount: s.discount || 0,
        paid: s.paid || 0,
        pending: s.pending || 0,
        startDate: s.startDate || new Date(),
        expiryDate: s.expiryDate || null,
      }));
    }
        const clientBeforeUpdate = await Client.findById(id);
        if (!clientBeforeUpdate) {
            return res.status(404).json({ message: "Client not found" });
        }

        const updatedClient = await Client.findByIdAndUpdate(id, updateData, { new: true });

        const changes = [];
        for (const key in updateData) {
            if (
                updateData.hasOwnProperty(key) &&
                String(clientBeforeUpdate[key]) !== String(updateData[key])
            ) {
                changes.push(
                    `'${key}' from '${clientBeforeUpdate[key]}' to '${updateData[key]}'`
                );
            }
        }

        if (changes.length > 0) {
            await Activity.create({
                type: "client_updated",
                description: `Client updated: ${changes.join(", ")}`,
                user: req.user?.id,
                client: updatedClient._id,
            });
        }

        res.status(200).json(updatedClient);
    }catch(error){
         res.status(500).json({ error: error.message });
    }
};


export const deleteClient = async (req, res) => {
    const { id } = req.params; // Client ID
    const { role } = req.user; // User role for authorization

    // Explicit check for Admin role here, but typically handled by middleware
    if (role !== 'Admin') {
        return res.status(403).json({ message: 'Not authorized to delete clients.' });
    }

    try {
        const client = await Client.findById(id);

        if (!client) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        await client.deleteOne(); // Mongoose method to remove the document

        await Activity.create({
            type: 'client_deleted',
            description: 'Client deleted',
            user: req.user?.id,
            client: client._id,
        });

        res.status(200).json({ message: 'Client deleted successfully.' });

    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Server error deleting client.', error: error.message });
    }
};

export const addNote = async (req, res) => {
    try {
        const { message } = req.body;
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: "Client not found" });

        client.Notes.push({ message, date: new Date(), addedBy: req.user._id });
        await client.save();

        // Create an activity for the new note
        await Activity.create({
            type: 'note_added',
            description: `Note added: "${message}"`,
            user: req.user._id, // The user who added the note
            client: client._id, // Link to the client
        });

        res.status(200).json({ message: "Note added successfully", client });
    } catch (err) {
        console.error("Error adding note:", err);
        res.status(500).json({ message: err.message });
    }
};

export const addFollowUp = async (req, res) => {
    try {
        const { message } = req.body;
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: "Client not found" });

        client.followUps.push({ message, date: new Date(), addedBy: req.user._id });
        await client.save();

        // Create an activity for the new follow-up
        await Activity.create({
            type: 'followup_added',
            description: `Follow-up added: "${message}"`,
            user: req.user._id, // The user who added the follow-up
            client: client._id, // Link to the client
        });

        res.status(200).json({ message: "Follow-up added successfully", client });
    } catch (err) {
        console.error("Error adding follow-up:", err);
        res.status(500).json({ message: err.message });
    }
};


// Get total clients
export const getTotalClients = async (req, res) => {
    try {
        const totalClients = await Client.countDocuments();
        res.status(200).json({ totalClients });
    } catch (error) {
        res.status(500).json({ message: "Failed to count clients", error: error.message });
    }
};

export const getTotalContactPerson = async (req, res) => {
    try {
        const totalContactperson = await ContactPerson.countDocuments();
        res.status(200).json({ totalContactperson });
    } catch (error) {
        res.status(500).json({ message: "Failed to count contactperson", error: error.message });
    }
};

// Get contacts from last 7 days
export const getContactsLast7Days = async (req, res) => {
    try {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const contactsLast7Days = await Client.countDocuments({
            "contactPerson.name": { $ne: null },
            createdAt: { $gte: lastWeek },
        });

        res.status(200).json({ contactsLast7Days });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch contacts in last 7 days", error: error.message });
    }
};
export const getProjectsByClientId = async (req, res) => {
    const { clientId } = req.params;

    try {
        const projects = await Project.find({
            client: clientId,
            projectType: "Client" // ✅ Only fetch client-related projects
        })
            .populate("createdBy", "name email")
            .populate("assignedTo", "name email");

        res.status(200).json(projects);
    } catch (error) {
        console.error("Error fetching projects for client:", error);
        res.status(500).json({ message: "Projects fetch karne mein error hua." });
    }
};
export const getContectPersonByClientId = async (req, res) => {
    const { clientId } = req.params;

    try {
        const projects = await ContactPerson.find({ linkedClient: clientId })
            .populate("createdBy", "name email")
            .populate("linkedClient", "clientType companyName name email");

        res.status(200).json(projects);
    } catch (error) {
        console.error("Error fetching contect person for client:", error);
        res.status(500).json({ message: "Contect Person fetch karne mein error hua." });
    }
};
export const getSubscriptionByClientId = async (req, res) => {
    const { clientId } = req.params;

    try {
        const subscriptions = await Subscription.find({ client: clientId })
            .populate("createdBy", "name email")
            .populate("client", "name email");

        res.status(200).json(subscriptions);
    } catch (error) {
        console.error("Error fetching subscriptions for client:", error);
        res.status(500).json({ message: "subscriptions fetch karne mein error hua." });
    }
};

export const getExpenseByClientId = async (req, res) => {
    const { clientId } = req.params;

    try {
        const subscriptions = await Expense.find({ client: clientId })
            .populate("createdBy", "name email")
            .populate("client", "name email")
            .populate("project", "title");
        res.status(200).json(subscriptions);
    } catch (error) {
        console.error("Error fetching subscriptions for client:", error);
        res.status(500).json({ message: "subscriptions fetch karne mein error hua." });
    }
};
export const getInvoiceByClientId = async (req, res) => {
    const { clientId } = req.params;

    try {
        const subscriptions = await Invoice.find({ client: clientId })
            .populate("createdBy", "name email")
            .populate("client", "name email")
            .populate("project", "title");
        res.status(200).json(subscriptions);
    } catch (error) {
        console.error("Error fetching subscriptions for client:", error);
        res.status(500).json({ message: "subscriptions fetch karne mein error hua." });
    }
};

export const setupClientLogin = async (req, res) => {
    const { clientId, email, password } = req.body;
    try {
        const client = await Client.findById(clientId);
        if (!client) return res.status(404).json({ message: "Client not found" });

        const hashedPassword = await bcrypt.hash(password, 10);
        client.login = { email, password: hashedPassword, isLoginEnabled: true };
        await client.save();

        res.json({ message: "Client login setup successful" });
    } catch (err) {
        res.status(500).json({ message: "Error setting login", error: err.message });
    }
};

export const clientLogin = async (req, res) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const { email, password } = req.body;
    try {
        const client = await Client.findOne({ "login.email": email });
        if (!client || !client.login?.isLoginEnabled)
            return res.status(404).json({ message: "Client not found or login not enabled" });

        const isMatch = await bcrypt.compare(password, client.login.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: client._id, role: "client" }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, client });
    } catch (err) {
        res.status(500).json({ message: "Login error", error: err.message });
    }
};

export const clientForgotPassword = async (req, res) => {
    const CLIENT_URL = process.env.CLIENT_URL;
    const EMAIL_USER = process.env.EMAIL_USER;
    const email = req.body.email;

    console.log("DEBUG: clientForgotPassword initiated for email:", email); // Initial log

    if (!email) {
        console.log("DEBUG: Email is required, returning 400."); // Debug log
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        // FIX: Search by "login.email" field, not the top-level "email" field
        const client = await Client.findOne({ "login.email": email });

        if (!client) {
            console.log("DEBUG: Client not found for login email:", email, "Returning generic success message."); // Debug log
            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent to it.'
            });
        }

        // Also check if login is enabled for this client
        if (!client.login || !client.login.isLoginEnabled) {
             console.log("DEBUG: Client found but login not enabled for email:", email, "Returning generic success message."); // Debug log
             return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent to it.'
             });
        }

        console.log("DEBUG: Client found and login is enabled. Proceeding to generate token."); // Debug log

        const resetToken = crypto.randomBytes(32).toString('hex');
        client.passwordResetToken = resetToken;
        client.passwordResetExpires = Date.now() + 3600000; // 1 hour

        console.log("DEBUG: Token generated:", resetToken); // Debug log
        console.log("DEBUG: Token expiration set to:", client.passwordResetExpires); // Debug log

        console.log("DEBUG: Attempting to save client with new token."); // Debug log
        await client.save(); // <<< This is where the token and expiry are saved
        console.log("DEBUG: Client saved successfully with token."); // Debug log

        // FIX: Ensure this URL matches your frontend client reset password route (e.g., /client/reset-password/:token)
        const resetURL = `${CLIENT_URL}/reset-password/${resetToken}`;
        const transporter = getTransporter();

        const mailOptions = {
            from: EMAIL_USER,
            to: client.login.email, // Send to the login email, not the primary client email field if they differ
            subject: 'Your CRM Client Password Reset Request',
            html: `
                <p>Hello,</p>
                <p>You requested a password reset. Click below to reset your password:</p>
                <p><a href="${resetURL}">${resetURL}</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request this, please ignore this email.</p>
            `,
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("✅ Email sent:", info.messageId);

            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent to it.'
            });
        } catch (emailErr) {
            console.error("❌ Email send failed:", emailErr);
            // It's good practice to clear the token if email sending fails, so the user can try again
            client.passwordResetToken = undefined;
            client.passwordResetExpires = undefined;
            await client.save(); // Save again to clear token

            return res.status(500).json({
                message: 'Email could not be sent. Please try again later.',
                error: emailErr.message
            });
        }
    } catch (err) {
        console.error("❌ clientForgotPassword overall error:", err); // Improved overall error log
        res.status(500).json({
            message: 'Server error. Could not process password reset request.',
            error: err.message
        });
    }
};

export const clientResetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const client = await Client.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() },
        });
        if (!client) return res.status(400).json({ message: "Invalid or expired token." });

        const hashed = await bcrypt.hash(newPassword, 10);
        client.login.password = hashed;
        client.passwordResetToken = undefined;
        client.passwordResetExpires = undefined;
        await client.save();

        res.status(200).json({ message: "Password reset successful." });
    } catch (err) {
        res.status(500).json({ message: "Reset error", error: err.message });
    }
};


export const addClientFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "No files uploaded" });

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const docs = files.map(f => ({
      originalName: f.originalname,
      storedName: f.filename,
      path: f.path,
      url: `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
      mimeType: f.mimetype,
      size: f.size,
      uploadedBy: req.user?.id,
    }));

    client.files.push(...docs);
    await client.save();

    const fileNames = files.map(f => f.originalname).join(', ');
    await Activity.create({
      type: 'file_added',
      description: `Files added: ${fileNames}`,
      user: req.user?.id,
      client: client._id,
    });

    const populated = await Client.findById(id)
      .select("files")
      .populate("files.uploadedBy", "name email");

    const added = populated.files.slice(-docs.length);
    return res.status(201).json({ message: "Files added", files: added });
  } catch (err) {
    console.error("❌ addClientFiles error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const listClientFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      search = "",
      page = 1,
      limit = 10,
      sort = "uploadedAt:desc",
    } = req.query;

    const client = await Client.findById(id)
      .populate("files.uploadedBy", "name email");
    if (!client) return res.status(404).json({ message: "Client not found" });

    let files = client.files || [];

    if (search) {
      const q = String(search).toLowerCase();
      files = files.filter(f => f.originalName?.toLowerCase().includes(q));
    }

    const [fieldRaw, dirRaw] = String(sort).split(":");
    const field = ["originalName","uploadedAt","size"].includes(fieldRaw) ? fieldRaw : "uploadedAt";
    const dir = dirRaw === "asc" ? 1 : -1;
    files.sort((a,b) => {
      const av = a[field]; const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (field === "originalName") return dir * String(av).localeCompare(String(bv));
      return dir * ((new Date(av)).getTime() - (new Date(bv)).getTime());
    });

    const p = Math.max(1, parseInt(page,10) || 1);
    const l = Math.max(1, parseInt(limit,10) || 10);
    const total = files.length;
    const start = (p-1)*l;
    const data = files.slice(start, start+l);

    return res.json({ files: data, total, page: p, limit: l });
  } catch (err) {
    console.error("❌ listClientFiles error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteClientFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const file = client.files.id(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    try {
      if (file.path) {
        const abs = path.isAbsolute(file.path) ? file.path : path.resolve(file.path);
        await fs.unlink(abs);
      }
    } catch (e) {
      // ignore: file might already be gone
    }

    const fileName = file.originalName;

    await file.deleteOne();
    await client.save();

    await Activity.create({
      type: 'deleted',
      description: `File deleted: ${fileName}`,
      user: req.user?.id,
      client: client._id,
    });

    return res.json({ message: "File deleted" });
  } catch (err) {
    console.error("❌ deleteClientFile error:", err);
    return res.status(500).json({ message: err.message });
  }
};
export const addReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, reminderDate, notes, createdBy, isCompleted } = req.body;

    if (!title || !reminderDate) {
      return res.status(400).json({ message: "title and reminderDate are required" });
    }

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const reminder = {
      title,
      reminderDate: new Date(reminderDate),
      notes,
      createdBy: createdBy || req.user?.id,
      isCompleted: !!isCompleted,
    };

    client.Reminders.push(reminder);
    await client.save();

    await Activity.create({
      type: "reminder_added",
      description: `Reminder added: "${title}"`,
      user: req.user?.id,
      client: client._id,
    });

    const created = client.Reminders[client.Reminders.length - 1];
    res.status(201).json({ message: "Reminder added", reminder: created });
  } catch (err) {
    console.error("❌ addReminder error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/clients/:id/reminders
export const getReminders = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id)
      .select("Reminders")
      .populate("Reminders.createdBy", "name email");

    if (!client) return res.status(404).json({ message: "Client not found" });

    const onlyPending = String(req.query.onlyPending || "false") === "true";
    let reminders = [...(client.Reminders || [])].sort(
      (a, b) => new Date(a.reminderDate) - new Date(b.reminderDate)
    );
    if (onlyPending) reminders = reminders.filter((r) => !r.isCompleted);

    res.json(reminders);
  } catch (err) {
    console.error("❌ getReminders error:", err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/clients/:id/reminders/:reminderId
export const deleteReminder = async (req, res) => {
  try {
    const { id, reminderId } = req.params;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const reminder = client.Reminders.id(reminderId);
    if (!reminder) return res.status(404).json({ message: "Reminder not found" });

    const reminderTitle = reminder.title;

    await reminder.deleteOne();
    await client.save();

    await Activity.create({
      type: "reminder_deleted",
      description: `Reminder deleted: "${reminderTitle}"`,
      user: req.user?.id,
      client: id,
    });

    res.json({ message: "Reminder deleted" });
  } catch (err) {
    console.error("❌ deleteReminder error:", err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/clients/:id/reminders/:reminderId/complete
export const completeReminder = async (req, res) => {
  try {
    const { id, reminderId } = req.params;
    const { isCompleted = true } = req.body;

    const updated = await Client.findOneAndUpdate(
      { _id: id, "Reminders._id": reminderId },
      { $set: { "Reminders.$.isCompleted": !!isCompleted } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Client/Reminder not found" });

    const reminder = updated.Reminders.find((r) => String(r._id) === String(reminderId));

    await Activity.create({
      type: "reminder_updated",
      description: `Reminder "${reminder.title}" status changed to ${
        isCompleted ? "completed" : "pending"
      }`,
      user: req.user?.id,
      client: id,
    });

    res.json({ message: "Reminder status updated", reminder });
  } catch (err) {
    console.error("❌ completeReminder error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const addServiceToClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { service, quantity, unitPrice, discount, paid, pending, startDate, expiryDate } =
      req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.services.push({
      service,
      quantity: quantity || 1,
      unitPrice,
      discount: discount || 0,
      paid: paid || 0,
      pending: pending || 0,
      startDate: startDate || new Date(),
      expiryDate: expiryDate || null,
    });

    await client.save();

    await Activity.create({
      type: "service_added",
      description: "Service added to client",
      user: req.user?.id,
      client: client._id,
    });

    res.status(200).json({ message: "Service added to client", client });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateClientService = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const updateData = req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const service = client.services.id(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    Object.assign(service, updateData);
    await client.save();

    await Activity.create({
      type: "service_updated",
      description: "Client service updated",
      user: req.user?.id,
      client: client._id,
    });

    res.json({ message: "Service updated", client });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteClientService = async (req, res) => {
  try {
    const { id, serviceId } = req.params;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const service = client.services.id(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    service.deleteOne();
    await client.save();

    await Activity.create({
      type: "service_deleted",
      description: "Client service removed",
      user: req.user?.id,
      client: client._id,
    });

    res.json({ message: "Service removed", client });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};