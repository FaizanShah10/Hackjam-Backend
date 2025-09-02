import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import pollRoutes from "./routes/poll.routes.js";
import responseRoutes from "./routes/response.route.js"; // make sure the filename matches


const app = express();

app.use(express.json());
app.use(cookieParser());

// Build & normalize the allowlist
const raw = process.env.CORS_ORIGIN || "http://localhost:5173,https://hackjam-frontend.vercel.app";
const ALLOWED_ORIGINS = raw
  .split(",")
  .map(s => s.trim().replace(/\/$/, "").toLowerCase());

// (Optional) log incoming origins so you can see what's being sent
app.use((req, _res, next) => {
  if (req.headers.origin) {
    console.log("Incoming Origin:", req.headers.origin);
  }
  next();
});

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser or same-origin requests with no Origin header
      if (!origin) return cb(null, true);

      const norm = origin.replace(/\/$/, "").toLowerCase();
      if (ALLOWED_ORIGINS.includes(norm)) return cb(null, true);

      return cb(new Error(`Not allowed by CORS: ${norm}`));
    },
    credentials: true, // keep true only if you use cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// IMPORTANT: handle preflight globally
app.options("*", cors());


// Health
app.get("/", (_req, res) => res.send("API is running"));

// Routes
app.use("/auth", authRoutes);     // e.g. /auth/signup, /auth/signin
app.use("/polls", pollRoutes);    // e.g. /polls/code/:code, /polls/:id
app.use("/", responseRoutes);     // e.g. /polls/:id/summary, /polls/code/:code/summary, /polls/:code/responses


export default app;
