import { Router } from "express";
import {
  createPoll,
  listMyPolls,
  getPollByCode,
  toggleLive,
  deletePoll,
  getPollById,
  getPollSummary,
  updatePoll,
  getCreatorOverview,
} from "../controllers/poll.controller.js";
import { requireAuth, requireCreator } from "../middlewares/auth.js";
import { listRespondentsWithContacts, listResponses } from "../controllers/response.controller.js";

const router = Router();

function badgeForCount(count) {
  if (count >= 50) return "Diamond";
  if (count >= 25) return "Gold";
  if (count >= 10) return "Silver";
  if (count >= 3)  return "Bronze";
  return "Newbie";
}

// Public (audience):
router.get("/code/:code", getPollByCode);

// Creator area:
router.post("/", requireAuth, requireCreator, createPoll);
router.patch("/edit/:id", requireAuth, requireCreator, updatePoll)
router.get("/", requireAuth, requireCreator, listMyPolls);
router.patch("/:id/live", requireAuth, requireCreator, toggleLive);
router.delete("/:id", requireAuth, requireCreator, deletePoll);
router.get("/:id/respondents", requireAuth, requireCreator, listRespondentsWithContacts);
router.get("/:id", requireAuth, requireCreator, getPollById);
router.get("/:id/summary", requireAuth, requireCreator, getPollSummary);
router.get("/creator/overview", requireAuth, requireCreator, getCreatorOverview);

router.get("/:id/summary", requireAuth, requireCreator, getPollSummary);
router.get("/:id/responses", requireAuth, requireCreator, listResponses);
router.get("/:id/respondents", requireAuth, requireCreator, listRespondentsWithContacts);

export default router;
