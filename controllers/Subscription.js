// controllers/subscriptionController.js
import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js'; // Adjust path if necessary
import Client from '../models/Client.js'; // Assuming you have a Client model
import User from '../models/User.js'; // Assuming you have a User model for createdBy (optional)
import Activity from '../models/Activity.js';
// If NoteSchema is in a separate file, import it here:
// import NoteSchema from '../models/noteModel.js'; // Example if NoteSchema is a separate model/schema

// Helper function to calculate next billing date based on cycle and repeatEvery
const calculateNextBillingDate = (firstBillingDate, cycle, repeatEvery) => {
    const nextDate = new Date(firstBillingDate);
    switch (cycle) {
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (repeatEvery * 7));
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + repeatEvery);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + repeatEvery);
            break;
        case 'custom':
            // For custom, you'd likely define how 'custom' behaves or leave nextBilling unset/handled manually
            // For now, let's assume 'custom' means no automatic nextBilling calculation or it's set manually
            return null; // Or implement specific custom logic
        default:
            return null;
    }
    return nextDate;
};


// --- Subscription Controllers ---

/**
 * @desc Create a new subscription
 * @route POST /api/subscriptions
 * @access Private (e.g., Admin/Authenticated User)
 */
export const createSubscription = async (req, res) => {
    const { client, title, firstBilling, cycle, repeatEvery, amount, status, Notes, tax,
        secondTax, } = req.body;

    // Basic validation
    if (!client || !title || !firstBilling || !amount) {
        return res.status(400).json({ message: 'Please provide client, title, first billing date, and amount.' });
    }

    try {
        // Validate client exists
        const existingClient = await Client.findById(client);
        if (!existingClient) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        const firstBillingDate = new Date(firstBilling);
        if (isNaN(firstBillingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid first billing date.' });
        }

        const nextBilling = calculateNextBillingDate(firstBillingDate, cycle, repeatEvery);

        const createdBy = req.user?._id 

        const newSubscription = new Subscription({
            client,
            title,
            firstBilling: firstBillingDate,
            nextBilling, // Calculated or null
            cycle: cycle || 'monthly',
            repeatEvery: repeatEvery || 1,
            amount,
            status: status || 'active',
            createdBy,
            tax,
            secondTax,

        });

           if (Array.isArray(Notes) && Notes.length > 0) {
            newSubscription.Notes = Notes;
        } else {
            newSubscription.Notes = []; // Ensure 'Notes' is an empty array if no valid notes are provided
        }
        const createdSubscription = await newSubscription.save();

        await Activity.create({
            type: 'subscription_created',
            description: `Subscription created: ${title}`,
            user: req.user._id,
            client: client,
        });

        // Populate client for the response if desired
        const populatedSubscription = await Subscription.findById(createdSubscription._id).populate('client', 'name companyName');

        res.status(201).json(populatedSubscription);
    } catch (error) {
        console.error('Error creating subscription:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error while creating subscription.' });
    }
};

export const addNote = async (req, res) => {
  try {
    const { message } = req.body;
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ message: "subscription not found" });

    subscription.Notes.push({ message, date: new Date() });
    await lead.save();

    res.status(200).json({ message: "Note added successfully", lead });
  } catch (err) {
    console.error("Error adding note:", err);
    res.status(500).json({ message: err.message });
  }
};
/**
 * @desc Get all subscriptions
 * @route GET /api/subscriptions
 * @access Private (e.g., Admin/Authenticated User)
 */
export const getSubscriptions = async (req, res) => {
    try {
        // Build query for filtering
        const query = {};
        if (req.query.client) {
            query.client = req.query.client;
        }
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.title) {
            query.title = { $regex: req.query.title, $options: 'i' }; // Case-insensitive search
        }

        const subscriptions = await Subscription.find(query)
            .populate('client', 'name companyName email phone') // Populate client details
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Server error while fetching subscriptions.' });
    }
};

/**
 * @desc Get a single subscription by ID
 * @route GET /api/subscriptions/:id
 * @access Private (e.g., Admin/Authenticated User)
 */
export const updatedSubscription = async (req, res) => {
    try {
        const subscriptionBeforeUpdate = await Subscription.findById(req.params.id);
        if (!subscriptionBeforeUpdate) return res.status(404).json({ message: "Subscription not found" });

        const subscription = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });

        const changes = [];
        for (const key in req.body) {
            if (
                req.body.hasOwnProperty(key) &&
                String(subscriptionBeforeUpdate[key]) !== String(req.body[key])
            ) {
                changes.push(
                    `'${key}' from '${subscriptionBeforeUpdate[key]}' to '${req.body[key]}'`
                );
            }
        }

        if (changes.length > 0) {
            await Activity.create({
                type: 'subscription_updated',
                description: `Subscription updated: ${subscription.title} - ${changes.join(", ")}`,
                user: req.user._id,
                client: subscription.client,
            });
        }

        res.status(200).json({ message: "subscription updated", subscription });

    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Server error while updating subscription.' });
    }
};


export const getSubscriptionById = async (req, res) => {
    const subscription = await Subscription.findById(req.params.id)
        .populate('client', 'name email')
        .populate('createdBy', 'name email'); // createdBy details populate karein

    if (subscription) {
        res.status(200).json(subscription);
    } else {
        res.status(404);
        throw new Error('Subscription nahi mila');
    }
};
/**
 * @desc Delete a subscription by ID
 * @route DELETE /api/subscriptions/:id
 * @access Private (e.g., Admin/Authenticated User)
 */
export const deleteSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found.' });
        }

        const client = subscription.client; // Get client before deletion
        const title = subscription.title;

        await Subscription.deleteOne({ _id: req.params.id }); // Use deleteOne or findByIdAndDelete

        await Activity.create({
            type: 'subscription_deleted',
            description: `Subscription deleted: ${title}`,
            user: req.user._id,
            client: client,
        });

        res.status(200).json({ message: 'Subscription removed successfully.' });
    } catch (error) {
        console.error('Error deleting subscription:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid subscription ID format.' });
        }
        res.status(500).json({ message: 'Server error while deleting subscription.' });
    }
};