import mongoose from "mongoose";

const BankAccountSchema = new mongoose.Schema(
  {
    bankName: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
    upiId: { type: String },
  },
  { _id: false }
);

const LetterheadSchema = new mongoose.Schema(
  {
    fullPageImage: { type: String, default: "" }, // e.g. /uploads/letterhead-full.png
  },
  { _id: false }
);

const settingSchema = new mongoose.Schema(
  {
    logoLight: { type: String, default: "" },
    logoDark: { type: String, default: "" },
    quotationLogo: { type: String, default: "" }, // Keep this here
    agencyName: { type: String, default: "" },
    tagline: { type: String, default: "" },
    emails: [{ type: String }],
    phoneNumbers: [{ type: String }],
    ceoName: { type: String, default: "" },
    ceoTitle: { type: String, default: "" },
    companyLegalName: { type: String, default: "" },
    letterhead: { type: LetterheadSchema, default: () => ({}) },
    bankAccounts: [BankAccountSchema], // Array of bank accounts
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
