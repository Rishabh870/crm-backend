import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getSingleTask,
  getClientTasks
} from "../controllers/Task.js";
import { protect, roleCheck } from "../middleware/authMiddleware.js";

const router = express.Router();

// ➕ Create a new task
router.post("/", protect, roleCheck(["admin", "sales"]), createTask);

// 📋 Get tasks
router.get("/", protect, roleCheck(["admin", "sales", "support"]), getTasks);
router.get('/client/:clientId', protect, roleCheck(['admin', 'manager', 'sales', 'support', 'team', 'client']), getClientTasks);
router.get("/single/:id",protect, roleCheck(["admin", "sales", "support"]), getSingleTask);

// 🖊 Update task
router.put("/update/:id", protect, roleCheck(["admin", "sales"]), updateTask);

// ❌ Delete task
router.delete("/:id", protect, roleCheck(["admin"]), deleteTask);

export default router;
