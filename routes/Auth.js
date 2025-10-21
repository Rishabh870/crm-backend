// routes/authRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  toggleUserStatus,
  forgotPassword, // <-- New: Import forgotPassword
  resetPassword, // <-- New: Import resetPassword
} from "../controllers/Auth.js"; // Ensure Auth.js has all these exports

import { protect, roleCheck } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (accessible without authentication)
router.post("/register", registerUser); // For admin self-registration
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword); // <-- New: Route to request password reset email
router.post("/reset-password/:token", resetPassword); // <-- New: Route to set new password with token

// Protected routes (require authentication)
// Example: Only an 'Admin' can toggle user status
router.put("/toggle/:id", protect, roleCheck(["Admin"]), toggleUserStatus); // Role updated to 'Admin' for consistency

export default router;
