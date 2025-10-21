import Service from '../models/Service.js';

// CREATE service
export const createService = async (req, res) => {
   try {
   const { name, description, price, category, createdBy } = req.body;
        

        // Your Mongoose/Database logic to save the service
        const newService = new Service({
            name,
            description,
            price,
            category,
            createdBy,
            image: req.file ? req.file.path : null
        });
        await newService.save();
        res.status(201).json(newService);

    } catch (error) {
        console.error("Backend error creating service:", error);
        res.status(500).json({ message: "Failed to create service", error: error.message });
    }
};

// GET all services
export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().populate('category').populate('createdBy');
    res.status(200).json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET service by ID
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('category').populate('createdBy');
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.status(200).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE service
export const updateService = async (req, res) => {
 try {
    const { id } = req.params;
    const { name, description, price, category} = req.body;


    const image = req.file ? req.file.path : null; // Extract new image path if provided

    // Build the update object dynamically
    const updateFields = {
      name, description, price, category
    };
    if (image) {
      updateFields.image = image;
    }


    const updatedService = await Service.findByIdAndUpdate(id, updateFields, { new: true });

    res.status(200).json({ message: 'service updated successfully', user: updatedService });
  } catch (error) {
    console.error('Error updating servic:', error);
    res.status(500).json({ message: 'Error updating service', error: error.message });
  }
};

// DELETE service
export const deleteService = async (req, res) => {
  try {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Service not found' });
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
