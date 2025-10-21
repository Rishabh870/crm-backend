import Expense  from "../models/Expense.js"
import User from "../models/User.js"
import Activity from '../models/Activity.js';
export const createExpense = async(req,res)=>{

try{
    const {
        title,amount,category,client,project,description,date,teamMember
    }=req.body;

    const createdBy=req.user?._id;
    const expenseData = {
      title,amount,category,client,project,description,date,createdBy,teamMember
    }
    const createExpense = await Expense.create(expenseData)

    if (client) {
        await Activity.create({
            type: 'expense_created',
            description: `Expense created: ${title} - ${amount}`,
            user: createdBy,
            client: client,
        });
    }

    res.status(200).json({message:"Expence Created!",createExpense})
}catch(err){

}

}

export const getAllExpenses = async (req, res) => {
    try {
        // Populate related fields to get full details instead of just IDs
        const expenses = await Expense.find()
            .populate('client', 'name companyName') // Populate client's name and companyName
            .populate('project', 'title')         // Populate project's title
            .populate('createdBy', 'name');       // Populate createdBy user's name

        res.status(200).json(expenses);
    } catch (err) {
        console.error("Get All Expenses Error:", err);
        res.status(500).json({ message: "Server error fetching expenses.", error: err.message });
    }
};

/**
 * @desc Get a single expense by ID
 * @route GET /api/expenses/:id
 * @access Private
 */
export const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findById(id)
            .populate('client', 'name companyName')
            .populate('project', 'title')
            .populate('createdBy', 'name');

        if (!expense) {
            return res.status(404).json({ message: "Expense not found." });
        }
        res.status(200).json(expense);
    } catch (err) {
        console.error("Get Expense By ID Error:", err);
        res.status(500).json({ message: "Server error fetching expense by ID.", error: err.message });
    }
};
export const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            amount,
            category,
            client,
            project,
            description,
            date,
            createdBy
        } = req.body;

        const updateFields = {
            title,
            amount: parseFloat(amount),
            category,
            description,
            date,
            createdBy,
            client: client || null,
            project: project || null,
        };

        // Validation for amount if it's being updated
        if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
            return res.status(400).json({ message: "Amount must be a positive number." });
        }

        // Validation for createdBy if it's being updated
        if (createdBy !== undefined) {
            const creatorExists = await User.findById(createdBy);
            if (!creatorExists) {
                return res.status(400).json({ message: "Invalid 'Created By' user ID provided for update." });
            }
        }

        // Optionally validate client and project IDs if provided and changed
        if (client !== undefined && client !== null) {
            const clientExists = await Client.findById(client);
            if (!clientExists) {
                return res.status(400).json({ message: "Invalid client ID provided for update." });
            }
        }
        if (project !== undefined && project !== null) {
            const projectExists = await Project.findById(project);
            if (!projectExists) {
                return res.status(400).json({ message: "Invalid project ID provided for update." });
            }
        }


        // `new: true` returns the updated document
        // `runValidators: true` ensures that schema validators run on update
        const updatedExpense = await Expense.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });

        if (!updatedExpense) {
            return res.status(404).json({ message: "Expense not found." });
        }

        if (updatedExpense.client) {
            await Activity.create({
                type: 'expense_updated',
                description: `Expense updated: ${updatedExpense.title} - ${updatedExpense.amount}`,
                user: req.user._id,
                client: updatedExpense.client,
            });
        }

        res.status(200).json({ message: "Expense updated successfully!", expense: updatedExpense });
    } catch (err) {
        console.error("Update Expense Error:", err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(el => el.message);
            return res.status(400).json({ message: errors.join(', ') });
        }
        res.status(500).json({ message: "Server error updating expense.", error: err.message });
    }
};

/**
 * @desc Delete an expense
 * @route DELETE /api/expenses/:id
 * @access Private
 */
export const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedExpense = await Expense.findByIdAndDelete(id);

        if (!deletedExpense) {
            return res.status(404).json({ message: "Expense not found." });
        }

        if (deletedExpense.client) {
            await Activity.create({
                type: 'expense_deleted',
                description: `Expense deleted: ${deletedExpense.title} - ${deletedExpense.amount}`,
                user: req.user._id,
                client: deletedExpense.client,
            });
        }

        res.status(200).json({ message: "Expense deleted successfully!" });
    } catch (err) {
        console.error("Delete Expense Error:", err);
        res.status(500).json({ message: "Server error deleting expense.", error: err.message });
    }
};
