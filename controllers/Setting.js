import Setting from "../models/Setting.js";

export const getSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const uploadLogo = async (req, res) => {
  try {
    const { type } = req.body; // 'logoLight' or 'logoDark'
    const logoFile = req.file;

    // Validate type to only allow logoLight or logoDark for this endpoint
    if (!["logoLight", "logoDark"].includes(type)) {
      return res.status(400).json({ error: "Invalid logo type for this upload endpoint. Only 'logoLight' and 'logoDark' are allowed." });
    }

    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});

    // Logic to remove a logo (if logoFile is not present and a type is specified)
    if (!logoFile && req.body.logo === "") { // Assuming req.body.logo === "" means removal
      setting[type] = "";
      await setting.save();
      return res.json({ message: `${type} removed`, setting });
    }

    // Upload logo logic
    if (logoFile) {
      setting[type] = `/uploads/${logoFile.filename}`;
      await setting.save();
      return res.json({ message: `${type} uploaded`, setting });
    }

    return res.status(400).json({ error: "No file or remove action received." });
  } catch (err) {
    console.error("Logo error:", err);
    res.status(500).json({ error: "Logo update failed." });
  }
};

export const uploadLetterheadFull = async (req, res) => {
  try {
    const file = req.file; // multer: single('fullPageImage')
    const { clear } = req.body;

    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});

    // Clear image
    if (!file && String(clear) === "true") {
      if (!setting.letterhead) setting.letterhead = {};
      setting.letterhead.fullPageImage = "";
      await setting.save();
      return res.json({ message: "Letterhead full image removed", setting });
    }

    // Upload image
    if (file) {
      if (!setting.letterhead) setting.letterhead = {};
      setting.letterhead.fullPageImage = `/uploads/${file.filename}`;
      await setting.save();
      return res.json({ message: "Letterhead full image uploaded", setting });
    }

    return res.status(400).json({ error: "No file uploaded and no clear flag provided." });
  } catch (err) {
    console.error("Letterhead upload error:", err);
    res.status(500).json({ error: "Letterhead full image update failed." });
  }
};
export const updateSettings = async (req, res) => {
  try {
    const {
      agencyName,
      tagline,
      emails,
      phoneNumbers,
      ceoName,
      ceoTitle,
      companyLegalName,
      bankAccounts, // Now expecting an array of bank account objects
    } = req.body;

    const quotationLogoFile = req.file; // This will hold the uploaded file details for quotationLogo

    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});

    // Update non-logo fields
    setting.agencyName = agencyName !== undefined ? agencyName : setting.agencyName;
    setting.tagline = tagline !== undefined ? tagline : setting.tagline;
    setting.emails = emails !== undefined ? emails : setting.emails;
    setting.phoneNumbers = phoneNumbers !== undefined ? phoneNumbers : setting.phoneNumbers;
    setting.ceoName = ceoName !== undefined ? ceoName : setting.ceoName;
    setting.ceoTitle = ceoTitle !== undefined ? ceoTitle : setting.ceoTitle;
    setting.companyLegalName = companyLegalName !== undefined ? companyLegalName : setting.companyLegalName;

    // Handle bankAccounts update
    if (bankAccounts !== undefined) {
      // Ensure bankAccounts is an array before assigning
      setting.bankAccounts = Array.isArray(bankAccounts) ? bankAccounts : [];
    }

    // Handle quotationLogo update with Multer
    if (quotationLogoFile) {
      setting.quotationLogo = `/uploads/${quotationLogoFile.filename}`;
    } else if (req.body.quotationLogo === '') { // Allow clearing the logo if an empty string is sent
        setting.quotationLogo = ""; // Set to empty string to remove the logo
    }
    // If no new file is uploaded and req.body.quotationLogo is not explicitly empty,
    // the existing logo path in setting.quotationLogo remains unchanged.

    await setting.save();

    res.json({ message: "Agency settings updated", setting });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
};