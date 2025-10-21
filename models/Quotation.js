// import mongoose from "mongoose";

// // The RowSchema now becomes an array of values, as columns are dynamic.
// // We'll store row data as an array of strings.
// const DynamicTableRowSchema = new mongoose.Schema({
//   values: [{ type: String }] // Array of strings for each cell in the row
// }, { _id: false });

// // SectionSchema now includes dynamic headers
// const SectionSchema = new mongoose.Schema({
//   title: { type: String },
//   // Headers will be stored as an array of strings, representing column names
//   headers: [{ type: String }], // e.g., ["S.N.", "Particulars", "Total", "Notes"]
//   rows: [DynamicTableRowSchema] // Use the new dynamic row schema
// }, { _id: false });

// // Existing schema for 'WHY WEBITOF?' features
// const WhyWebitofFeatureSchema = new mongoose.Schema({
//   feature: { type: String, required: true },
//   others: { type: String, required: true },
//   webitof: { type: String, required: true }
// }, { _id: false });

// // Existing schema for Bank Account Information
// // This schema will now be used *inside* AgencySettingSnapshotSchema as an array
// const BankAccountSchema = new mongoose.Schema({
//   bankName: { type: String },
//   accountNumber: { type: String },
//   ifsc: { type: String },
//   upiId: { type: String }
// }, { _id: false });

// // Existing schema for storing a snapshot of agency settings
// const AgencySettingSnapshotSchema = new mongoose.Schema({
//   agencyName: { type: String },
//   tagline: { type: String },
//   emails: [{ type: String }],
//   phoneNumbers: [{ type: String }],
//   ceoName: { type: String },
//   ceoTitle: { type: String },
//   companyLegalName: { type: String },
//   logoLight: { type: String },
//   logoDark: { type: String },
//   quotationLogo: { type: String }, // FIX 1: Corrected typo from 'cotationLogo'
//   bankAccounts: [BankAccountSchema], // FIX 2: Moved bank accounts inside here as an array
// }, { _id: false });

// const QuotationSchema = new mongoose.Schema({
//   // Client & Quotation Header fields
//   quotationDate: { type: Date, default: Date.now },
//   clientName: { type: String, required: true },
//   phone: { type: String },
//   email: { type: String },
//   address: { type: String },
//   company: { type: String },
//   website: { type: String },
//   subject: { type: String, required: true },

//   // Body Introductory fields
//   inquiryDate: { type: Date, default: Date.now },
//   fullQuotationText: { type: String, required: true },

//   // Sections (now with dynamic headers and rows)
//   sections: [SectionSchema], // Key change: uses the updated SectionSchema

//   discount: { type: Number, default: 0 },
//   finalCost: { type: Number, default: 0 },

//   // WHY WEBITOF? section data
//   whyWebitof: {
//     heading: { type: String, default: "WHY WEBITOF?" },
//     points: [{ type: String }],
//     featuresTable: [WhyWebitofFeatureSchema]
//   },

//   // Bank Account Information - REMOVED from top level, now part of agencySettings
//   // bankAccount: BankAccountSchema, // <-- REMOVE THIS LINE

//   // Terms And Conditions section data
//   termsAndConditions: {
//     heading: { type: String, default: "Terms And Conditions" },
//     points: [{ type: String }]
//   },

//   // Snapshot of agency settings at the time of creation
//   agencySettings: AgencySettingSnapshotSchema, // This now correctly includes bankAccounts

// }, { timestamps: true });

// export default mongoose.model("Quotation", QuotationSchema);

import mongoose from "mongoose"; // Using import syntax

// --- Sub-schemas for different content block types ---

const paragraphSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    content: { type: String, required: true },
  },
  { _id: false }
); // _id: false means Mongoose won't create an _id for subdocuments unless explicitly defined

const sectionRowSchema = new mongoose.Schema(
  {
    values: [{ type: String, default: "" }], // Array of strings for each cell in the row
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    headers: [{ type: String, required: true }],
    rows: [sectionRowSchema],
  },
  { _id: false }
);

