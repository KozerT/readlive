import { IVoiceSession } from "@/types";
import { Schema, model, models } from "mongoose";

const VoiceSessionSchema = new Schema<IVoiceSession>(
  {
    _id: { type: String, required: true },
    clerkId: { type: String, required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0, required: true },
    billingPeriodStart: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

VoiceSessionSchema.index(
  { clerkId: 1, billingPeriodStarts: 1 },
  { unique: true }
);

const VoiceSession =
  models.VoiceSession ||
  model<IVoiceSession>("VoiceSession", VoiceSessionSchema);

export default VoiceSession;
