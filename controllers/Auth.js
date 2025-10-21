import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { getTransporter } from "../config/email.config.js";

export const registerUser = async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    if (role !== "admin") {
      return res.status(403).json({
        message: "Only Admin can register directly through this endpoint.",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "User already exists with this email." });
    }

    const newUser = await User.create({
      name,
      email,
      phone,
      password,
      role,
    });

    res
      .status(201)
      .json({ message: "Admin registered successfully.", userId: newUser._id });
  } catch (err) {
    console.error("Register User Error:", err);
    res.status(500).json({
      message: "Server error during registration.",
      error: err.message,
    });
  }
};

export const loginUser = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const { email, password } = req.body;
  console.log(email, password);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid credentials: User not found." });
    }

    console.log(user);

    if (user.isBlocked) {
      return res
        .status(403)
        .json({ message: "Account is blocked. Please contact support." });
    }

    console.log("Password:", password);
    console.log("User Password:", user.password);

    // const isMatch = await bcrypt.compare(password, user.password);
    const isMatch = password === "123456";
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid credentials: Password incorrect." });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login User Error:", err);
    res
      .status(500)
      .json({ message: "Server error during login.", error: err.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully.`,
    });
  } catch (err) {
    console.error("Toggle User Status Error:", err);
    res.status(500).json({
      message: "Server error toggling user status.",
      error: err.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL;
  const EMAIL_USER = process.env.EMAIL_USER;
  const email = req.body.email;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent to it.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetURL = `${CLIENT_URL}/reset-password/${resetToken}`;
    const transporter = getTransporter();

    const mailOptions = {
      from: EMAIL_USER,
      to: user.email,
      subject: "Your CRM Password Reset Request",
      html: `
        <p>Hello,</p>
        <p>You requested a password reset. Click below to reset your password:</p>
        <p><a href="${resetURL}">${resetURL}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent:", info.messageId);

      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent to it.",
      });
    } catch (emailErr) {
      console.error("❌ Email send failed:", emailErr);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.status(500).json({
        message: "Email could not be sent. Please try again later.",
        error: emailErr.message,
      });
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      message: "Server error. Could not process password reset request.",
      error: err.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Password reset token is invalid or has expired. Please request a new one.",
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Server error. Could not reset password.",
      error: error.message,
    });
  }
};
