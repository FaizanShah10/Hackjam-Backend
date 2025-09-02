import { Poll } from "../models/Poll.js";
import { generateUniqueCode } from "../utils/generateCode.js";
import mongoose from "mongoose";

// POST /creator/polls  (creator only)
export const createPoll = async (req, res) => {
  try {
    const {
      pollTitle,
      questionTitle,
      description = "",
      type,
      options,
    } = req.body;

    // Basic validation
    if (!pollTitle?.trim() || !questionTitle?.trim() || !type) {
      return res.status(400).json({ message: "pollTitle, questionTitle and type are required" });
    }
    if (!["mcq", "text"].includes(type)) {
      return res.status(400).json({ message: "type must be 'mcq' or 'text'" });
    }

    // MCQ options validation/sanitization
    let safeOptions = [];
    if (type === "mcq") {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: "MCQ requires at least 2 options" });
      }
      safeOptions = options.map(String).map(s => s.trim()).filter(Boolean);
      if (safeOptions.length < 2) {
        return res.status(400).json({ message: "Provide at least 2 valid options" });
      }
    }

    // Generate code
    const code = await generateUniqueCode();

    // Initialize denormalized stats
    const doc = {
      pollTitle: pollTitle.trim(),
      questionTitle: questionTitle.trim(),
      description: description?.trim() || "",
      type,
      options: type === "mcq" ? safeOptions : [],
      createdBy: req.user._id,
      isLive: false,                  // creators can toggle later
      code,
      totalResponses: 0,
      optionCounts: type === "mcq" ? Array(safeOptions.length).fill(0) : [],
    };

    const poll = await Poll.create(doc);

    return res.status(201).json({ message: "Poll created", poll });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create poll", error: err.message });
  }
};

// GET /creator/polls (list my polls)
export const listMyPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .select("-__v");
    return res.json({ polls });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch polls", error: err.message });
  }
};

// GET /polls/:code (public — audience can fetch by code)
export const getPollByCode = async (req, res) => {
  try {
    const poll = await Poll.findOne({ code: req.params.code })
      .select("pollTitle questionTitle description type options isLive code createdAt totalResponses optionCounts createdBy");

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    // Optional: only allow fetching when live
    // if (!poll.isLive) return res.status(403).json({ message: "This poll isn't live right now" });

    // Return a minimal public view
    return res.json({
      poll: {
        id: String(poll._id),
        pollTitle: poll.pollTitle,
        questionTitle: poll.questionTitle,
        description: poll.description,
        type: poll.type,
        options: poll.options,
        isLive: poll.isLive,
        code: poll.code,
        createdAt: poll.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch poll", error: err.message });
  }
};

// PATCH /creator/polls/:id/live (toggle isLive)
export const toggleLive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isLive } = req.body;
    if (typeof isLive !== "boolean") {
      return res.status(400).json({ message: "isLive must be boolean" });
    }

    const poll = await Poll.findOneAndUpdate(
      { _id: id, createdBy: req.user._id },
      { isLive },
      { new: true }
    ).select("-__v");

    if (!poll) return res.status(404).json({ message: "Poll not found" });
    return res.json({ message: "Poll updated", poll });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update poll", error: err.message });
  }
};

// DELETE /creator/polls/:id
export const deletePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const del = await Poll.findOneAndDelete({ _id: id, createdBy: req.user._id });
    if (!del) return res.status(404).json({ message: "Poll not found" });
    return res.json({ message: "Poll deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete poll", error: err.message });
  }
};

// Update Poll
export const updatePoll = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid poll id" });
    }

    const {
      pollTitle,
      questionTitle,
      description = "",
      type,
      options = [],
      isLive,
    } = req.body;

    // Basic validation
    if (!pollTitle?.trim()) return res.status(400).json({ message: "pollTitle is required" });
    if (!questionTitle?.trim()) return res.status(400).json({ message: "questionTitle is required" });
    if (!["mcq", "text"].includes(type)) return res.status(400).json({ message: "type must be 'mcq' or 'text'" });

    let safeOptions = [];
    if (type === "mcq") {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: "MCQ requires at least 2 options" });
      }
      safeOptions = options.map(String).map(s => s.trim()).filter(Boolean);
      if (safeOptions.length < 2) {
        return res.status(400).json({ message: "Provide at least 2 valid options" });
      }
    }

    const update = {
      pollTitle: pollTitle.trim(),
      questionTitle: questionTitle.trim(),
      description: description?.trim() || "",
      type,
      options: type === "mcq" ? safeOptions : [],
    };

    if (typeof isLive === "boolean") update.isLive = isLive;

    const poll = await Poll.findOneAndUpdate(
      { _id: id, createdBy: req.user._id },
      update,
      { new: true }
    ).select("-__v");

    if (!poll) return res.status(404).json({ message: "Poll not found" });
    return res.json({ message: "Poll updated", poll });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update poll", error: err.message });
  }
};

export const getPollById = async (req, res) => {
  const { id } = req.params;
  const poll = await Poll.findOne({ _id: id, createdBy: req.user._id })
    .select("-__v");
  if (!poll) return res.status(404).json({ message: "Poll not found" });
  res.json({ poll });
};

// If you already store responses in a collection, aggregate real counts here.
// For hackathon speed, return a shape the frontend expects.
export const getPollSummary = async (req, res) => {
  const { id } = req.params;
  const poll = await Poll.findOne({ _id: id, createdBy: req.user._id });
  if (!poll) return res.status(404).json({ message: "Poll not found" });

  // Example summary shape:
  // MCQ -> counts per option index
  // TEXT -> array of texts (trimmed)
  // Replace with your real aggregation later.
  if (poll.type === "mcq") {
    // TODO: aggregate from responses collection
    return res.json({
      type: "mcq",
      counts: Array.from({ length: poll.options.length }, () => 0), // placeholder
      total: 0
    });
  } else {
    // TODO: fetch text responses
    return res.json({
      type: "text",
      texts: [], // placeholder
      total: 0
    });
  }
};

// get poll overview
export const getCreatorOverview = async (req, res) => {
  try {
    const creatorId = req.user._id;

    // counts
    const [totalPolls, livePolls, closedPolls] = await Promise.all([
      Poll.countDocuments({ createdBy: creatorId }),
      Poll.countDocuments({ createdBy: creatorId, isLive: true }),
      Poll.countDocuments({ createdBy: creatorId, isLive: false }),
    ]);

    // overall responses: fast path → sum on Poll.totalResponses
    const totals = await Poll.aggregate([
      { $match: { createdBy: new mongoose.Types.ObjectId(creatorId) } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalResponses", 0] } } } },
    ]);
    const totalResponses = totals[0]?.total || 0;

    // recent polls (latest 5)
    const recentPolls = await Poll.find({ createdBy: creatorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id pollTitle isLive createdAt code");

    res.json({
      totalPolls,
      livePolls,
      closedPolls,
      totalResponses,
      recentPolls: recentPolls.map(p => ({
        id: String(p._id),
        title: p.pollTitle,
        isLive: p.isLive,
        createdAt: p.createdAt,
        code: p.code,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load overview", error: err.message });
  }
};

