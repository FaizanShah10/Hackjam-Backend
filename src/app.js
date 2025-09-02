import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import pollRoutes from "./routes/poll.routes.js";
import responseRoutes from "./routes/response.route.js"; // make sure the filename matches

const app = express();

app.use(express.json());
app.use(cookieParser());

// CORS
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Health
app.get("/", (_req, res) => res.send("API is running"));

// Routes
app.use("/auth", authRoutes);     // e.g. /auth/signup, /auth/signin
app.use("/polls", pollRoutes);    // e.g. /polls/code/:code, /polls/:id
app.use("/", responseRoutes);     // e.g. /polls/:id/summary, /polls/code/:code/summary, /polls/:code/responses


export default app;
