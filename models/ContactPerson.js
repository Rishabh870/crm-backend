import mongoose from "mongoose";

const contactPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    designation: String,
    linkedClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
contactPersonSchema.index({ linkedClient: 1, name: 1 });
export default mongoose.model("ContactPerson", contactPersonSchema);
