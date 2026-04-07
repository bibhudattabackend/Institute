import fs from "fs";
import path from "path";

/** photo_url format: /uploads/<instituteId>/<filename> */
export function deletePhotoIfOwned(photoUrl, instituteId) {
  if (!photoUrl || typeof photoUrl !== "string") return;
  const m = photoUrl.match(/^\/uploads\/([^/]+)\/(.+)$/);
  if (!m || m[1] !== String(instituteId)) return;
  const full = path.join(process.cwd(), "uploads", m[1], m[2]);
  try {
    fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}
