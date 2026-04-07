import fs from "fs";
import path from "path";
import { destroyCloudinaryPhotoIfOwned } from "../cloudinaryPhotos.js";

/** Cloudinary URL, or legacy local /uploads/... (delete file if present) */
export async function deletePhotoIfOwned(photoUrl, instituteId) {
  if (!photoUrl || typeof photoUrl !== "string") return;

  if (/cloudinary\.com/i.test(photoUrl)) {
    await destroyCloudinaryPhotoIfOwned(photoUrl, instituteId);
    return;
  }

  const m = photoUrl.match(/^\/uploads\/([^/]+)\/(.+)$/);
  if (!m || m[1] !== String(instituteId)) return;
  const full = path.join(process.cwd(), "uploads", m[1], m[2]);
  try {
    fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}
