import QuotationTemplate from '../models/QuotationTemplate.js';

// --- Placeholder for Authentication/Authorization (if needed) ---
// This is a basic example. In a real app, you'd integrate with JWT verification.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization token not provided.' });
  }
  const token = authHeader.split(' ')[1]; // Expects "Bearer TOKEN"

  // In a real application, you would verify this token using a library like jsonwebtoken
  // For demonstration, we'll just check if a token exists.
  if (token) {
    req.user = { id: 'someUserId' }; // Mock user for now
    next();
  } else {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// --- Controller Functions ---

// @route   POST /api/quotation-templates
// @desc    Create a new quotation template
// @access  Private (requires token)
export const createQuotationTemplate = async (req, res) => {
  // Authentication check (optional, but good practice if you implement verifyToken)
  // if (!req.user) {
  //   return res.status(401).json({ message: 'Not authorized.' });
  // }

  const { templateName, contentBlocks } = req.body;

  if (!templateName || !contentBlocks || contentBlocks.length === 0) {
    return res.status(400).json({ message: "Template name and at least one content block are required." });
  }

  try {
    const newTemplate = new QuotationTemplate({
      templateName,
      contentBlocks,
    });

    const savedTemplate = await newTemplate.save();
    res.status(201).json(savedTemplate);
  } catch (error) {
    // Handle unique key error for templateName
    if (error.code === 11000 && error.keyPattern && error.keyPattern.templateName) {
      return res.status(400).json({ message: "A template with this name already exists. Please choose a different name." });
    }
    console.error("Error creating quotation template:", error);
    res.status(500).json({ message: "Failed to create template.", error: error.message });
  }
};

// @route   GET /api/quotation-templates
// @desc    Get all quotation templates
// @access  Private (requires token)
export const getAllQuotationTemplates = async (req, res) => {
  // if (!req.user) {
  //   return res.status(401).json({ message: 'Not authorized.' });
  // }
  try {
    const templates = await QuotationTemplate.find({}); // Fetch all templates
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching quotation templates:", error);
    res.status(500).json({ message: "Failed to retrieve templates.", error: error.message });
  }
};

// @route   GET /api/quotation-templates/:id
// @desc    Get a single quotation template by ID
// @access  Private (requires token)
export const getQuotationTemplateById = async (req, res) => {
  // if (!req.user) {
  //   return res.status(401).json({ message: 'Not authorized.' });
  // }
  try {
    const template = await QuotationTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Quotation template not found." });
    }
    res.status(200).json(template);
  } catch (error) {
    console.error("Error fetching quotation template by ID:", error);
    res.status(500).json({ message: "Failed to retrieve template.", error: error.message });
  }
};

// @route   PUT /api/quotation-templates/:id
// @desc    Update a quotation template by ID
// @access  Private (requires token)
export const updateQuotationTemplate = async (req, res) => {
  // if (!req.user) {
  //   return res.status(401).json({ message: 'Not authorized.' });
  // }
  const { templateName, contentBlocks } = req.body;
  const { id } = req.params;

  if (!templateName || !contentBlocks || contentBlocks.length === 0) {
    return res.status(400).json({ message: "Template name and at least one content block are required." });
  }

  try {
    const existingTemplate = await QuotationTemplate.findById(id);
    if (!existingTemplate) {
      return res.status(404).json({ message: "Quotation template not found." });
    }

    // Check for unique name conflict if templateName is changed
    if (templateName !== existingTemplate.templateName) {
      const nameConflict = await QuotationTemplate.findOne({ templateName });
      if (nameConflict && String(nameConflict._id) !== id) { // Ensure it's not the current template itself
        return res.status(400).json({ message: "A template with this name already exists. Please choose a different name." });
      }
    }

    const updatedTemplate = await QuotationTemplate.findByIdAndUpdate(
      id,
      { templateName, contentBlocks },
      { new: true, runValidators: true } // `new: true` returns the updated document; `runValidators: true` runs schema validators
    );

    res.status(200).json(updatedTemplate);
  } catch (error) {
    console.error("Error updating quotation template:", error);
    res.status(500).json({ message: "Failed to update template.", error: error.message });
  }
};

// @route   DELETE /api/quotation-templates/:id
// @desc    Delete a quotation template by ID
// @access  Private (requires token)
export const deleteQuotationTemplate = async (req, res) => {
  // if (!req.user) {
  //   return res.status(401).json({ message: 'Not authorized.' });
  // }
  try {
    const deletedTemplate = await QuotationTemplate.findByIdAndDelete(req.params.id);
    if (!deletedTemplate) {
      return res.status(404).json({ message: "Quotation template not found." });
    }
    res.status(200).json({ message: "Quotation template deleted successfully." });
  } catch (error) {
    console.error("Error deleting quotation template:", error);
    res.status(500).json({ message: "Failed to delete template.", error: error.message });
  }
};

