import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function studentPhotoUpload() {
  const storage = multer.diskStorage({
    destination(req, _file, cb) {
      const instituteId = req.institute.id;
      const dir = path.join(process.cwd(), "uploads", instituteId);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const safe = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      if (!/^image\/(jpeg|png|gif|webp)/i.test(file.mimetype)) {
        return cb(new Error("Only JPEG, PNG, GIF or WebP images are allowed"));
      }
      cb(null, true);
    },
  });
}
