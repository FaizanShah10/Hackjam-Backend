import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 2 },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    // creators log in to use the creator dashboard
    role:     { type: String, enum: ["creator", "admin"], default: "creator" }
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  const { _id, username, email, role, createdAt, updatedAt } = this;
  return { id: _id, username, email, role, createdAt, updatedAt };
};

export const User = mongoose.model("User", userSchema);
