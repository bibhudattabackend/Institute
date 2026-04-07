import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import { isCloudinaryEnabled } from "./cloudinaryPhotos.js";
import { authRouter } from "./routes/auth.js";
import { studentsRouter } from "./routes/students.js";
import { uploadRouter } from "./routes/upload.js";
import { universitiesRouter } from "./routes/universities.js";
import { courseFeesRouter } from "./routes/courseFees.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

if (!isCloudinaryEnabled()) {
  console.warn(
    "[bed-institute-api] CLOUDINARY_* not set — POST /api/upload/student-photo will return 503."
  );
}

app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bed-institute-api", db: "mongodb" });
});

app.use("/api/auth", authRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/universities", universitiesRouter);
app.use("/api/course-fees", courseFeesRouter);
app.use("/api/students", studentsRouter);

app.use((err, _req, res, _next) => {
  if (err?.name === "MulterError") {
    return res.status(400).json({ error: err.message || "Upload error" });
  }
  if (err?.message && typeof err.message === "string" && err.message.includes("Only ")) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
