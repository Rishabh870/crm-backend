// Example: routes/quotationTemplateRoutes.js
import express from 'express';
import {
  createQuotationTemplate,
  getAllQuotationTemplates,
  getQuotationTemplateById,
  updateQuotationTemplate,
  deleteQuotationTemplate,
  // Add verifyToken if you implement authentication
} from '../controllers/QuotationTemplate.js';

const router = express.Router();

// You would add `verifyToken` middleware here if you implement authentication
// For example: router.post('/', verifyToken, createQuotationTemplate);

router.post('/', createQuotationTemplate);
router.get('/', getAllQuotationTemplates);
router.get('/:id', getQuotationTemplateById);
router.put('/:id', updateQuotationTemplate);
router.delete('/:id', deleteQuotationTemplate);

export default router;