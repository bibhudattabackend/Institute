import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { studentPhotoUpload } from "../uploadMiddleware.js";
import { isCloudinaryEnabled, uploadStudentPhotoBuffer } from "../cloudinaryPhotos.js";

export const uploadRouter = Router();
const upload = studentPhotoUpload();

uploadRouter.post("/student-photo", authRequired, upload.single("photo"), async (req, res, next) => {
  try {
    if (!isCloudinaryEnabled()) {
      return res.status(503).json({
        error:
          "Photo upload requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env",
      });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "No file uploaded (field name: photo)" });
    }
    const instituteId = req.institute.id;
    const photo_url = await uploadStudentPhotoBuffer(req.file.buffer, req.file.mimetype, instituteId);
    return res.json({ photo_url });
  } catch (err) {
    console.error("Photo upload failed:", err);
    next(err);
  }
});
