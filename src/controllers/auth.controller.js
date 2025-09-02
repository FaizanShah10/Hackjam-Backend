import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { signToken } from "../utils/token.js";

const setAuthCookie = (res, token) => {
  // You can skip cookies if you only want Bearer tokens on frontend
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

// POST /auth/signup
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body; // minimal fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hash,
      role: "creator", // default role for creators
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    return res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

// POST /auth/signin
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({
      message: "Signin successful",
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    return res.status(500).json({ message: "Signin failed", error: err.message });
  }
};

// GET /auth/me
export const me = async (req, res) => {
  return res.json({ user: req.user.toSafeJSON() });
};
