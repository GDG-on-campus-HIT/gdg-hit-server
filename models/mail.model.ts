require("dotenv").config();
import mongoose, { Document, Schema, Model } from "mongoose";

interface IMail extends Document {
  user: mongoose.Schema.Types.ObjectId; // Reference to the user
  eventId?: mongoose.Schema.Types.ObjectId | null; // Optional reference to the event
  mailType:
    | "promotion"
    | "registration"
    | "newsletter"
    | "notification"
    | "invite"; // Enum for mail types
  subject: string;
  content: string;
  sentAt: Date;
}

const mailSchema = new Schema<IMail>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Members", // Reference to the Members model
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Events", // Reference to the Events model
      default: null,
    },
    mailType: {
      type: String,
      enum: [
        "promotion",
        "registration",
        "newsletter",
        "notification",
        "invite",
      ],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sentAt: {
        type: Date,
        default: Date.now,
      },
  },
  { timestamps: true }
);

const mailModel: Model<IMail> = mongoose.model("Mail", mailSchema);

export { mailModel };
