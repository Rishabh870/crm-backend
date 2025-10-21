// controllers/contactPersonController.js
import mongoose from 'mongoose';
import ContactPerson from '../models/ContactPerson.js'; // Adjust path if necessary
import Client from '../models/Client.js'; // Assuming you have a Client model
import Activity from '../models/Activity.js';

export const createContactPerson = async (req, res) => {
    const { name, email, phone, designation, linkedClient } = req.body;

    // Basic validation
    if (!name) {
        return res.status(400).json({ message: 'Contact person name is required.' });
    }

    try {
        // Validate if linkedClient exists if provided
        if (linkedClient) {
            if (!mongoose.Types.ObjectId.isValid(linkedClient)) {
                return res.status(400).json({ message: 'Invalid client ID format for linkedClient.' });
            }
            const existingClient = await Client.findById(linkedClient);
            if (!existingClient) {
                return res.status(404).json({ message: 'Linked client not found.' });
            }
        }
 const createdBy = req.user._id; 
        const newContactPerson = new ContactPerson({
            name,
            email,
            phone,
            designation,
            linkedClient: linkedClient || null, // Store null if not provided
            createdBy
        });

        const createdContactPerson = await newContactPerson.save();

        if (linkedClient) {
            await Activity.create({
                type: 'contact_person_created',
                description: `Contact person created: ${name}`,
                user: req.user._id,
                client: linkedClient,
            });
        }

        // Populate linkedClient for the response if desired
        const populatedContactPerson = await ContactPerson.findById(createdContactPerson._id)
            .populate('linkedClient', 'name companyName email'); // Adjust fields as per your Client model

        res.status(201).json(populatedContactPerson);
    } catch (error) {
        console.error('Error creating contact person:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error while creating contact person.' });
    }
}; 
     

/**
 * @desc Get all contact persons
 * @route GET /api/contactpersons
 * @access Private (e.g., Admin/Authenticated User)
 */
export const getAllContactPersons = async (req, res) => {
    try {
        // Build query for filtering
        const query = {};
        if (req.query.linkedClient) {
            // Validate linkedClient ID if provided as a query parameter
            if (!mongoose.Types.ObjectId.isValid(req.query.linkedClient)) {
                return res.status(400).json({ message: 'Invalid linkedClient ID format.' });
            }
            query.linkedClient = req.query.linkedClient;
        }
        if (req.query.name) {
            query.name = { $regex: req.query.name, $options: 'i' }; // Case-insensitive search by name
        }
        if (req.query.email) {
            query.email = { $regex: req.query.email, $options: 'i' }; // Case-insensitive search by email
        }
        // Add more filters as needed (e.g., phone, designation)

        const contactPersons = await ContactPerson.find(query)
            .populate('linkedClient', 'name companyName email phone') // Populate client details
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json(contactPersons);
    } catch (error) {
        console.error('Error fetching contact persons:', error);
        res.status(500).json({ message: 'Server error while fetching contact persons.' });
    }
};

/**
 * @desc Get a single contact person by ID
 * @route GET /api/contactpersons/:id
 * @access Private (e.g., Admin/Authenticated User)
 */
export const getContactPersonById = async (req, res) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid contact person ID format.' });
        }

        const contactPerson = await ContactPerson.findById(req.params.id)
            .populate('linkedClient', 'name companyName email phone'); // Populate client details

        if (!contactPerson) {
            return res.status(404).json({ message: 'Contact person not found.' });
        }
        res.status(200).json(contactPerson);
    } catch (error) {
        console.error('Error fetching contact person by ID:', error);
        // CastError for invalid ObjectId format is handled by isValid check above
        res.status(500).json({ message: 'Server error while fetching contact person.' });
    }
};

/**
 * @desc Update a contact person by ID
 * @route PUT /api/contactpersons/:id
 * @access Private (e.g., Admin/Authenticated User)
 */
