import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
  message: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const subscriptionSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    firstBilling: {
      type: Date,
      required: true,
    },
    nextBilling: {
      type: Date,
    },
    cycle: {
      type: String,
      enum: ["monthly", "yearly", "weekly", "custom"],
      default: "monthly",
    },
    repeatEvery: {
      type: Number,
      default: 1,
    },
    amount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0, // Ensure tax is non-negative
    },
    secondTax: {
      type: Number,
      default: 0,
      min: 0, // Ensure second tax is non-negative
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled", "expired"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    Notes: { type: [NoteSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
