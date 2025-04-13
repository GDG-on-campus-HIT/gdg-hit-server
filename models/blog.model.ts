import mongoose, { Document, Schema } from "mongoose";

export interface IBlog extends Document {
  category: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  isListed: boolean;
  imageUrl: string;
  authorId: mongoose.Types.ObjectId;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema: Schema<IBlog> = new Schema<IBlog>(
  {
    category: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    imageUrl: { type: String, required: true },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isListed: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

const Blog = mongoose.model<IBlog>("Blog", blogSchema);
export default Blog;
