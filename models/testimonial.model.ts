require("dotenv").config();
import mongoose, { Document, Schema, Model } from "mongoose";

interface ITestimonial extends Document {
  name: string;
  department: string;
  message: string;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    name: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);


const testimonialModel: Model<ITestimonial> = mongoose.model(
  "Testimonial",
  testimonialSchema
);

export {testimonialModel };
