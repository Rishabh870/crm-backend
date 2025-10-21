import nodemailer from 'nodemailer';

export const getTransporter = () => {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  const EMAIL_HOST = process.env.EMAIL_HOST;
  const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "465", 10);

  console.log("📦 Email config:", {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS: EMAIL_PASS ? EMAIL_PASS.slice(0, 3) + '...' : 'not set'
  });

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error("❌ Missing required email configuration.");
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
};

