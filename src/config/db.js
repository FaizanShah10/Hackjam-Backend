import mongoose from "mongoose";

export const connectDB = async (uri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { dbName: "polls_app" });
  console.log("✅ MongoDB connected");
};
