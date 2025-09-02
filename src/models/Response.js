import mongoose from "mongoose";

const responseSchema = new mongoose.Schema({
  poll: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", index: true, required: true },
  type: { type: String, enum: ["mcq", "text"], required: true },

  // for MCQ: store the selected option index (0..n-1)
  optionIndex: { type: Number }, // required iff type === "mcq"

  // for Text: store the free text
  text: { type: String, trim: true }, // required iff type === "text"
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true, index: true },

  // (optional) light fingerprinting / dedupe
  audienceId: { type: String, index: true }, // e.g., short uuid stored in a cookie
  ipHash: { type: String },                  // hash(IP + secret), not raw IP
  userAgent: { type: String },

  createdAt: { type: Date, default: Date.now, index: true },
}, { minimize: true });

responseSchema.index({ poll: 1, optionIndex: 1 });  // speeds up MCQ counts
// If you want to prevent duplicate responses per audience per poll:
// responseSchema.index({ poll: 1, audienceId: 1 }, { unique: true, sparse: true });
responseSchema.index({ poll: 1, audienceId: 1 }, { sparse: true });
responseSchema.index({ poll: 1, email: 1 }, { unique: true, sparse: true });

export const Response = mongoose.model("Response", responseSchema);
