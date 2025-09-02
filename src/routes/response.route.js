import { Router } from "express";
import { submitResponseByCode, getPollSummary, listResponses, getPublicSummaryByCode } from "../controllers/response.controller.js"
import { requireAuth, requireCreator } from "../middlewares/auth.js";

const router = Router();

// public (no login): audience submits by short code
router.post("/polls/:code/responses", submitResponseByCode);

// creator analytics
router.get("/polls/code/:code/summary", getPublicSummaryByCode); // public
router.get("/polls/:id/summary", requireAuth, requireCreator, getPollSummary); // creator


export default router;
