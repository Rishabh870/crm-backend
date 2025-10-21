import mongoose from "mongoose";

// Follow-up schema (embedded inside Lead)
const followUpSchema = new mongoose.Schema({
  message: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});
const NoteSchema = new mongoose.Schema({
  message: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const CallSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  callType: {
    type: String,
    enum: ["inbound", "outbound"],
    default: "outbound",
  },
  duration: { type: String }, // Format h:m:s e.g., 00:35:20
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: { type: String },
  result: { type: String }, // Call result (success, no answer, etc.)
  date: { type: Date, default: Date.now },
});
const ReminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  reminderDate: { type: Date, required: true }, // When reminder should trigger
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isCompleted: { type: Boolean, default: false },
});
const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    path: { type: String, required: true },
    url: { type: String },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);
const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: String,
    phone: {
      type: String,
      unique: true,
    },

    address: String,
    company: String,
    source: String,
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "lost"],
      default: "new",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    labels: {
      type: [String],
    },

    followUps: { type: [followUpSchema], default: [] },
    Notes: { type: [NoteSchema], default: [] },
    Calls: { type: [CallSchema], default: [] },
    Reminders: { type: [ReminderSchema], default: [] },
    files: { type: [fileSchema], default: [] },
    latestFollowUp: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
