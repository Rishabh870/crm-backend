import multer from 'multer';
import path from 'path';

// Define multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'uploads/'); // Set the destination folder for file uploads
  },
  filename: (req, file, callback) => {
    callback(null, Date.now() + path.extname(file.originalname)); // Set the filename to the current timestamp
  },
});

// Initialize multer with the storage configuration
const upload = multer({
  storage
});

export default upload;