export const updateContactPerson = async (req, res) => {
  const { name, email, phone, designation, linkedClient } = req.body;

  try {
    const { id } = req.params;

    // 1) Validate id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid contact person ID format.' });
    }

    // 2) Load existing
    let contactPerson = await ContactPerson.findById(id);
    if (!contactPerson) {
      return res.status(404).json({ message: 'Contact person not found.' });
    }

    // 3) Keep old values for diff
    const old = {
      name: contactPerson.name,
      email: contactPerson.email,
      phone: contactPerson.phone,
      designation: contactPerson.designation,
      linkedClient: contactPerson.linkedClient,
    };

    // 4) Validate/assign linkedClient only if provided
    if (linkedClient !== undefined) {
      if (linkedClient) {
        if (!mongoose.Types.ObjectId.isValid(linkedClient)) {
          return res.status(400).json({ message: 'Invalid client ID format for linkedClient.' });
        }
        const existingClient = await Client.findById(linkedClient);
        if (!existingClient) {
          return res.status(404).json({ message: 'New linked client not found.' });
        }
        contactPerson.linkedClient = linkedClient;
      } else {
        // allow unlink
        contactPerson.linkedClient = null;
      }
    }

    // 5) Patch only provided fields
    if (name !== undefined) contactPerson.name = name;
    if (email !== undefined) contactPerson.email = email;
    if (phone !== undefined) contactPerson.phone = phone;
    if (designation !== undefined) contactPerson.designation = designation;

    // 6) Save
    const updated = await contactPerson.save();

    // 7) Activity (SAFE user id)
    const changes = [];
    if (old.name !== updated.name) changes.push(`name from '${old.name}' to '${updated.name}'`);
    if (old.email !== updated.email) changes.push(`email from '${old.email}' to '${updated.email}'`);
    if (old.phone !== updated.phone) changes.push(`phone from '${old.phone}' to '${updated.phone}'`);
    if (old.designation !== updated.designation) changes.push(`designation from '${old.designation}' to '${updated.designation}'`);
    if (String(old.linkedClient || '') !== String(updated.linkedClient || '')) {
      changes.push(
        `linked client from '${old.linkedClient || 'none'}' to '${updated.linkedClient || 'none'}'`
      );
    }

    if (changes.length > 0 && updated.linkedClient) {
      const actorId = req.user?.id || req.user?._id || updated.createdBy || null; // 👈 safe
      try {
        await Activity.create({
          type: 'contact_person_updated',
          description: `Contact person ${updated.name} updated: ${changes.join(', ')}`,
          user: actorId,
          client: updated.linkedClient, // ObjectId is fine
        });
      } catch (e) {
        console.error('Activity(contact_person_updated) failed:', e?.message);
      }
    }

    // 8) Populate and respond
    const populated = await ContactPerson.findById(updated._id)
      .populate('linkedClient', 'name companyName email')
      .populate('createdBy', 'name email');

    return res.status(200).json(populated);
  } catch (error) {
    console.error('Error updating contact person:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    return res.status(500).json({ message: 'Server error while updating contact person.' });
  }
};

/**
 * @desc Delete a contact person by ID
 * @route DELETE /api/contactpersons/:id
 * @access Private (e.g., Admin/Authenticated User)
 */
export const deleteContactPerson = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid contact person ID format.' });
    }

    const cp = await ContactPerson.findById(id);
    if (!cp) return res.status(404).json({ message: 'Contact person not found.' });

    const linkedClient = cp.linkedClient;
    const contactName = cp.name;

    await cp.deleteOne();

    if (linkedClient) {
      // ✅ Who did the delete?
      const actorId = req.user?.id || req.user?._id || cp.createdBy || null;

      try {
        await Activity.create({
          type: 'contact_person_deleted',
          description: `Contact person deleted: ${contactName}`,
          user: actorId,      // <-- yeh ab null nahi hoga agar req.user mila
          client: linkedClient,
        });
      } catch (e) {
        console.error('Activity(contact_person_deleted) failed:', e?.message);
      }
    }

    return res.status(200).json({ message: 'Contact person removed successfully.' });
  } catch (error) {
    console.error('Error deleting contact person:', error);
    return res.status(500).json({ message: 'Server error while deleting contact person.' });
  }
};