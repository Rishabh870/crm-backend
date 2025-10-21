import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/User.js";
import authRoutes from "./routes/Auth.js";
import leadRoutes from "./routes/Lead.js";
import taskRoutes from "./routes/Task.js";
import reportRoutes from "./routes/Report.js";
import settingRoutes from "./routes/Setting.js";
import eventRoutes from './routes/Event.js';
import quotationRoutes from "./routes/Quotation.js";
import serviceRoutes from './routes/Service.js';
import categoryRoutes from './routes/Category.js';
import clientRoutes from './routes/Client.js';
import QuotationtemplateRoutes from './routes/QuotationTemplate.js';
import ImagesRoutes from './routes/images.js';
import projectRoutes from './routes/Projects.js';
import contactPersonRoutes from './routes/ContactPerson.js';
import subscriptionRoutes from './routes/Subscription.js';
import expenseRoutes from './routes/Expense.js'
import invoiceRoutes from './routes/Invoice.js'
import activityRoutes from './routes/Activity.js'
// Load env variables
dotenv.config();

// Create app
const app = express();


app.use(cors());
app.use(express.json()); 

app.use("/uploads",express.static("uploads"));
// Routes
app.use("/api/users", userRoutes);      
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/tasks", taskRoutes);   
app.use("/api/report", reportRoutes);  
app.use("/api/setting", settingRoutes);
app.use('/api/events', eventRoutes);
app.use("/api/quotations", quotationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/template', QuotationtemplateRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/images', ImagesRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contactpersons', contactPersonRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/expenses',expenseRoutes)
app.use('/api/invoices',invoiceRoutes)
app.use('/api/activities', activityRoutes);
// Default Route


// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log("MongoDB connected");
    // Start server only after DB connects
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

});
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });
