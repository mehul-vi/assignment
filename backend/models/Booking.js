import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, index: true },
    slot: { type: String, required: true, trim: true, maxlength: 200 },
    status: { type: String, enum: ["booked", "confirmed", "cancelled", "attended"], default: "booked", index: true },
    cancelledAt: { type: Date, default: null },
    attendedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ email: 1, createdAt: -1 });

export default mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
