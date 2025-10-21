// controllers/Projects.js  (ESM)
// Make sure "type": "module" hai package.json me

import Project from "../models/Projects.js";
import Client from "../models/Client.js";       // optional, populate ke liye
import Activity from "../models/Activity.js";  // <- REQUIRED if you log project_* activities
import Task from "../models/Task.js"; // Import Task model
import fs from 'fs/promises';
import path from 'path';

// Small async wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @desc   Create a project
 * @route  POST /api/projects
 * @access Private
 */
export const createProject = asyncHandler(async (req, res) => {
  const {
    client,
    title,
    price,
    startDate,
    endDate,
    status,
    priority,
    labels,
    assignedTo,
    projectType, // "Client" | "Internal" | etc.
  } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title field is required." });
  }

  // If projectType = Client, validate client id
  if (projectType === "Client") {
    if (!client) {
      return res
        .status(400)
        .json({ message: "Client is required for 'Client' projects." });
    }
    const existingClient = await Client.findById(client);
    if (!existingClient) {
      return res
        .status(404)
        .json({ message: "Invalid client ID. Client not found." });
    }
  }

  const createdBy = req.user?._id;

  // Create
  const created = await Project.create({
    client: projectType === "Client" ? client : null,
    title,
    price,
    startDate,
    endDate,
    status,
    priority,
    createdBy,
    assignedTo,
    labels,
    projectType,
  });

  // Activity log (optional)
  if (projectType === "Client" && client) {
    try {
      await Activity.create({
        type: "project_created", // <-- ensure enum includes this
        description: `Project created: ${title}`,
        user: createdBy,
        client,
      });
    } catch (e) {
      // Don't fail request if logging fails
      console.error("Activity(project_created) failed:", e?.message);
    }
  }

  // Populate for response
  const newProject = await Project.findById(created._id)
    .populate("client", "name companyName email")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  return res
    .status(201)
    .json({ message: "Project successfully banaya gaya", newProject });
});

/**
 * @desc   GET all projects or by client
 * @route  GET /api/projects
 * @route  GET /api/clients/:clientId/projects
 * @access Private
 */
export const getAllProjects = asyncHandler(async (req, res) => {
 

  
  const projects = await Project.find()
      .populate("client", "name companyName email")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 });

  return res.status(200).json(projects);
});

/**
 * @desc   GET project by id
 * @route  GET /api/projects/:id
 * @access Private
 */
export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("client", "name companyName email")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  if (!project) return res.status(404).json({ message: "Project nahi mila" });
  return res.status(200).json(project);
});

/**
 * @desc   Update project
 * @route  PUT /api/projects/:id
 * @access Private
 */
export const updateProject = asyncHandler(async (req, res) => {
  const before = await Project.findById(req.params.id);
  if (!before) return res.status(404).json({ message: "Project not found" });

  const updatedData = { ...req.body, updatedBy: req.user?._id }; // Add updatedBy

  const project = await Project.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
  })
    .populate("client", "name companyName email")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  // Activity only for Client-type projects
  if (project?.projectType === "Client" && project.client) {
    const changes = [];
    for (const key of Object.keys(req.body)) {
      // stringify for simple diff (works for scalars/ids)
      const oldVal = before?.[key];
      const newVal = req.body[key];
      if (String(oldVal) !== String(newVal)) {
        changes.push(`'${key}' from '${oldVal}' to '${newVal}'`);
      }
    }

    if (changes.length) {
      try {
        await Activity.create({
          type: "project_updated", // <-- ensure enum includes this
          description: `Project updated: ${changes.join(", ")}`,
          user: req.user?._id,
          client: project.client,
        });
      } catch (e) {
        console.error("Activity(project_updated) failed:", e?.message);
      }
    }
  }

  return res.status(200).json({ message: "Project updated", project });
});

