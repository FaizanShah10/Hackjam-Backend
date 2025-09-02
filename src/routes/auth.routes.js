import { Router } from "express";
import { me, signin, signup } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", requireAuth, me);

export default router;
