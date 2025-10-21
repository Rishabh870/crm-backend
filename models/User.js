import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phone: String,
    address: String,
    password: {
      type: String,
      required: true,
    },
    image: { type: String, default: null },
    role: {
      type: String,
      enum: ["admin", "manager", "sales", "support", "team"],
      required: true,
    },
    teamsubrole: {
      type: String,
      enum: ["Developer", "GraphicDesigner", "SEO"],
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  // If the password field is not modified, move to the next middleware
  if (!this.isModified("password")) {
    return next();
  }
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password (if not already present)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
export default mongoose.model("User", userSchema);
