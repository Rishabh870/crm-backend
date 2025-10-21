import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      // e.g., 'Bug', 'Feature Request', 'Technical Support'
      type: String,
      enum: [
        "General Inquiry",
        "Technical Issue",
        "Billing",
        "Feature Request",
        "Other",
      ],
      default: "General Inquiry",
    },
    priority: {
      // e.g., 'Low', 'Medium', 'High', 'Urgent'
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      // e.g., 'Open', 'In Progress', 'Resolved', 'Closed'
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    // Reference to the client who submitted the ticket (assuming you have a Client model)
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client", // Assuming your client model is named 'Client'
      required: true,
    },
    // Reference to the user (agent) who is assigned to the ticket
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming your user/agent model is named 'User'
      default: null,
    },
    // An array to store comments/updates on the ticket
    comments: [
      {
        user: {
          // User (agent or client) who made the comment
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Could be 'User' or 'Client' depending on your design
          required: true,
        },
        comment: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    attachments: [
      // For file uploads
      {
        fileName: String,
        filePath: String, // Path on server or URL
        fileType: String, // e.g., 'image/png', 'application/pdf'
        fileSize: Number, // in bytes
      },
    ],
  },
  { timestamps: true }
); // Mongoose adds createdAt and updatedAt automatically

export default mongoose.model("Ticket", TicketSchema);
