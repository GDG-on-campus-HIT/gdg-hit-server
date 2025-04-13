import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import Blog from "../models/blog.model";
import slugify from "slugify";

// Add a new blog post
export const addBlog = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, content, imageUrl, tags, isPublished, authorId } = req.body;

    if (!title || !description || !content || !imageUrl || !authorId) {
      return next(new ErrorHandler("All required fields must be filled.", 400));
    }

    const slug = slugify(title, { lower: true, strict: true });

    const existingSlug = await Blog.findOne({ slug });
    if (existingSlug) {
      return next(new ErrorHandler("A blog with similar title already exists.", 409));
    }

    const newBlog = await Blog.create({
      title,
      slug,
      description,
      content,
      imageUrl,
      tags,
      isPublished,
      authorId,
      publishedAt: isPublished ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      blog: newBlog,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Failed to create blog post.", 500));
  }
});

// Get blog by slug
export const getBlogBySlug = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { slug } = req.params;
  const blog = await Blog.findOne({ slug }).populate("authorId", "name email avatarUrl");

  if (!blog) {
    return next(new ErrorHandler("Blog post not found.", 404));
  }

  res.status(200).json({ success: true, blog });
});

// Get blog by ID
export const getBlogById = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const blog = await Blog.findById(req.params.id).populate("authorId", "name email avatarUrl");

  if (!blog) {
    return next(new ErrorHandler("Blog post not found.", 404));
  }

  res.status(200).json({ success: true, blog });
});

// Get all published blogs
export const getAllBlogs = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const blogs = await Blog.find({ isPublished: true }).sort({ publishedAt: -1 }).populate("authorId", "name");

  res.status(200).json({ success: true, blogs });
});

// Update blog by ID
export const updateBlog = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const blogId = req.params.id;
  const { title, description, content, imageUrl, tags, isPublished } = req.body;

  const blog = await Blog.findById(blogId);

  if (!blog) {
    return next(new ErrorHandler("Blog post not found.", 404));
  }

  if (title && title !== blog.title) {
    const slug = slugify(title, { lower: true, strict: true });
    blog.slug = slug;
    blog.title = title;
  }

  if (description) blog.description = description;
  if (content) blog.content = content;
  if (imageUrl) blog.imageUrl = imageUrl;
  if (tags) blog.tags = tags;
  if (typeof isPublished === "boolean") {
    blog.isPublished = isPublished;
    blog.publishedAt = isPublished ? new Date() : undefined;
  }

  await blog.save();

  res.status(200).json({
    success: true,
    updatedBlog: blog,
  });
});

// Delete blog by ID
export const deleteBlog = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return next(new ErrorHandler("Blog post not found.", 404));
  }

  await Blog.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Blog post deleted successfully.",
  });
});
