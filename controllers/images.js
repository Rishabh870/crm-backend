// controllers/imageController.js
import Image from "../models/images.js";

export const createImageEntry = async (req, res) => {
  try {
    const uploadedBy = req.user?.id || null; // Assuming 'protect' middleware sets req.user

   const singleImage = req.files?.image?.[0]
  ? {
      url: `/uploads/${req.files.image[0].filename}`,
      uploadedBy,
    }
  : null;
    const multipleImages = req.files?.images?.map(file => ({
      url: `/uploads/${file.filename}`,
      uploadedBy,
    })) || [];

    const newImage = new Image({
      image: singleImage,
      images: multipleImages,
    });

    await newImage.save();
    res.status(201).json({ message: "Image uploaded successfully", data: newImage });
  } catch (error) {
    console.error("Image Upload Error:", error);
    res.status(500).json({ message: "Image upload failed", error: error.message });
  }
};
 export const  getallImages = async(req,res)=>{
    try{
const images=await Image.find()
  res.status(200).json(images);
    }catch(error){
  console.error("Error fetching lead:", error);
    res.status(500).json({ message: "Server error while fetching lead" });
    }
 }