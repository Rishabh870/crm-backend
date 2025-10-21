import express from "express";
import {
  createLead,
  getLeads,
  updateLead,
  deleteLead,
  getSingleLead,
  addFollowUp,
  getLeadByPhoneOrName,
  getLeadByPhone,
  addNote,
  getConvertedLeads,
  addCall,
  getCalls,
  addReminder,
   getReminders,
   completeReminder,
   deleteReminder,
   deleteCall,
   deleteLeadFile,listLeadFiles,
   addLeadFiles
} from "../controllers/Lead.js";
import { protect, roleCheck } from "../middleware/authMiddleware.js";
import upload from '../middleware/multer.js'
const router = express.Router();

// ➕ Create a new lead
router.post("/",  createLead);
router.get("/by-phone/:phoneOrName",  getLeadByPhoneOrName);
router.get("/by-phone/:phone",  getLeadByPhone);
// 📋 Get all leads
router.get("/converted",  getConvertedLeads);

router.get("/", protect, roleCheck(["admin", "sales", "manager"]), getLeads);
router.post("/:id/calls",protect, roleCheck(["admin", "sales", "manager"]),  addCall);
router.get("/:id/calls",protect, roleCheck(["admin", "sales", "manager"]),  getCalls);
router.delete("/:id/calls/:callId", protect, roleCheck(["admin", "sales", "manager"]), deleteCall);
router.post("/:id/reminders", protect, roleCheck(["admin", "sales", "manager"]), addReminder);
router.get("/:id/reminders", protect, roleCheck(["admin", "sales", "manager"]), getReminders);
router.patch("/:id/reminders/:reminderId/complete",protect, roleCheck(["admin", "sales", "manager"]), completeReminder);
router.delete("/:id/reminders/:reminderId", protect, roleCheck(["admin", "sales", "manager"]), deleteReminder);
router.get("/:id/files", protect, roleCheck(["admin", "sales", "manager"]), listLeadFiles);
router.post("/:id/files",protect, roleCheck(["admin", "sales", "manager"]), upload.array("files", 10), addLeadFiles);
router.delete("/:id/files/:fileId", protect, roleCheck(["admin", "sales", "manager"]), deleteLeadFile);
router.get("/single/:id", protect, roleCheck(['admin', 'sales', 'manager']), getSingleLead);
// 🖊 Update a lead
router.put("/update/:id", protect, roleCheck(['admin', 'sales', 'manager']), updateLead);

// ❌ Delete a lead
router.delete("/:id", protect, roleCheck(["admin"]), deleteLead);
router.post("/:id/followup", protect, roleCheck(['admin', 'sales', 'manager']), addFollowUp);
router.post("/:id/note", protect,roleCheck(['admin', 'manager', 'sales', 'support', 'team']), addNote); 

export default router;
