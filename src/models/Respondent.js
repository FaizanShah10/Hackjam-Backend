const mongoose = require("mongoose");
const { Schema } = mongoose;

const RespondentSchema = new Schema({
  // We use email as main identity for the “light identity” flow
  email: { type: String, index: true, lowercase: true, trim: true },
  name: { type: String, trim: true },
  // Optional: fallback guest id if you also support anonymous later
  guestId: { type: String, index: true },

  // useful meta
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Respondent", RespondentSchema);
