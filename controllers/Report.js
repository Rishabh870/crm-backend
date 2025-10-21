import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Task from "../models/Task.js";
import moment from 'moment'

export const getDashboardStats = async (req, res) => {
  try {

      const nonAdminUserQuery = { role: { $ne: 'admin' } }; 
    const [totalUsers, activeUsers, totalLeads, totalTasks] = await Promise.all([
      User.countDocuments(nonAdminUserQuery),
      User.countDocuments({ ...nonAdminUserQuery, isBlocked: false }),
      Lead.countDocuments(),
      Task.countDocuments()
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalLeads,
      totalTasks
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getLeadsByStatus = async (req, res) => {
  try {
    const data = await Lead.aggregate([
      {
        $group: {
          _id: "$status",       // status field: new, contacted, etc.
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Error in getLeadsByStatus:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getTasksByStatus = async (req, res) => {
  try {
    const data = await Task.aggregate([
      {
        $group: {
          _id: "$status",  // Group by status: pending, in progress, completed
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Error fetching tasks by status:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getRecentActivity = async (req, res) => {
  try {
    // Fetch recent leads
    const recentLeads = await Lead.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt");

    // Fetch recent tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title assignedTo createdAt");

    // Merge and sort by timestamp
    const activities = [
      ...recentLeads.map((lead) => ({
        action: "Lead Created",
        detail: lead.name,
        createdAt: lead.createdAt,
      })),
      ...recentTasks.map((task) => ({
        action: "Task Added",
        detail: task.title,
        createdAt: task.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(activities.slice(0, 6)); // limit to latest 6
  } catch (err) {
    console.error("Error fetching recent activity:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getSummaryReport = async (req, res) => {
  try {
    // Lead summary
    const totalLeads = await Lead.countDocuments();
    const convertedLeads = await Lead.countDocuments({ status: 'converted' });

    const startOfWeek = moment().startOf('week').toDate();
    const newLeadsThisWeek = await Lead.countDocuments({ createdAt: { $gte: startOfWeek } });

    // Task summary
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });

    // User stats
    const users = await User.find();
    const userStats = await Promise.all(
      users.map(async (user) => {
        const leadsAssigned = await Lead.countDocuments({ assignedTo: user._id });
        const leadsConverted = await Lead.countDocuments({ assignedTo: user._id, status: 'converted' });
        const tasksAssigned = await Task.countDocuments({ assignedTo: user._id });
        const tasksCompleted = await Task.countDocuments({ assignedTo: user._id, status: 'completed' });

        const conversionRate = leadsAssigned > 0 ? Math.round((leadsConverted / leadsAssigned) * 100) : 0;

        return {
          name: user.name,
          leadsAssigned,
          leadsConverted,
          tasksAssigned,
          tasksCompleted,
          conversionRate,
        };
      })
    );

    // Daily activity (last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      return date;
    }).reverse();

    const dailyStats = await Promise.all(
      last7Days.map(async (date) => {
        const start = moment(date).startOf('day').toDate();
        const end = moment(date).endOf('day').toDate();

        const newLeads = await Lead.countDocuments({ createdAt: { $gte: start, $lte: end } });
        const followUps = await Task.countDocuments({ createdAt: { $gte: start, $lte: end } });
        const conversions = await Lead.countDocuments({ status: 'converted', updatedAt: { $gte: start, $lte: end } });
        const tasksCompleted = await Task.countDocuments({ status: 'completed', updatedAt: { $gte: start, $lte: end } });

        return { date, newLeads, followUps, conversions, tasksCompleted };
      })
    );

    res.json({
      summary: {
        totalLeads,
        convertedLeads,
        newLeadsThisWeek,
        totalTasks,
        completedTasks,
      },
      userStats,
      dailyStats,
    });

  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ message: 'Failed to generate report' });
  }
};
