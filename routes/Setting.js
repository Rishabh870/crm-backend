import express from "express";
import upload from "../middleware/multer.js"; // Your Multer configuration
import { getSettings, uploadLogo ,updateSettings,uploadLetterheadFull} from "../controllers/Setting.js";

const router = express.Router();

router.get("/site", getSettings);
router.put("/update", upload.single("quotationLogo"), updateSettings); // Multer for quotationLogo specifically
router.post("/upload-logo", upload.single("logo"), uploadLogo); // Multer for general logo uploads (logoLight/logoDark)
router.post("/letterhead/full", upload.single("fullPageImage"), uploadLetterheadFull);
export default router;

