import Quotation from '../models/Quotation.js'; // Adjust path as per your project structure
import Setting from '../models/Setting.js';   // Adjust path as per your project structure
import Activity from '../models/Activity.js';

// @desc    Create a new quotation
// @route   POST /api/quotations/create
// @access  Private (assuming authentication middleware is used)
export const createQuotation = async (req, res) => {
    try {
        // 1. Generate the unique quotationId using the static method from your model
        const quotationId = await Quotation.generateQuotationId();

        // 2. Extract necessary data from req.body
        const {
            quotationDate,
            clientName,
            phone,
            email,
            address,
            company,
            website,
            subject,
            inquiryDate,
            contentBlocks,
            discount,
            finalCost,
            grandTotal,
            lead,
        } = req.body;

        // Fetch current agency settings to snapshot them with the quotation
        const agencySetting = await Setting.findOne(); // Assumes you only have one settings document

        // Prepare the agencySettings payload to store as a snapshot
        const agencySettingsSnapshot = agencySetting ? {
            agencyName: agencySetting.agencyName,
            tagline: agencySetting.tagline,
            emails: agencySetting.emails,
            phoneNumbers: agencySetting.phoneNumbers,
            ceoName: agencySetting.ceoName,
            ceoTitle: agencySetting.ceoTitle,
            companyLegalName: agencySetting.companyLegalName,
            logoLight: agencySetting.logoLight,
            logoDark: agencySetting.logoDark,
            quotationLogo: agencySetting.quotationLogo,
            bankAccounts: agencySetting.bankAccounts,
            // Add any other setting fields you want to snapshot
        } : {};


        // 3. Create a new Quotation instance
        const newQuotation = new Quotation({
            quotationId, // Assign the newly generated ID
            quotationDate,
            clientName,
            phone,
            email,
            address,
            company,
            website,
            subject,
            inquiryDate,
            contentBlocks,
            discount,
            finalCost,
            grandTotal,
            agencySettings: agencySettingsSnapshot, // Store the snapshot of settings
            lead,
            createdBy: req.user.id, // Make sure to use protect middleware for this to work
        });

        // 4. Save the new quotation to the database
        const savedQuotation = await newQuotation.save();

        if (lead) {
            await Activity.create({
                type: 'quotation_created',
                description: `Quotation created: ${quotationId}`,
                user: req.user?.id,
                lead: lead,
            });
        }

        res.status(201).json({
            success: true,
            message: "Quotation created successfully",
            quotation: savedQuotation,
            agencySetting: agencySetting // Optionally return current agency settings
        });

    } catch (error) {
        console.error("Error creating quotation:", error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) { // Duplicate key error (e.g., if quotationId somehow duplicates)
            return res.status(409).json({ success: false, message: 'A quotation with this ID already exists.' });
        }

        res.status(500).json({ success: false, message: 'Failed to create quotation', error: error.message });
    }
};

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
export const getAllQuotations = async (req, res) => {
    try {
        const quotations = await Quotation.find({}).populate('lead').sort({ createdAt: -1 }); // Get all, sorted by newest first
        res.status(200).json({
            success: true,
            count: quotations.length,
            quotations
        });
    } catch (error) {
        console.error("Error fetching all quotations:", error);
        res.status(500).json({ success: false, message: 'Failed to retrieve quotations', error: error.message });
    }
};

// @desc    Get single quotation by ID
// @route   GET /api/quotations/:id
// @access  Private
export const getQuotationById = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);

        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        res.status(200).json(quotation);
    } catch (error) {
        console.error("Error fetching quotation by ID:", error);
        // CastError happens if ID format is invalid
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
        }
        res.status(500).json({ success: false, message: 'Failed to retrieve quotation', error: error.message });
    }
};

// @desc    Update a quotation
// @route   PUT /api/quotations/:id
// @access  Private
export const updateQuotation = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        // Ensure quotationId is not updated from req.body, as it's meant to be immutable after creation
        delete updatedData.quotationId;

        // Add the updatedBy field
        updatedData.updatedBy = req.user.id; // Make sure to use protect middleware

        // The 'id' parameter from the URL is used to identify the document

        // Find the quotation by its _id and update it
        // { new: true } returns the modified document rather than the original.
        // { runValidators: true } ensures Mongoose validation runs on the updated fields.
        const quotation = await Quotation.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        // If the quotation is linked to a lead, create an activity for the update
        if (quotation.lead) {
            await Activity.create({
                type: 'quotation_updated',
                description: `Quotation updated: ${quotation.quotationId}`,
                user: req.user.id,
                lead: quotation.lead,
            });
        }

        res.status(200).json({
            success: true,
            message: 'Quotation updated successfully',
            quotation
        });

    } catch (error) {
        console.error('Error updating quotation:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) { // Duplicate key error
            return res.status(409).json({ success: false, message: 'A duplicate value was found for a unique field.' });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
        }

        res.status(500).json({ success: false, message: 'Failed to update quotation', error: error.message });
    }
};

// @desc    Delete a quotation
// @route   DELETE /api/quotations/:id
// @access  Private
export const deleteQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByIdAndDelete(req.params.id);

        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        res.status(200).json({ success: true, message: 'Quotation deleted successfully' });
    } catch (error) {
        console.error("Error deleting quotation:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
        }
        res.status(500).json({ success: false, message: 'Failed to delete quotation', error: error.message });
    }
};