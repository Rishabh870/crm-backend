import mongoose from "mongoose";

// --- Nested Schemas for Content Blocks ---

// Paragraph Schema
const ParagraphSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    content: { type: String, default: "" },
  },
  { _id: false }
); // _id: false because these are sub-documents within an array

// Section (Table) Schema
const SectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: "New Section" },
    headers: { type: [String], required: true, default: ["Col 1", "Col 2"] },
    rows: {
      type: [
        {
          _id: false, // Don't create _id for individual row objects
          values: { type: [String], required: true },
        },
      ],
      default: [{ values: ["", ""] }],
    },
  },
  { _id: false }
);

// Why Webitof Schema
const WhyWebitofSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "WHY WEBITOF?" },
    points: { type: [String], default: [] },
    featuresTable: {
      type: [
        {
          _id: false,
          feature: { type: String, default: "" },
          others: { type: String, default: "" },
          webitof: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

// Terms And Conditions Schema
const TermsAndConditionsSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "Terms And Conditions" },
    points: { type: [String], default: [] },
  },
  { _id: false }
);

// Bank Accounts Schema (Assumes structure from your settings API)
const BankAccountSchema = new mongoose.Schema(
  {
    bankName: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
    upiId: { type: String },
  },
  { _id: false }
);

// --- Main Quotation Template Schema ---
const QuotationTemplateSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: [true, "Template name is required."],
      unique: true, // Ensures template names are unique
      trim: true,
    },
    contentBlocks: [
      {
        id: { type: String, required: true, unique: true }, // uuidv4 from frontend
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
          type: ParagraphSchema,
          required: function () {
            return this.blockType === "paragraph";
          },
        },
        section: {
          type: SectionSchema,
          required: function () {
            return this.blockType === "section";
          },
        },
        whyWebitof: {
          type: WhyWebitofSchema,
          required: function () {
            return this.blockType === "whyWebitof";
          },
        },
        termsAndConditions: {
          type: TermsAndConditionsSchema,
          required: function () {
            return this.blockType === "termsAndConditions";
          },
        },
        bankAccounts: {
          type: [BankAccountSchema], // Array of bank account objects
          required: function () {
            return this.blockType === "bankAccounts";
          },
        },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps automatically
  }
);

// Create an index on `templateName` for faster lookups and unique enforcement
QuotationTemplateSchema.index({ templateName: 1 }, { unique: true });

// Export the Mongoose model
const QuotationTemplate = mongoose.model(
  "QuotationTemplate",
  QuotationTemplateSchema
);

export default QuotationTemplate;
