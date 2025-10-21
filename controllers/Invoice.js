import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js'; // <= VERIFY THIS PATH
import Project from "../models/Projects.js"
import User from '../models/User.js';     // <= VERIFY THIS PATH
import Activity from '../models/Activity.js';
// Helper function to calculate subtotal and total amount
const calculateInvoiceTotals = (items, taxPercentage, secondTaxPercentage) => {
    let subtotal = 0;
    // Calculate total for each item and sum up subtotal
    const processedItems = items.map(item => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        subtotal += itemTotal;
        return {
            ...item,
            total: itemTotal // Ensure 'total' is set for each item
        };
    });

    const taxAmount1 = subtotal * (taxPercentage / 100);
    const taxAmount2 = subtotal * (secondTaxPercentage / 100);
    const totalAmount = subtotal + taxAmount1 + taxAmount2;

    return { subtotal, totalAmount, processedItems };
};

/**
 * @desc Create a new invoice
 * @route POST /api/invoices
 * @access Private/Admin
 */
export const createInvoice = async (req, res) => {
  const {
    invoiceNumber,
    client,
    project,
    issueDate,
    dueDate,
    items, // optional now
    tax = 0,
    secondTax = 0,
    notes,
    status = 'unpaid',
    createdBy,
  } = req.body;

  if (!invoiceNumber || !client || !issueDate || !dueDate || !createdBy) {
    return res.status(400).json({
      message:
        'Missing required fields: invoiceNumber, client, issueDate, dueDate, createdBy.',
    });
  }

  try {
    // Ensure invoice number is unique
    const existingInvoice = await Invoice.findOne({ invoiceNumber });
    if (existingInvoice) {
      return res.status(400).json({ message: 'Invoice number already exists.' });
    }

    // Validate client
    const clientDoc = await Client.findById(client).populate('services.service');
    if (!clientDoc) return res.status(404).json({ message: 'Client not found.' });

    // Validate project
    if (project) {
      const projectExists = await Project.findById(project);
      if (!projectExists) return res.status(404).json({ message: 'Project not found.' });
    }

    // Validate createdBy
    const createdByUser = await User.findById(createdBy);
    if (!createdByUser)
      return res.status(404).json({ message: 'Created By user not found.' });

    // Build invoice items
    let invoiceItems = [];

    if (items && items.length > 0) {
      // Use provided items
      invoiceItems = items.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice - (item.discount || 0),
      }));
    } else {
      // Auto-generate from client.services
      invoiceItems = clientDoc.services.map((s) => {
        const total = s.quantity * s.unitPrice - (s.discount || 0);
        return {
          service: s.service?._id,
          description: s.service?.name || 'Service',
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          discount: s.discount || 0,
          total,
        };
      });
    }

    // Calculate totals
    const subtotal = invoiceItems.reduce((sum, i) => sum + i.total, 0);
    const taxAmount1 = subtotal * (tax / 100);
    const taxAmount2 = subtotal * (secondTax / 100);
    const totalAmount = subtotal + taxAmount1 + taxAmount2;

    // Create invoice
    const newInvoice = await Invoice.create({
      invoiceNumber,
      client,
      project: project || null,
      issueDate,
      dueDate,
      items: invoiceItems,
      subtotal,
      tax,
      secondTax,
      totalAmount,
      notes,
      status,
      createdBy,
    });

    await Activity.create({
      type: 'invoice_created',
      description: `Invoice created: ${invoiceNumber}`,
      user: createdBy,
      client: client,
    });

    // Populate for response
    const populatedInvoice = await Invoice.findById(newInvoice._id)
      .populate('client', 'name companyName phone address email')
      .populate('project', 'title')
      .populate('createdBy', 'name email')
      .populate('items.service', 'name price');

    res
      .status(201)
      .json({ message: 'Invoice created successfully!', invoice: populatedInvoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res
      .status(500)
      .json({ message: 'Server error creating invoice.', error: error.message });
  }
};


/**
 * @desc Get all invoices
 * @route GET /api/invoices
 * @access Private/Admin/Client (depending on authorization)
 */
export const getAllInvoices = async (req, res) => {
    try {
        // Filter invoices based on user role (if needed, this would be in middleware)
        let query = {};
        // Example: If a client is logged in, only show their invoices
        // if (req.user.role === 'client') {
        //     query.client = req.user.client_id; // Assuming client user has a client_id linked to their company
        // }

        const invoices = await Invoice.find(query)
            .populate('client', 'name companyName phone address email')
            .populate('project', 'title')
            .populate('createdBy', 'name email')
            .sort({ issueDate: -1 }); // Sort by newest first

        res.status(200).json(invoices);
    } catch (err) {
        console.error('Error fetching all invoices:', err);
        res.status(500).json({ message: 'Server error fetching invoices.', error: err.message });
    }
};

