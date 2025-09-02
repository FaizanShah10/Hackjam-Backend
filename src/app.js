import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "../../routes/auth.routes.js";
import pollRoutes from "../../routes/poll.routes.js";
import responseRoutes from "../../routes/response.route.js"; // make sure the filename matches


const app = express();

app.set("trust proxy", 1); // Render is behind a proxy

app.use(express.json());
app.use(cookieParser());

// Build allowlist
const raw = process.env.CORS_ORIGIN || "http://localhost:5173,https://hackjam-frontend.vercel.app";
const ALLOWED_ORIGINS = raw.split(",").map(s => s.trim().replace(/\/$/, "").toLowerCase());

// One corsOptions function reused for routes + preflight
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin or non-browser
    const norm = origin.replace(/\/$/, "").toLowerCase();
    if (ALLOWED_ORIGINS.includes(norm)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${norm}`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight with same options



// Health
app.get("/", (_req, res) => res.send("API is running"));

// Routes
app.use("/auth", authRoutes);     // e.g. /auth/signup, /auth/signin
app.use("/polls", pollRoutes);    // e.g. /polls/code/:code, /polls/:id
app.use("/", responseRoutes);     // e.g. /polls/:id/summary, /polls/code/:code/summary, /polls/:code/responses


export default app;
