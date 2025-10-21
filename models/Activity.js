import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "created",
      "updated",
      "deleted",
      "note_added",
      "file_added",
      "quotation_created",
      "followup_added",
      "call_added",
      "reminder_added",
      "reminder_updated",
      "reminder_deleted",
      "quotation_updated",
      "client_created",
      "client_updated",
      "client_deleted",
      "project_created",
      "project_deleted",
      "project_updated",
      "contact_person_created",
      "contact_person_updated",
      "contact_person_deleted",
      "subscription_created",
      "subscription_updated",
      "subscription_deleted",
      "invoice_created",
      "invoice_updated",
      "invoice_deleted",
      "expense_created",
      "expense_updated",
      "expense_deleted",
      "project_note_added",
      "file_deleted",
      "task_deleted",
      "task_created",
      "task_updated",
    ],
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
  },
});

export default mongoose.model("Activity", activitySchema);