/**
 * @desc   Delete project
 * @route  DELETE /api/projects/:id
 * @access Private
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project nahi mila" });

  if (project.projectType === "Client" && project.client) {
    try {
      await Activity.create({
        type: "project_deleted", // <-- ensure enum includes this
        description: `Project deleted: ${project.title}`,
        user: req.user?._id,
        client: project.client,
      });
    } catch (e) {
      console.error("Activity(project_deleted) failed:", e?.message);
    }
  }

  await project.deleteOne(); // (remove() deprecated)
  return res
    .status(200)
    .json({ message: "Project successfully delete kiya gaya" });
});

export const addProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "No files uploaded" });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const docs = files.map(f => ({
      originalName: f.originalname,
      storedName: f.filename,
      path: f.path,
      url: `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
      mimeType: f.mimetype,
      size: f.size,
      uploadedBy: req.user?.id,
    }));

    project.files.push(...docs);
    await project.save();

    const fileNames = files.map(f => f.originalname).join(', ');
    await Activity.create({
      type: 'file_added',
      description: `Files added to project: ${fileNames}`,
      user: req.user?.id,
      project: project._id,
      client: project.client, // Link to client if project is client-specific
    });

    const populated = await Project.findById(id)
      .select("files")
      .populate("files.uploadedBy", "name email");

    const added = populated.files.slice(-docs.length);
    return res.status(201).json({ message: "Files added", files: added });
  } catch (err) {
    console.error("❌ addProjectFiles error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const listProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      search = "",
      page = 1,
      limit = 10,
      sort = "uploadedAt:desc",
    } = req.query;

    const project = await Project.findById(id)
      .populate("files.uploadedBy", "name email");
    if (!project) return res.status(404).json({ message: "Project not found" });

    let files = project.files || [];

    if (search) {
      const q = String(search).toLowerCase();
      files = files.filter(f => f.originalName?.toLowerCase().includes(q));
    }

    const [fieldRaw, dirRaw] = String(sort).split(":");
    const field = ["originalName","uploadedAt","size"].includes(fieldRaw) ? fieldRaw : "uploadedAt";
    const dir = dirRaw === "asc" ? 1 : -1;
    files.sort((a,b) => {
      const av = a[field]; const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (field === "originalName") return dir * String(av).localeCompare(String(bv));
      return dir * ((new Date(av)).getTime() - (new Date(bv)).getTime());
    });

    const p = Math.max(1, parseInt(page,10) || 1);
    const l = Math.max(1, parseInt(limit,10) || 10);
    const total = files.length;
    const start = (p-1)*l;
    const data = files.slice(start, start+l);

    return res.json({ files: data, total, page: p, limit: l });
  } catch (err) {
    console.error("❌ listProjectFiles error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteProjectFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const file = project.files.id(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    try {
      if (file.path) {
        const abs = path.isAbsolute(file.path) ? file.path : path.resolve(file.path);
        await fs.unlink(abs);
      }
    } catch (e) {
      // ignore: file might already be gone
    }

    const fileName = file.originalName;

    await file.deleteOne();
    await project.save();

    await Activity.create({
      type: 'file_deleted',
      description: `File deleted from project: ${fileName}`,
      user: req.user?.id,
      project: project._id,
      client: project.client, // Link to client if project is client-specific
    });

    return res.json({ message: "File deleted" });
  } catch (err) {
    console.error("❌ deleteProjectFile error:", err);
    return res.status(500).json({ message: err.message });
  }
};
export const getProjectsByClientId = async (req, res) => {
    const { clientId } = req.params;

    try {
        const projects = await Project.find({
            client: clientId,
            projectType: "Client" // ✅ Only fetch client-related projects
        })
            .populate("createdBy", "name email")
            .populate("assignedTo", "name email");

        res.status(200).json(projects);
    } catch (error) {
        console.error("Error fetching projects for client:", error);
        res.status(500).json({ message: "Projects fetch karne mein error hua." });
    }
};

export const getProjectTasks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tasks = await Task.find({ project: id })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("client", "name companyName email")
    .sort({ createdAt: -1 });

  if (!tasks) return res.status(404).json({ message: "Tasks not found for this project" });

  return res.status(200).json(tasks);
});




/**
 * @desc   Add a note to a project
 * @route  POST /api/projects/:id/notes
 * @access Private
 */
export const addProjectNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Note message is required." });
  }

  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const newNote = {
    message,
    addedBy: req.user?._id,
    date: new Date(),
  };

  project.Notes.push(newNote);
  await project.save();

  // Populate the addedBy field for the response
  const addedNote = project.Notes[project.Notes.length - 1];
  await Project.populate(addedNote, { path: 'addedBy', select: 'name email' });

  // Activity log
  if (project.projectType === "Client" && project.client) {
    try {
      await Activity.create({
        type: "project_note_added",
        description: `Note added to project: "${message}"`,
        user: req.user?._id,
        project: project._id,
        client: project.client,
      });
    } catch (e) {
      console.error("Activity(project_note_added) failed:", e?.message);
    }
  }

  return res.status(201).json({ message: "Note added successfully", newNote: addedNote });
});

/**
 * @desc   Get notes for a project
 * @route  GET /api/projects/:id/notes
 * @access Private
 */
export const getProjectNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .select("Notes")
    .populate("Notes.addedBy", "name email");

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  return res.status(200).json(project.Notes);
});

/**
 * @desc   Get projects by client id
 * @route  GET /api/clients/:clientId/projects
 * @access Private
 */

/**
 * @desc   Get total number of projects
 * @route  GET /api/projects/total
 * @access Private
 */
export const getTotalProjects = asyncHandler(async (req, res) => {
  const totalProjects = await Project.countDocuments();
  return res.status(200).json({ totalProjects });
});
