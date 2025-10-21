import express from 'express';
import mongoose from 'mongoose';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectsByClientId,
  getTotalProjects,
  addProjectFiles,
  listProjectFiles,
  deleteProjectFile,
  getProjectTasks,
  addProjectNote,
  getProjectNotes
} from '../controllers/Projects.js';
import { protect, roleCheck } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Small helper to validate ObjectId
const checkObjectId = (param = 'id') => (req, res, next) => {
  const val = req.params[param];
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ message: `Invalid ${param}` });
  }
  next();
};

/** ---- Put specific/stat routes BEFORE any "/:id" route ---- */
router.get('/total', protect, getTotalProjects);
router.get('/client/:clientId/projects', protect, checkObjectId('clientId'), getProjectsByClientId);

/** Base list/create */
router
  .route('/')
  .post(protect, roleCheck(['admin', 'manager', 'sales']), createProject)
  .get(protect, getAllProjects);

/** Single by id (no inline regex; validate via middleware) */
router
  .route('/:id')
  .get(protect, checkObjectId('id'), getProjectById)
  .put(protect, roleCheck(['admin', 'manager']), checkObjectId('id'), updateProject)
  .delete(protect, roleCheck(['admin']), checkObjectId('id'), deleteProject);

// Project Files routes
router.post("/:id/files", protect, roleCheck(["admin", "manager", "sales"]), upload.array("files", 10), addProjectFiles);
router.get("/:id/files", protect, roleCheck(["admin", "manager", "sales"]), listProjectFiles);
router.delete("/:id/files/:fileId", protect, roleCheck(["admin", "manager", "sales"]), deleteProjectFile);

// Project Tasks route
router.get("/:id/tasks", protect, roleCheck(["admin", "manager", "sales", "team"]), getProjectTasks);



// Project Notes routes
router.post("/:id/notes", protect, roleCheck(["admin", "manager", "sales", "team"]), addProjectNote);
router.get("/:id/notes", protect, roleCheck(["admin", "manager", "sales", "team"]), getProjectNotes);

export default router;
