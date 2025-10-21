import Activity from "../models/Activity.js";

// Get all activities for a specific lead
export const getActivitiesByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const activities = await Activity.find({ lead: leadId }).populate(
      "user",
      "name"
    );
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all activities for a specific client
export const getActivitiesByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const activities = await Activity.find({ client: clientId }).populate(
      "user",
      "name email"
    );
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getActivitiesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const activities = await Activity.find({ project: projectId }).populate(
      "user",
      "name email"
    );
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
