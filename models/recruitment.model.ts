import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRecruitment extends Document {
  name: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  skills: string[];
  experience: string;
  status: "pending" | "shortlisted" | "rejected" | "accepted";
  createdAt: Date;
  updatedAt: Date;
}

const recruitmentSchema = new Schema<IRecruitment>(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "Please enter your phone number"],
    },
    department: {
      type: String,
      required: [true, "Please specify department"],
    },
    year: {
      type: String,
      required: [true, "Please specify your year"],
    },
    skills: [
      {
        type: String,
        required: [true, "Please specify your skills"],
      },
    ],
    experience: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected", "accepted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const recruitmentModel: Model<IRecruitment> = mongoose.model(
  "Recruitment",
  recruitmentSchema
);
