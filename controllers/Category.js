// controllers/categoryController.js

import Category from '../models/Category.js'; // Notice the .js extension for local imports
import mongoose from 'mongoose';

/**
 * @typedef {Object} AuthenticatedRequest
 * @property {object} user - The authenticated user object, typically containing `_id`.
 * @extends {express.Request}
 */

/**
 * Helper function for sending consistent error responses.
 * @param {express.Response} res - The Express response object.
 * @param {number} statusCode - The HTTP status code for the error.
 * @param {string} message - The error message.
 * @returns {express.Response} - The Express response object.
 */
const sendErrorResponse = (res, statusCode, message) => {
    return res.status(statusCode).json({ success: false, message });
};

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 */
export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        sendErrorResponse(res, 500, 'Server error while fetching categories.');
    }
};

/**
 * @desc    Get single category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 */
export const getCategoryById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return sendErrorResponse(res, 400, 'Invalid category ID format.');
        }

        const category = await Category.findById(req.params.id);

        if (!category) {
            return sendErrorResponse(res, 404, 'Category not found.');
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error fetching category by ID:', error);
        sendErrorResponse(res, 500, 'Server error while fetching category.');
    }
};

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private (requires authentication middleware attaching `req.user`)
 * @param {AuthenticatedRequest} req - The Express request object with authenticated user.
 * @param {express.Response} res - The Express response object.
 */
export const createCategory = async (req, res) => {
    const { name, description } = req.body;

    // Check if req.user exists (from authentication middleware)
    if (!req.user || !req.user._id) {
        return sendErrorResponse(res, 401, 'Not authorized, user not found.');
    }

    // Basic validation
    if (!name || name.trim() === '') {
        return sendErrorResponse(res, 400, 'Category name is required.');
    }

    try {
        // Check if category with the same name already exists (case-insensitive for better UX)
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
        if (existingCategory) {
            return sendErrorResponse(res, 409, 'Category with this name already exists.');
        }

        const newCategory = new Category({
            name: name.trim(),
            description: description ? description.trim() : '',
            createdBy: req.user._id // Assign the ID of the authenticated user
        });

        const category = await newCategory.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            data: category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, messages.join(', '));
        }
        sendErrorResponse(res, 500, 'Server error while creating category.');
    }
};

/**
 * @desc    Update a category by ID
 * @route   PUT /api/categories/:id
 * @access  Private (requires authentication and optional ownership/admin role check)
 * @param {AuthenticatedRequest} req - The Express request object with authenticated user.
 * @param {express.Response} res - The Express response object.
 */
export const updateCategory = async (req, res) => {
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return sendErrorResponse(res, 400, 'Invalid category ID format.');
    }

    if (!req.user || !req.user._id) {
        return sendErrorResponse(res, 401, 'Not authorized, user not found.');
    }

    try {
        let category = await Category.findById(req.params.id);

        if (!category) {
            return sendErrorResponse(res, 404, 'Category not found.');
        }

        // --- Optional Authorization Check ---
        // Uncomment and adapt if you want only the creator or an admin to update
        /*
        if (category.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return sendErrorResponse(res, 403, 'Not authorized to update this category.');
        }
        */

        // Check for duplicate name if name is being updated and it's different from current
        if (name && name.trim() !== category.name) {
            const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
            if (existingCategory && existingCategory._id.toString() !== req.params.id) {
                return sendErrorResponse(res, 409, 'Another category with this name already exists.');
            }
        }

        // Only update fields that are provided in the request body
        if (name !== undefined) {
            category.name = name.trim();
        }
        if (description !== undefined) {
            category.description = description.trim();
        }

        const updatedCategory = await category.save(); // .save() triggers pre/post hooks and validation

        res.status(200).json({
            success: true,
            message: 'Category updated successfully.',
            data: updatedCategory
        });
    } catch (error) {
        console.error('Error updating category:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, messages.join(', '));
        }
        sendErrorResponse(res, 500, 'Server error while updating category.');
    }
};

/**
 * @desc    Delete a category by ID
 * @route   DELETE /api/categories/:id
 * @access  Private (requires authentication and optional ownership/admin role check)
 * @param {AuthenticatedRequest} req - The Express request object with authenticated user.
 * @param {express.Response} res - The Express response object.
 */
export const deleteCategory = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return sendErrorResponse(res, 400, 'Invalid category ID format.');
    }

    if (!req.user || !req.user._id) {
        return sendErrorResponse(res, 401, 'Not authorized, user not found.');
    }

    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return sendErrorResponse(res, 404, 'Category not found.');
        }

        // --- Optional Authorization Check ---
        // Uncomment and adapt if you want only the creator or an admin to delete
        /*
        if (category.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return sendErrorResponse(res, 403, 'Not authorized to delete this category.');
        }
        */

        await Category.deleteOne({ _id: req.params.id }); // Using deleteOne for Mongoose 6+

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        sendErrorResponse(res, 500, 'Server error while deleting category.');
    }
};