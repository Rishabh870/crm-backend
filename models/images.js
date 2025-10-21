import mongoose from "mongoose";

const imageDetailSchema = new mongoose.Schema({
  url: String,
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const imageSchema = new mongoose.Schema({
  image: imageDetailSchema, // Single image as an object
  images: [imageDetailSchema], // Multiple images as array of objects
});

export default mongoose.model("Images", imageSchema);