const whyWebitofFeatureSchema = new mongoose.Schema(
  {
    feature: { type: String, default: "" },
    others: { type: String, default: "" },
    webitof: { type: String, default: "" },
  },
  { _id: false }
);

const whyWebitofSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "WHY WEBITOF?" },
    points: [{ type: String, default: "" }],
    featuresTable: [whyWebitofFeatureSchema],
  },
  { _id: false }
);

const termsAndConditionsSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "Terms And Conditions" },
    points: [{ type: String, default: "" }],
  },
  { _id: false }
);

const bankAccountSchema = new mongoose.Schema(
  {
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    upiId: { type: String, default: "" },
  },
  { _id: false }
);

// --- Main Content Block Schema (Polymorphic) ---
// This schema describes an individual, reorderable block of content.
const contentBlockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // Client-generated UUID (from uuidv4)
    blockType: {
      type: String,
      required: true,
      enum: [
        "paragraph",
        "section",
        "whyWebitof",
        "termsAndConditions",
        "bankAccounts",
      ],
    },
    // Conditional sub-documents based on blockType
    paragraph: {
      type: paragraphSchema,
      required: function () {
        return this.blockType === "paragraph";
      },
    },
    section: {
      type: sectionSchema,
      required: function () {
        return this.blockType === "section";
      },
    },
    whyWebitof: {
      type: whyWebitofSchema,
      required: function () {
        return this.blockType === "whyWebitof";
      },
    },
    termsAndConditions: {
      type: termsAndConditionsSchema,
      required: function () {
        return this.blockType === "termsAndConditions";
      },
    },
    bankAccounts: {
      type: [bankAccountSchema],
      required: function () {
        return this.blockType === "bankAccounts";
      },
    }, // Array of bank accounts
  },
  { _id: false }
); // Important: _id: false for array elements if you want to use the client-generated 'id' as primary key

// --- Main Quotation Schema ---
const quotationSchema = new mongoose.Schema(
  {
    quotationId: { type: String, unique: true, required: true }, // Auto-generated or custom ID for the quotation
    quotationDate: { type: Date, required: true },
    clientName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String },
    company: { type: String },
    website: { type: String },
    subject: { type: String, required: true },
    inquiryDate: { type: Date },

    // This is the core for dynamic content: an array of reorderable content blocks
    contentBlocks: [contentBlockSchema],

    discount: { type: Number, default: 0 },
    finalCost: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Rejected", "Revised"],
      default: "Draft",
    },
    // If you decide to store the full generated HTML on the backend (optional, frontend can generate):
    // fullQuotationText: { type: String },

    // Store a snapshot of agency settings used at the time of quotation creation
    agencySettings: {
      agencyName: { type: String },
      tagline: { type: String },
      emails: [{ type: String }],
      phoneNumbers: [{ type: String }],
      ceoName: { type: String },
      ceoTitle: { type: String },
      companyLegalName: { type: String },
      logoLight: { type: String }, // Path to logo
      logoDark: { type: String }, // Path to logo
      quotationLogo: { type: String }, // Path to quotation logo
      bankAccounts: [bankAccountSchema], // Embed bank accounts directly within settings snapshot
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the user who created it
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the user who last updated it
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" }, // Reference to the lead
    // Using default timestamps property provided by Mongoose
  },
  { timestamps: true }
); // Mongoose will automatically add createdAt and updatedAt fields

// Method to generate a simple sequential quotation ID (optional, but good practice)
quotationSchema.statics.generateQuotationId = async function () {
  const lastQuotation = await this.findOne().sort({ createdAt: -1 });
  let newIdNum = 1;
  if (lastQuotation && lastQuotation.quotationId) {
    const match = lastQuotation.quotationId.match(/Q_(\d+)/);
    if (match) {
      newIdNum = parseInt(match[1]) + 1;
    }
  }
  return `Q_${String(newIdNum).padStart(5, "0")}`; // e.g., Q_00001, Q_00002
};

const Quotation = mongoose.model("Quotation", quotationSchema);

export default Quotation;
