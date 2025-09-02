import jwt from "jsonwebtoken";

export const signToken = (user) => {
  const payload = { sub: user._id.toString(), role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};
