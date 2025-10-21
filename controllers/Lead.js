import Lead from "../models/Lead.js";
import Activity from '../models/Activity.js';
import Quotation from '../models/Quotation.js';
import fs from 'fs/promises';
import path from 'path';

// ➕ Create Lead
export const createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      company,
      source,
      labels = [],
      assignedTo,
      createdBy,
      status,
      firstFollowUpMessage,
      Notes
    } = req.body;

    const leadData = {
      name,
      email,
      phone,
      address,
      company,
      source,
      labels,
      assignedTo,
      createdBy,
      status
    };

    if (firstFollowUpMessage) {
      const now = new Date();
      leadData.followUps = [{ message: firstFollowUpMessage, date: now }];
      leadData.latestFollowUp = now;
    }

   if (Array.isArray(Notes) && Notes.length > 0) {
            leadData.Notes = Notes;
        } else {
            leadData.Notes = []; // Ensure 'Notes' is an empty array if no valid notes are provided
        }

    const lead = await Lead.create(leadData);

    await Activity.create({
      type: 'created',
      description: 'Lead created',
      user: lead.createdBy,
      lead: lead._id,
    });

    res.status(201).json({ message: "Lead created", lead });
  } catch (err) {
    console.error("❌ Error creating lead:", err);
    res.status(500).json({ message: err.message });
  }
};

// 📋 Get All Leads (admin sees all, others see only assigned/created)
export const getLeads = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let leads;

    const query = role === "admin"
      ? {}
      : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

    leads = await Lead.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("followUps.addedBy", "name");

    const enrichedLeads = leads.map((lead) => {
      const followUps = lead.followUps || [];
      const notes = lead.Notes || [];
      return {
        ...lead.toObject(),
        firstFollowUpMessage: followUps[0]?.message || null,
        firstFollowUpDate: followUps[0]?.date || null,
        latestFollowUpMessage: followUps.at(-1)?.message || null,
        latestFollowUpDate: followUps.at(-1)?.date || null,
        latestNoteMessage: notes.at(-1)?.message || null,
        latestNoteDate: notes.at(-1)?.date || null,
      };
    });

    res.status(200).json(enrichedLeads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📄 Get Single Lead by ID
export const getSingleLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("followUps.addedBy", "name");

    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const quotations = await Quotation.find({ lead: lead._id });
    const totalQuotations = quotations.length;

    let totalServices = 0;
    quotations.forEach(q => {
        q.contentBlocks.forEach(block => {
            if (block.blockType === 'section') {
                totalServices += block.section.rows.length;
            }
        });
    });

    const totalFiles = lead.files.length;
    const totalReminders = lead.Reminders.length;

    const leadData = {
        ...lead.toObject(),
        totalQuotations,
        totalFiles,
        totalReminders,
        totalServices,
    };

    res.status(200).json(leadData);
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ message: "Server error while fetching lead" });
  }
};

