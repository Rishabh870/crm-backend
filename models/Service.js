// models/Service.js

import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      // New field for the image URL
      type: String,
      default: "",
    },
    description: {
      type: String,
    },
    price: {
      type: String, // Consider using Number type if you'll perform calculations
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);
export default Service; // Changed to export default
