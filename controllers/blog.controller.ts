// src/controllers/blog.controller.ts
import { Request, Response, NextFunction } from "express";
import Blog from "../models/blog.model";
import slugify from "slugify";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import imagekit from "../utlis/imageKit";
import fs from "fs";
import { Types } from "mongoose";

export const addBlog = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      category,
      title,
      description,
      content,
      tags,
      isPublished,
      authorId,
    } = req.body;

    if (!title || !description || !content || !authorId || !req.file) {
      return next(new ErrorHandler("All required fields must be filled.", 400));
    }

    const slug = slugify(title, { lower: true, strict: true });
    const existing = await Blog.findOne({ slug });
    if (existing) {
      return next(
        new ErrorHandler("Blog with this title already exists.", 409)
      );
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const uploaded = await imagekit.upload({
      file: fileBuffer,
      fileName: req.file.originalname,
      folder: "blogs",
    });

    fs.unlinkSync(req.file.path);

    const newBlog = await Blog.create({
      category,
      title,
      slug,
      description,
      content,
      imageUrl: uploaded.url,
      tags,
      isPublished,
      authorId: authorId,
      publishedAt: isPublished ? new Date() : null,
    });

    res.status(201).json({ success: true, blog: newBlog });
  }
);

// Get blog by slug
export const getBlogBySlug = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    const blog = await Blog.findOne({ slug, isListed: true }).populate(
      "authorId",
      "name email avatarUrl"
    );

    if (!blog) {
      return next(new ErrorHandler("Blog post not found.", 404));
    }

    res
      .status(200)
      .json({ success: true, blog, message: "Blog fetched successfully." });
  }
);

// Get blog by ID
export const getBlogById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const blog = await Blog.findOne({
      _id: req.params.id,
      isListed: true,
    }).populate("authorId", "name email avatarUrl");

    if (!blog) {
      return next(new ErrorHandler("Blog post not found.", 404));
    }

    res
      .status(200)
      .json({ success: true, blog, message: "Blog fetched successfully." });
  }
);

// Get all published + listed blogs
export const getAllBlogs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const blogs = await Blog.find({ isPublished: true, isListed: true })
      .sort({ publishedAt: -1 })
      .populate("authorId", "name");

    res.status(200).json({
      success: true,
      blogs,
      message: "Blogs fetched successfully.",
    });
  }
);

// Update blog by ID
export const updateBlog = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const blogId = req.params.id;
    const {
      category,
      title,
      description,
      content,
      imageUrl,
      tags,
      isPublished,
    } = req.body;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return next(new ErrorHandler("Blog post not found.", 404));
    }

    if (title && title !== blog.title) {
      const newSlug = slugify(title, { lower: true, strict: true });
      const existingSlug = await Blog.findOne({
        slug: newSlug,
        _id: { $ne: blogId },
      });

      if (existingSlug) {
        return next(
          new ErrorHandler("A blog with this title already exists.", 409)
        );
      }

      blog.slug = newSlug;
      blog.title = title;
    }

    if (category !== undefined) blog.category = category;
    if (description !== undefined) blog.description = description;
    if (content !== undefined) blog.content = content;
    if (imageUrl !== undefined) blog.imageUrl = imageUrl;
    if (tags && Array.isArray(tags)) {
      blog.tags = tags.map((tag: string) => tag.trim().toLowerCase());
    }

    if (typeof isPublished === "boolean") {
      blog.isPublished = isPublished;
      blog.publishedAt = isPublished ? new Date() : undefined;
    }

    await blog.save();

    res.status(200).json({
      success: true,
      updatedBlog: blog,
      message: "Blog updated successfully.",
    });
  }
);

// Soft delete by user
export const softDeleteBlog = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return next(new ErrorHandler("Blog post not found.", 404));
    }

    blog.isListed = false;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog has been unlisted successfully.",
    });
  }
);

// Admin: Get all blogs (regardless of status)
export const getAllBlogsAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .populate("authorId", "name email");

    res.status(200).json({
      success: true,
      blogs,
      message: "All blogs fetched successfully (admin).",
    });
  }
);

// Admin: Soft delete a blog
export const adminSoftDeleteBlog = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return next(new ErrorHandler("Blog post not found.", 404));
    }

    blog.isListed = false;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog has been unlisted by admin.",
    });
  }
);
