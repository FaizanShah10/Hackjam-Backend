import { Poll } from "../models/Poll.js";

const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const generateUniqueCode = async (maxTries = 5) => {
  for (let i = 0; i < maxTries; i++) {
    const code = randomCode();
    const exists = await Poll.exists({ code });
    if (!exists) return code;
  }
  throw new Error("Failed to generate unique code");
};
