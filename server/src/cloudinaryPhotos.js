import { v2 as cloudinary } from "cloudinary";

const FOLDER_PREFIX = "bed-institute";

let configured = false;

export function isCloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function ensureConfigured() {
  if (!isCloudinaryEnabled()) return;
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

/** Parse public_id from a Cloudinary delivery URL (supports version + transformation prefix). */
export function publicIdFromCloudinaryUrl(url) {
  try {
    const noQuery = url.split("?")[0];
    const tail = noQuery.split("/upload/")[1];
    if (!tail) return null;
    let segs = tail.split("/").filter(Boolean);
    while (segs.length && segs[0].includes(",")) segs.shift();
    if (segs[0]?.match(/^v\d+$/)) segs.shift();
    const pathWithMaybeExt = segs.join("/");
    if (!pathWithMaybeExt) return null;
    return pathWithMaybeExt.replace(/\.[^.]+$/, "") || null;
  } catch {
    return null;
  }
}

export async function uploadStudentPhotoBuffer(buffer, mimetype, instituteId) {
  ensureConfigured();
  const dataUri = `data:${mimetype};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `${FOLDER_PREFIX}/${instituteId}`,
    resource_type: "image",
    overwrite: false,
  });
  return result.secure_url;
}

export async function destroyCloudinaryPhotoIfOwned(photoUrl, instituteId) {
  if (!photoUrl || !isCloudinaryEnabled()) return;
  const publicId = publicIdFromCloudinaryUrl(photoUrl);
  if (!publicId) return;
  const prefix = `${FOLDER_PREFIX}/${instituteId}/`;
  if (!publicId.startsWith(prefix)) return;
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    /* ignore */
  }
}

const LOGO_FOLDER_PREFIX = "bed-institute-logos";

export async function uploadInstituteLogoBuffer(buffer, mimetype, instituteId) {
  ensureConfigured();
  const dataUri = `data:${mimetype};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `${LOGO_FOLDER_PREFIX}/${instituteId}`,
    resource_type: "image",
    overwrite: false,
  });
  return result.secure_url;
}

export async function destroyInstituteLogoIfOwned(logoUrl, instituteId) {
  if (!logoUrl || !isCloudinaryEnabled()) return;
  const publicId = publicIdFromCloudinaryUrl(logoUrl);
  if (!publicId) return;
  const prefix = `${LOGO_FOLDER_PREFIX}/${instituteId}/`;
  if (!publicId.startsWith(prefix)) return;
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    /* ignore */
  }
}
