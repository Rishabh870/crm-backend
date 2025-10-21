import express from "express";
import {
  getAllUsers,
  createUserByAdmin,
  updateUser,
  deleteUser,
  getUserById,
  getTeamMembers,
  createTeamMember
} from "../controllers/User.js";
import { protect, roleCheck  } from "../middleware/authMiddleware.js";
import upload from '../middleware/multer.js'

const router = express.Router();

router.get("/allusers", protect, roleCheck(['admin']) , getAllUsers);
router.post('/createteammember', protect,  roleCheck(['admin']) , createTeamMember); 
router.post("/createuser", protect, roleCheck(['admin']), createUserByAdmin);
router.get('/teammembers', protect,roleCheck(['admin']), getTeamMembers); 
router.get("/singleuser/:id", protect, getUserById);
router.put("/updateuser/:id",upload.single('image'), protect, updateUser);
router.delete("/deleteusers/:id", protect, roleCheck(["admin"]), deleteUser);
export default router;
