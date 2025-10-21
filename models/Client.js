import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
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
const clientSchema = new mongoose.Schema(
  {
    clientType: {
      type: String,
      enum: ["organization", "individual"],
      required: true,
    },
    companyName: {
      type: String,
    },
    name: {
      type: String,
    },
    email: String, // This is the primary email, not necessarily the login email
    phone: String,
    address: String,
    clientLevel: {
      type: String,
      enum: ["gold", "silver", "bronze", "basic"],
      default: "basic",
    },
    website: String,
    gstNumber: String,
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on-hold"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    services: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
          required: true,
        },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        paid: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        startDate: { type: Date, default: Date.now },
        expiryDate: { type: Date },
      },
    ],
    files: { type: [fileSchema], default: [] },
    Notes: { type: [noteSchema], default: [] },
    Reminders: { type: [ReminderSchema], default: [] },
    followUps: {
      type: [
        {
          message: String,
          date: Date,
          addedBy: mongoose.Schema.Types.ObjectId,
        },
      ],
      default: [],
    },
    login: {
      // This is where the client's login credentials are stored
      email: { type: String, unique: true, sparse: true }, // This is the email used for login
      password: { type: String },
      isLoginEnabled: { type: Boolean, default: false },
    },
    role: {
      type: String,
      enum: ["client"], // यह सुनिश्चित करता है कि क्लाइंट के पास केवल 'Client' रोल हो
      default: "client", // डिफॉल्ट के रूप में 'Client' सेट करें
      required: true, // क्लाइंट के लिए रोल आवश्यक है
    },
    passwordResetToken: String, // Field for reset token
    passwordResetExpires: Date, // Field for token expiration
    customClientId: String, // Added from previous conversation for custom ID generation
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
