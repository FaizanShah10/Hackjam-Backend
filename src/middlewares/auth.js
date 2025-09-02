import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    // also allow httpOnly cookie if you prefer
    const cookieToken = req.cookies?.token;
    const jwtToken = token || cookieToken;

    if (!jwtToken) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// optional: gate the creator dashboard
export const requireCreator = (req, res, next) => {
  if (req.user?.role === "creator" || req.user?.role === "admin") return next();
  return res.status(403).json({ message: "Forbidden" });
};
