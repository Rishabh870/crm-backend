import express from "express";
import {
  createQuotation,
  getAllQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation
} from "../controllers/Quotation.js";
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/create", protect, createQuotation);

router.get("/all", getAllQuotations);

router.get("/single/:id", getQuotationById);

router.put("/update/:id", protect, updateQuotation);

router.delete("/delete/:id", deleteQuotation);

export default router;

