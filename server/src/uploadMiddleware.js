import multer from "multer";

export function studentPhotoUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      if (!/^image\/(jpeg|png|gif|webp)/i.test(file.mimetype)) {
        return cb(new Error("Only JPEG, PNG, GIF or WebP images are allowed"));
      }
      cb(null, true);
    },
  });
}

/** Institute logo — same limits; field name: `logo` */
export function instituteLogoUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      if (!/^image\/(jpeg|png|gif|webp)/i.test(file.mimetype)) {
        return cb(new Error("Only JPEG, PNG, GIF or WebP images are allowed"));
      }
      cb(null, true);
    },
  });
}