// ✅ Update Lead
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const leadBeforeUpdate = await Lead.findById(id);
    if (!leadBeforeUpdate) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const lead = await Lead.findByIdAndUpdate(id, updateData, { new: true });

    // Check for status change specifically
    if (updateData.status && updateData.status !== leadBeforeUpdate.status) {
      await Activity.create({
        type: "updated",
        description: `Lead status changed from '${leadBeforeUpdate.status}' to '${updateData.status}'`,
        user: req.user?.id,
        lead: lead._id,
      });
    } else {
      // Generic update activity for other changes
      const changes = [];
      for (const key in updateData) {
        if (
          key !== 'status' && // Avoid duplicating the status change message
          updateData.hasOwnProperty(key) &&
          String(leadBeforeUpdate[key]) !== String(updateData[key])
        ) {
          changes.push(
            `'${key}' from '${leadBeforeUpdate[key]}' to '${updateData[key]}'`
          );
        }
      }

      if (changes.length > 0) {
        await Activity.create({
          type: "updated",
          description: `Lead updated: ${changes.join(", ")}`,
          user: req.user?.id,
          lead: lead._id,
        });
      }
    }

    res.status(200).json({ message: "Lead updated", lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ❌ Delete Lead
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    await Activity.create({
      type: 'deleted',
      description: 'Lead deleted',
      user: req.user?.id,
      lead: lead._id,
    });

    res.status(200).json({ message: "Lead deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ➕ Add Follow-Up
export const addFollowUp = async (req, res) => {
  try {
    const { message } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    lead.followUps.push({ message, date: new Date(), addedBy: req.user._id });
    lead.latestFollowUp = new Date();
    await lead.save();

    await Activity.create({
      type: 'followup_added',
      description: `Follow-up added: "${message}"`,
      user: req.user?.id,
      lead: lead._id,
    });

    res.status(200).json({ message: "Follow-up added", lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✉️ Add Note
export const addNote = async (req, res) => {
  try {
    const { message } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    lead.Notes.push({ message, date: new Date() });
    await lead.save();

    await Activity.create({
      type: 'note_added',
      description: `Note added: "${message}"`,
      user: req.user?.id,
      lead: lead._id,
    });

    res.status(200).json({ message: "Note added successfully", lead });
  } catch (err) {
    console.error("Error adding note:", err);
    res.status(500).json({ message: err.message });
  }
};
export const addCalls = async (req, res) => {
  try {
    const { subject,callType,duration,assignee,description,result } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    lead.Notes.push({ message, date: new Date() });
    await lead.save();

    res.status(200).json({ message: "Note added successfully", lead });
  } catch (err) {
    console.error("Error adding note:", err);
    res.status(500).json({ message: err.message });
  }
};
// 📱 Get Lead by Phone
export const getLeadByPhone = async (req, res) => {
  try {
    const inputPhone = req.params.phone.replace(/[^\d]/g, '').slice(-10); // last 10 digit clean
    const leads = await Lead.find();
    const match = leads.find(lead => {
      const cleanDbPhone = (lead.phone || '').replace(/[^\d]/g, '').slice(-10);
      return cleanDbPhone === inputPhone;
    });

    if (!match) return res.status(404).json({ message: "Not found" });
    res.json(match);
  } catch (err) {
    console.error("Lead fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const getConvertedLeads = async (req, res) => {
  try {
    const convertedLeads = await Lead.find({ status: 'converted' }).populate('name email company address phone');
    res.status(200).json(convertedLeads);
  } catch (error) {
    console.error("❌ Error fetching converted leads:", error);
    res.status(500).json({ message: 'Failed to fetch converted leads' });
  }
};

export const getLeadByPhoneOrName = async (req, res) => {
  try {
    const input = req.params.phoneOrName?.trim();

    if (!input) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const leads = await Lead.find();

    // Try phone match (last 10 digits only)
    const cleanInputPhone = input.replace(/[^\d]/g, '').slice(-10);
    let match = leads.find(lead => {
      const cleanDbPhone = (lead.phone || '').replace(/[^\d]/g, '').slice(-10);
      return cleanDbPhone === cleanInputPhone;
    });

    // If no phone match, try exact name match
    if (!match) {
      match = leads.find(lead =>
        lead.name?.toLowerCase().trim() === input.toLowerCase().trim()
      );
    }

    // If still no match, try partial name match (contains)
    if (!match) {
      match = leads.find(lead =>
        lead.name?.toLowerCase().includes(input.toLowerCase())
      );
    }

    if (!match) return res.status(404).json({ message: "No matching lead found." });

    res.json(match);
  } catch (err) {
    console.error("Lead fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// controllers/Lead.js
export const addCall = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subject,
      callType = "outbound",
      duration,
      assignee,      // optional userId
      description,
      result,
      date,
    } = req.body;

    if (!subject) {
      return res.status(400).json({ message: "Subject is required" });
    }

    const newCall = {
      subject,
      callType,
      duration,
      assignee: assignee || undefined,
      description,
      result,
      date: date ? new Date(date) : new Date(),
    };

    // Push and return updated lead, then populate on the PARENT
    const lead = await Lead.findByIdAndUpdate(
      id,
      { $push: { Calls: newCall } },
      { new: true }
    ).populate("Calls.assignee", "name email"); // ✅ populate on parent doc

    if (!lead) return res.status(404).json({ message: "Lead not found" });

    await Activity.create({
      type: 'call_added',
      description: `Call added: "${subject}"`,
      user: req.user?.id,
      lead: lead._id,
    });

    // Return the newly added (last) call
    const created = lead.Calls[lead.Calls.length - 1];
    return res.status(201).json({ message: "Call added", call: created });
  } catch (err) {
    console.error("❌ addCall error:", err);
    return res.status(500).json({ message: err.message });
  }
};


// GET /api/leads/:id/calls
export const getCalls = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id)
      .select("Calls")
      .populate("Calls.assignee", "name email");

    if (!lead) return res.status(404).json({ message: "Lead not found" });
    // newest first
    const calls = [...(lead.Calls || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    res.json(calls);
  } catch (err) {
    console.error("❌ getCalls error:", err);
    res.status(500).json({ message: err.message });
  }
};
export const deleteCall = async (req, res) => {
  try {
    const { id, callId } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const call = lead.Calls.id(callId);
    if (!call) return res.status(404).json({ message: "Call not found" });

    const callSubject = call.subject;

    // ✅ Mongoose 7+
    await call.deleteOne();        // <-- remove() ki jagah deleteOne()
    await lead.save();

    await Activity.create({
      type: "deleted",
      description: `Call deleted: "${callSubject}"`,
      user: req.user?.id,
      lead: lead._id,
    });

    res.json({ message: "Call deleted" });
  } catch (err) {
    console.error("❌ deleteCall error:", err);
    res.status(500).json({ message: err.message });
  }
};



export const addReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, reminderDate, notes, createdBy, isCompleted } = req.body;

    if (!title || !reminderDate) {
      return res.status(400).json({ message: "title and reminderDate are required" });
    }

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const reminder = {
      title,
      reminderDate: new Date(reminderDate),
      notes,
      createdBy: createdBy || req.user?.id, // optional: fall back to auth user
      isCompleted: !!isCompleted,
    };

    lead.Reminders.push(reminder);
    await lead.save();

    await Activity.create({
      type: 'reminder_added',
      description: `Reminder added: "${title}"`,
      user: req.user?.id,
      lead: lead._id,
    });

    const created = lead.Reminders[lead.Reminders.length - 1];
    res.status(201).json({ message: "Reminder added", reminder: created });
  } catch (err) {
    console.error("❌ addReminder error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/leads/:id/reminders
export const getReminders = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id)
      .select("Reminders")
      .populate("Reminders.createdBy", "name email");

    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // optional query: ?onlyPending=true
    const onlyPending = String(req.query.onlyPending || "false") === "true";
    let reminders = [...(lead.Reminders || [])].sort(
      (a, b) => new Date(a.reminderDate) - new Date(b.reminderDate)
    );
    if (onlyPending) reminders = reminders.filter((r) => !r.isCompleted);

    res.json(reminders);
  } catch (err) {
    console.error("❌ getReminders error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const { id, reminderId } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const reminder = lead.Reminders.id(reminderId);
    if (!reminder) return res.status(404).json({ message: "Reminder not found" });

    const reminderTitle = reminder.title;

    // ⬇️ yahan change
    await reminder.deleteOne();      // remove() ❌  -> deleteOne() ✅
    await lead.save();

    await Activity.create({
      type: 'deleted',               // ya 'reminder_deleted' agar enum me add kiya ho
      description: `Reminder deleted: "${reminderTitle}"`,
      user: req.user?.id,
      lead: id,
    });

    res.json({ message: "Reminder deleted" });
  } catch (err) {
    console.error("❌ deleteReminder error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const completeReminder = async (req, res) => {
  try {
    const { id, reminderId } = req.params;
    const { isCompleted = true } = req.body;

    const updated = await Lead.findOneAndUpdate(
      { _id: id, "Reminders._id": reminderId },
      { $set: { "Reminders.$.isCompleted": !!isCompleted } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Lead/Reminder not found" });

    const reminder = updated.Reminders.find((r) => String(r._id) === String(reminderId));

    await Activity.create({
      type: 'reminder_updated',
      description: `Reminder "${reminder.title}" status changed to ${isCompleted ? 'completed' : 'pending'}`,
      user: req.user?.id,
      lead: id,
    });

    res.json({ message: "Reminder status updated", reminder });
  } catch (err) {
    console.error("❌ completeReminder error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const addLeadFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "No files uploaded" });

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const docs = files.map(f => ({
      originalName: f.originalname,
      storedName: f.filename,
      path: f.path,
      url: `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
      mimeType: f.mimetype,
      size: f.size,
      uploadedBy: req.user?.id,
    }));

    lead.files.push(...docs);
    await lead.save();

    const fileNames = files.map(f => f.originalname).join(', ');
    await Activity.create({
      type: 'file_added',
      description: `Files added: ${fileNames}`,
      user: req.user?.id,
      lead: lead._id,
    });

    const populated = await Lead.findById(id)
      .select("files")
      .populate("files.uploadedBy", "name email");

    // naya add hua last N records (jitne upload hue)
    const added = populated.files.slice(-docs.length);
    return res.status(201).json({ message: "Files added", files: added });
  } catch (err) {
    console.error("❌ addLeadFiles error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const listLeadFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      search = "",
      page = 1,
      limit = 10,
      sort = "uploadedAt:desc",
    } = req.query;

    const lead = await Lead.findById(id)
      .populate("files.uploadedBy", "name email");
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    let files = lead.files || [];

    // search on originalName
    if (search) {
      const q = String(search).toLowerCase();
      files = files.filter(f => f.originalName?.toLowerCase().includes(q));
    }

    // sort
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

    // paginate
    const p = Math.max(1, parseInt(page,10) || 1);
    const l = Math.max(1, parseInt(limit,10) || 10);
    const total = files.length;
    const start = (p-1)*l;
    const data = files.slice(start, start+l);

    return res.json({ files: data, total, page: p, limit: l });
  } catch (err) {
    console.error("❌ listLeadFiles error:", err);
    return res.status(500).json({ message: err.message });
  }
};


export const deleteLeadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const file = lead.files.id(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    // delete from disk (best-effort)
    try {
      if (file.path) {
        const abs = path.isAbsolute(file.path) ? file.path : path.resolve(file.path);
        await fs.unlink(abs);
      }
    } catch (e) {
      // ignore: file might already be gone
    }

    const fileName = file.originalName;

    // ❌ file.remove();  // Mongoose v7 me nahi hai
    await file.deleteOne();       // ✅ subdoc delete
    await lead.save();

    await Activity.create({
      type: 'deleted',            // ya 'file_deleted' agar enum me add kiya ho
      description: `File deleted: ${fileName}`,
      user: req.user?.id,
      lead: lead._id,
    });

    return res.json({ message: "File deleted" });
  } catch (err) {
    console.error("❌ deleteLeadFile error:", err);
    return res.status(500).json({ message: err.message });
  }
};

