import mongoose from "mongoose";
import Task from "../models/Task.js";
import Activity from "../models/Activity.js"; // Import Activity model

// ➕ Create Task
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      dueDate,
      priority,
      assignedTo,
      createdBy,
      client,
      project,
    } = req.body;

    const task = await Task.create({
      title,
      description,
      status,
      dueDate,
      priority,
      assignedTo,
      createdBy,
      client,
      project,
    });

    // Log activity for task creation
    await Activity.create({
      type: 'task_created',
      description: `Task created: ${task.title}`,
      user: createdBy,
      task: task._id,
      ...(task.project && { project: task.project }), // Conditionally add project
      ...(task.client && { client: task.client }),   // Conditionally add client
    });

    res.status(201).json({ message: "Task created", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🖊 Update Task
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate("client", "name companyName")
      .populate("project", "title");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Log activity for task update
    await Activity.create({
      type: 'task_updated',
      description: `Task updated: ${task.title}`,
      user: req.user.id,
      task: task._id,
      ...(task.project && { project: task.project }), // Conditionally add project
      ...(task.client && { client: task.client }),   // Conditionally add client
    });

    res.status(200).json({ message: "Task updated", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ❌ Delete Task
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Log activity for task deletion
    await Activity.create({
      type: 'task_deleted',
      description: `Task deleted: ${task.title}`,
      user: req.user.id,
      task: task._id,
      ...(task.project && { project: task.project }), // Conditionally add project
      ...(task.client && { client: task.client }),   // Conditionally add client
    });

    res.status(200).json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📋 Get Tasks (admin sees all, others see assigned/created)
export const getTasks = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let tasks;

    if (role === "admin") {
      tasks = await Task.find()
        .populate("assignedTo", "name")
        .populate("createdBy", "name")
        .populate("client", "name companyName")
        .populate("project", "title");
    } else {
      tasks = await Task.find({
        $or: [{ assignedTo: userId }, { createdBy: userId }],
      })
        .populate("assignedTo", "name")
        .populate("createdBy", "name")
        .populate("client", "name companyName")
        .populate("project", "title");
    }

    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 🔍 Get Single Task
export const getSingleTask = async (req, res) => {
  try {
    const taskId = req.params.id;

    if (!taskId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    const task = await Task.findById(taskId)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("client", "name email companyName")
      .populate("project", "title description");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Server error while fetching task" });
  }
};
export const getClientTasks = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid clientId" });
    }

    const tasks = await Task.find({ client: clientId }) // <-- field name 'client'
      .populate("project", "title")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } catch (err) {
    console.error("Error fetching client tasks:", err);
    return res.status(500).json({ message: "Server error while fetching client tasks" });
  }
};