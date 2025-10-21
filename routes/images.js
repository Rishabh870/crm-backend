// routes/imageRoutes.js
import express from "express";
import { createImageEntry ,getallImages} from "../controllers/images.js";
import upload from "../middleware/multer.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 }
  ]),
  createImageEntry
);
router.get("/all",  getallImages);
export default router;