/**
 * @desc Get a single invoice by ID
 * @route GET /api/invoices/:id
 * @access Private/Admin/Client
 */
export const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findById(id)
            .populate('client', 'name companyName  phone address email')
            .populate('project', 'title')
            .populate('createdBy', 'name email');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        // Optional: Add authorization check here if only specific users can view this invoice
        // if (req.user.role === 'client' && invoice.client._id.toString() !== req.user.client_id.toString()) {
        //     return res.status(403).json({ message: 'Not authorized to view this invoice.' });
        // }

        res.status(200).json(invoice);
    } catch (error) {
        console.error('Error fetching invoice by ID:', error);
        res.status(500).json({ message: 'Server error fetching invoice.', error: error.message });
    }
};

/**
 * @desc Update an existing invoice
 * @route PUT /api/invoices/:id
 * @access Private/Admin
 */
export const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const {
    invoiceNumber,
    client,
    project,
    issueDate,
    dueDate,
    items, // optional
    tax,
    secondTax,
    notes,
    status,
    createdBy,
  } = req.body;

  try {
    const invoiceToUpdate = await Invoice.findById(id);
    if (!invoiceToUpdate) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    // If invoiceNumber changes, check uniqueness
    if (invoiceNumber && invoiceNumber !== invoiceToUpdate.invoiceNumber) {
      const existing = await Invoice.findOne({ invoiceNumber });
      if (existing) {
        return res.status(400).json({ message: 'Invoice number already exists.' });
      }
    }

    // Validate client if updated
    let clientDoc = null;
    if (client) {
      clientDoc = await Client.findById(client).populate('services.service');
      if (!clientDoc) return res.status(404).json({ message: 'Client not found.' });
    }

    if (project && !(await Project.findById(project))) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (createdBy && !(await User.findById(createdBy))) {
      return res.status(404).json({ message: 'Created By user not found.' });
    }

    // ------------------ Build final items ------------------
    let finalItems = [];

    if (items && items.length > 0) {
      // Use items provided in request
      finalItems = items.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice - (item.discount || 0),
      }));
    } else if (client && client.toString() !== invoiceToUpdate.client.toString()) {
      // If client changed & no items provided → pull from client.services
      finalItems = clientDoc.services.map((s) => {
        const total = s.quantity * s.unitPrice - (s.discount || 0);
        return {
          service: s.service?._id,
          description: s.service?.name || 'Service',
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          discount: s.discount || 0,
          total,
        };
      });
    } else {
      // Keep old items
      finalItems = invoiceToUpdate.items;
    }

    // ------------------ Totals ------------------
    const subtotal = finalItems.reduce((sum, i) => sum + i.total, 0);
    const finalTax = tax !== undefined ? tax : invoiceToUpdate.tax;
    const finalSecondTax =
      secondTax !== undefined ? secondTax : invoiceToUpdate.secondTax;

    const taxAmount1 = subtotal * (finalTax / 100);
    const taxAmount2 = subtotal * (finalSecondTax / 100);
    const totalAmount = subtotal + taxAmount1 + taxAmount2;

    // ------------------ Update ------------------
    const updateData = {
      invoiceNumber,
      client,
      project: project === undefined ? invoiceToUpdate.project : project,
      issueDate,
      dueDate,
      items: finalItems,
      subtotal,
      tax: finalTax,
      secondTax: finalSecondTax,
      totalAmount,
      notes,
      status,
      createdBy,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('client', 'name companyName')
      .populate('project', 'title')
      .populate('createdBy', 'name email')
      .populate('items.service', 'name price');

    await Activity.create({
      type: 'invoice_updated',
      description: `Invoice updated: ${updatedInvoice.invoiceNumber}`,
      user: req.user._id,
      client: updatedInvoice.client,
    });

    res
      .status(200)
      .json({ message: 'Invoice updated successfully!', invoice: updatedInvoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    res
      .status(500)
      .json({ message: 'Server error updating invoice.', error: error.message });
  }
};


/**
 * @desc Delete an invoice
 * @route DELETE /api/invoices/:id
 * @access Private/Admin
 */
export const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedInvoice = await Invoice.findByIdAndDelete(id);

        if (!deletedInvoice) {
            return res.status(404).json({ message: 'Invoice not found.' });
        }

        await Activity.create({
            type: 'invoice_deleted',
            description: `Invoice deleted: ${deletedInvoice.invoiceNumber}`,
            user: req.user._id,
            client: deletedInvoice.client,
        });

        res.status(200).json({ message: 'Invoice deleted successfully!' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ message: 'Server error deleting invoice.', error: error.message });
    }
};
