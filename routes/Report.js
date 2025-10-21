import express from "express";
import { getDashboardStats,getLeadsByStatus,getTasksByStatus,getRecentActivity,getSummaryReport } from "../controllers/Report.js";
import { protect, roleCheck } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/dashboard-stats",  protect, roleCheck(["admin"]),getDashboardStats);
router.get("/leads-by-status",protect, roleCheck(["admin"]), getLeadsByStatus);
router.get("/tasks-by-status",protect, roleCheck(["admin"]), getTasksByStatus);
router.get("/recent-activity", protect, roleCheck(["admin"]), getRecentActivity);
router.get('/summary',  protect, roleCheck(["admin"]), getSummaryReport);
export default router;
