import crypto from "crypto";
import mongoose from "mongoose";
import { Poll } from "../models/Poll.js";
import { Response } from "../models/Response.js";


// ---- PUBLIC: submit by join code ----
export const submitResponseByCode = async (req, res) => {
  const { code } = req.params;
  const { optionIndex, text, audienceId, name, email } = req.body;

  const poll = await Poll.findOne({ code });
  if (!poll) return res.status(404).json({ message: "Poll not found" });
  if (!poll.isLive) return res.status(403).json({ message: "Poll is not live" });

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  if (poll.type === "mcq") {
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }
  } else if (!text?.trim()) {
    return res.status(400).json({ message: "Text is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const safeAudienceId =
    typeof audienceId === "string" && audienceId.trim().length > 0 ? audienceId.trim() : undefined;

  // Read previous choice for count delta
  const prev = await Response.findOne({ poll: poll._id, email: normalizedEmail })
    .select("optionIndex type")
    .lean();

  const setCommon = {
    type: poll.type,
    name: name.trim(),
    email: normalizedEmail,
    userAgent: (req.get("user-agent") || "").slice(0, 200),
    ...(safeAudienceId ? { audienceId: safeAudienceId } : {}), // never write null/empty
  };

  const updateOps =
    poll.type === "mcq"
      ? { $set: { ...setCommon, optionIndex }, $unset: { text: "", audienceId: "" } }
      : { $set: { ...setCommon, text: text.trim() }, $unset: { optionIndex: "", audienceId: "" } };

  // Atomic upsert by (poll, email)
  const result = await Response.updateOne(
    { poll: poll._id, email: normalizedEmail },
    { ...updateOps, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: false }
  );

  const created = result.upsertedCount === 1;

  if (poll.type === "mcq") {
    if (created) {
      const inc = { totalResponses: 1 };
      inc[`optionCounts.${optionIndex}`] = 1;
      await Poll.updateOne({ _id: poll._id }, { $inc: inc });
      return res.status(201).json({ message: "Recorded" });
    } else {
      const prevIdx = prev?.optionIndex;
      if (Number.isInteger(prevIdx) && prevIdx !== optionIndex) {
        const inc = {};
        inc[`optionCounts.${prevIdx}`] = -1;
        inc[`optionCounts.${optionIndex}`] = 1;
        await Poll.updateOne({ _id: poll._id }, { $inc: inc });
      }
      return res.status(200).json({ message: "Vote updated" });
    }
  } else {
    if (created) {
      await Poll.updateOne({ _id: poll._id }, { $inc: { totalResponses: 1 } });
      return res.status(201).json({ message: "Recorded" });
    }
    return res.status(200).json({ message: "Response updated" });
  }
};


export const getPublicSummaryByCode = async (req, res) => {
  const { code } = req.params;
  const poll = await Poll.findOne({ code }).select("type options isLive totalResponses optionCounts");
  if (!poll) return res.status(404).json({ message: "Poll not found" });

  // optional: only stream results when live
  // if (!poll.isLive) return res.status(403).json({ message: "Poll not live" });

  if (poll.type === "mcq") {
    const counts = Array.isArray(poll.optionCounts) ? poll.optionCounts : Array(poll.options.length).fill(0);
    const total = poll.totalResponses || counts.reduce((a,b)=>a+b,0);
    return res.json({ type: "mcq", counts, total });
  }
  // text: keep it light here (just totals)
  const total = poll.totalResponses || 0;
  return res.json({ type: "text", total });
};


// ---- CREATOR: fast summary (denormalized) ----
export const getPollSummary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid poll id" });
    }

    // enforce ownership
    const poll = await Poll.findOne({ _id: id, createdBy: req.user._id })
      .select("type options totalResponses responseCount optionCounts");
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    // Pick total from whichever field is present
    const denormTotal =
      (typeof poll.totalResponses === "number" ? poll.totalResponses : null) ??
      (typeof poll.responseCount === "number" ? poll.responseCount : null);

    if (poll.type === "mcq") {
      // If we have a good optionCounts array AND a sensible total, use it.
      const hasCountsArray =
        Array.isArray(poll.optionCounts) &&
        poll.optionCounts.length === (poll.options?.length || 0);

      if (hasCountsArray && denormTotal !== null) {
        return res.json({
          type: "mcq",
          counts: poll.optionCounts,
          total: denormTotal,
        });
      }

      // Fallback: aggregate from responses collection
      const grouped = await Response.aggregate([
        { $match: { poll: poll._id, type: "mcq" } },
        { $group: { _id: "$optionIndex", c: { $sum: 1 } } },
      ]);

      const counts = Array.from({ length: poll.options.length }, () => 0);
      for (const { _id, c } of grouped) {
        if (Number.isInteger(_id) && _id >= 0 && _id < counts.length) counts[_id] = c;
      }
      const total = counts.reduce((a, b) => a + b, 0);

      return res.json({ type: "mcq", counts, total });
    }

    // TEXT poll
    if (denormTotal !== null) {
      return res.json({ type: "text", total: denormTotal, texts: [] });
    }

    // Fallback aggregate for text total
    const total = await Response.countDocuments({ poll: poll._id, type: "text" });
    return res.json({ type: "text", total, texts: [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load summary", error: err.message });
  }
};

// ---- CREATOR: paginated list of responses ----
export const listResponses = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid poll id" });

    // ownership
    const poll = await Poll.findOne({ _id: id, createdBy: req.user._id });
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { poll: poll._id, type: poll.type };
    const [items, total] = await Promise.all([
      Response.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v -ipHash -userAgent") // hide raw-ish data
        .limit(limit)
        .select("type optionIndex text createdAt name email -_v -ipHash -userAgent"),
      Response.countDocuments(query),
    ]);

    res.json({
      total,
      page,
      limit,
      items: items.map((r) => ({
        id: r._id,
        type: r.type,
        optionIndex: r.optionIndex,
        text: r.text,
        createdAt: r.createdAt,
        name: r.name,
        email: r.email,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to list responses", error: err.message });
  }
};

export const listRespondentsWithContacts = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid poll id" });

    // enforce ownership
    const poll = await Poll.findOne({ _id: id, createdBy: req.user._id }).select("_id");
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    // group respondents by email for this poll (ignore missing emails)
    const perPoll = await Response.aggregate([
      { $match: { poll: poll._id, email: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$email",
          name: { $last: "$name" },
          email: { $last: "$email" },
          count: { $sum: 1 },
          lastSubmittedAt: { $max: "$createdAt" },
          recent: {
            $push: { type: "$type", optionIndex: "$optionIndex", text: "$text", at: "$createdAt" }
          }
        }
      },
      { $sort: { count: -1, lastSubmittedAt: -1 } },
      { $limit: 1000 } // safety; tweak as you like
    ]);

    // total counts across ALL polls for badge computation
    const emails = perPoll.map(r => r.email);
    const totals = await Response.aggregate([
      { $match: { email: { $in: emails } } },
      { $group: { _id: "$email", totalCount: { $sum: 1 } } }
    ]);
    const totalMap = new Map(totals.map(t => [t._id, t.totalCount]));

    function badgeForCount(count) {
      if (count >= 50) return "Diamond";
      if (count >= 25) return "Gold";
      if (count >= 10) return "Silver";
      if (count >= 3)  return "Bronze";
      return "Newbie";
    }

    const rows = perPoll.map(r => {
      const total = totalMap.get(r.email) ?? r.count;
      // keep only 3 latest items for UI
      r.recent = (r.recent || []).slice(-3).reverse();
      return {
        name: r.name || "",
        email: r.email,
        count: r.count,                  // responses in this poll
        totalResponses: total,           // responses across all polls
        badge: badgeForCount(total),
        lastSubmittedAt: r.lastSubmittedAt,
        recent: r.recent
      };
    });

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch respondents", error: err.message });
  }
};
