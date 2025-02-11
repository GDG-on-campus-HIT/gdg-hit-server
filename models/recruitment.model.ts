import mongoose, { Document, Schema, Model, ObjectId } from "mongoose";

// Recruitment Interface
interface IRecruitment extends Document {
  user: ObjectId;
  generalInfo: {
    email: string;
    rollNumber: string;
  };
  positions: string[];
  gdgPerspective: {
    gdgPerspective: string;
    eventIdeas: string;
  };
  roleSpecific: {
    [key: string]: any;
  };
  finalInfo: {
    timeCommitment: string;
    reasonToJoin: string;
  };
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

// Recruitment Schema
const recruitmentSchema = new Schema<IRecruitment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generalInfo: {
      email: { type: String, required: true },
      rollNumber: { type: String, required: true },
    },
    positions: [
      {
        type: String,
        required: true,
      },
    ],
    gdgPerspective: {
      gdgPerspective: { type: String, required: true },
      eventIdeas: { type: String, required: true },
    },
    roleSpecific: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    finalInfo: {
      timeCommitment: { type: String, required: true },
      reasonToJoin: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Recruitment Model
const RecruitmentModel: Model<IRecruitment> = mongoose.model(
  "Recruitment",
  recruitmentSchema
);

export { RecruitmentModel, IRecruitment };
