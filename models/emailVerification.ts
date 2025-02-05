import bcrypt from "bcryptjs";
import mongoose, { Document, Schema } from "mongoose";
import { Model } from "mongoose";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export interface EmailVerification extends Document {
  email: string;
  otp: string;
  createdAt: Date;
}

const emailVerificationSchema: Schema<EmailVerification> = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "please enter your email"],
    lowercase: true,
    validate: {
      validator: function (value: string) {
        return emailRegexPattern.test(value);
      },
      message: "please enter a valid email",
    },
    unique: true,
  },
  otp:{
    type:String,
    required: true,
  },
  createdAt:{
    type: Date,
    default:Date.now,
    expires:'30m'
  }
});


const emailVerificationModel: Model<EmailVerification> = mongoose.model(
  "EmailVerification",
  emailVerificationSchema
);

export default emailVerificationModel;
