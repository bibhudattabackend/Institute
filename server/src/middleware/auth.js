import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function authRequired(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.institute = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
