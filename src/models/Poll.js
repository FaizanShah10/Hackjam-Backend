import mongoose from "mongoose";

const pollSchema = new mongoose.Schema({
  pollTitle: { type: String, required: true, trim: true },
  questionTitle: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ["mcq", "text"], required: true },
  options: {
    type: [String],
    default: [],
    validate: {
      validator(arr) { return this.type === "mcq" ? Array.isArray(arr) && arr.length >= 2 : true; },
      message: "MCQ must have at least 2 options",
    },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isLive: { type: Boolean, default: false },
  code: { type: String, required: true, unique: true, match: /^[0-9]{6}$/ },

  // denormalized stats (updated on each response)
  totalResponses: { type: Number, default: 0 },
  // for mcq only: same length as options
  optionCounts: { type: [Number], default: [] },
}, { timestamps: true });

export const Poll = mongoose.model("Poll", pollSchema);
