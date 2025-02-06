require("dotenv").config();
import mongoose, { Document, Schema, Model } from "mongoose";

interface IMembers extends Document {
  name: string;
  profile_image: {
    public_id: string;
    url: string;
  };
  department: string;
  designation: string;
  email_id: string;
  batch: string;
  bio: string;
  github_url: string;
  linkedin_url: string;
  leader: boolean;
}

const membersSchema = new Schema<IMembers>(
  {
    name: {
      type: String,
      required: true,
    },
    profile_image: {
      public_id: String,
      url: String,
    },
    department: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    email_id: {
      type: String,
      required: true,
    },
    batch: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: true,
    },
    github_url: {
      type: String,
      required: true,
    },
    linkedin_url: {
      type: String,
      required: true,
    },
    leader: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const membersModel: Model<IMembers> = mongoose.model("Members", membersSchema);

export { membersModel };
