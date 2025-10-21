import User from "../models/User.js";



export const createUserByAdmin = async (req, res) => { // Corrected: export const
    const { name, email, phone, address, password, role } = req.body;

    if (!['sales', 'support','manager'].includes(role)) {
        return res.status(400).json({ message: "Only Sales or Support roles can be created via this endpoint." });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "User already exists with this email." });
        }

        const user = await User.create({
            name,
            email,
            phone,
            address,
            password,
            role,
        });

        res.status(201).json({ message: "User created successfully by Admin.", userId: user._id });
    } catch (err) {
        console.error("Create User by Admin Error:", err);
        res.status(500).json({ message: "Server error creating user by admin.", error: err.message });
    }
};
export const createTeamMember = async (req, res) => {
    const { name, email, phone, address, password, teamsubrole } = req.body;

    // Enforce 'team' role for this specific endpoint
    const role = 'team';

    // teamsubrole is required for team members
    if (!teamsubrole) {
        return res.status(400).json({ message: "Team member must have a sub-role (Developer, GraphicDesigner, SEO)." });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "A user with this email already exists." });
        }

        const teamMember = await User.create({
            name,
            email,
            phone,
            address,
            password,
            role, // role is explicitly 'team'
            teamsubrole,
        });

        res.status(201).json({ message: "Team member created successfully.", userId: teamMember._id });
    } catch (err) {
        console.error("Create Team Member Error:", err);
        res.status(500).json({ message: "Server error creating team member.", error: err.message });
    }
};
export const getTeamMembers = async (req, res) => {
    try {
        // Find users with role 'team' and exclude password
        const teamMembers = await User.find({ role: 'team' }).select("-password");
        res.json(teamMembers);
    } catch (err) {
        console.error("Get Team Members Error:", err);
        res.status(500).json({ message: "Server error fetching team members.", error: err.message });
    }
};
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email,address } = req.body;


    const image = req.file ? req.file.path : null; 

    
    const updateFields = {
      name, phone, email ,address
    };
    if (image) {
      updateFields.image = image;
    }


    const updatedUser = await User.findByIdAndUpdate(id, updateFields, { new: true });

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};


export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
