import mongoose, { Document, Schema, Model, ObjectId } from "mongoose";

interface IReview extends Document {
  user: ObjectId;
  event: ObjectId;
  rating: number;
  comment: string;
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const reviewModel: Model<IReview> = mongoose.model("Review", reviewSchema);

export default reviewModel;
