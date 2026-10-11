require("dotenv").config();
import mongoose, { Document, Schema, Model } from "mongoose";

interface IContact extends Document {
  name: string;
  email: string;
  mobile_number: number;
  message: string;
  isRead: boolean;
}

const contactSchema = new Schema<IContact>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    mobile_number: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const contactModel: Model<IContact> = mongoose.model("Contact", contactSchema);

export { contactModel };
