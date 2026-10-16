import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
