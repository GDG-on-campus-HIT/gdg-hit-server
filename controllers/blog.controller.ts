// src/controllers/blog.controller.ts
import { Request, Response, NextFunction } from "express";
import Blog from "../models/blog.model";
import slugify from "slugify";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import imagekit from "../utlis/imageKit";
import fs from "fs";
import { Types } from "mongoose";

const MODERATOR_ROLES = ["domain_lead", "super_domain_admin", "super_admin"];

const isModerator = (req: Request) =>
  MODERATOR_ROLES.includes((req.user as any)?.role || "");

// Multipart bodies send everything as strings.
const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const parseTags = (value: unknown): string[] | undefined => {
  if (value === undefined) return undefined;
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = value.split(",");
    }
  }
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean);
};

const uploadBlogImage = async (file: Express.Multer.File) => {
  try {
    const uploaded = await imagekit.upload({
      file: fs.readFileSync(file.path),
      fileName: file.originalname,
      folder: "blogs",
    });
    return uploaded.url;
  } finally {
    fs.unlink(file.path, () => {});
  }
};

const canEditBlog = (req: Request, blog: { authorId: unknown }) =>
  isModerator(req) ||
  String(blog.authorId) === String((req.user as any)?._id);

export const addBlog = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { category, title, description, content } = req.body;
    const authorId = (req.user as any)?._id;

    if (!title || !description || !content || !category || !req.file) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return next(new ErrorHandler("All required fields must be filled.", 400));
    }

    const slug = slugify(title, { lower: true, strict: true });
    const existing = await Blog.findOne({ slug });
    if (existing) {
      fs.unlink(req.file.path, () => {});
      return next(
        new ErrorHandler("Blog with this title already exists.", 409)
      );
    }

    const imageUrl = await uploadBlogImage(req.file);
    const isPublished = parseBoolean(req.body.isPublished) ?? false;

    const newBlog = await Blog.create({
      category,
      title,
      slug,
      description,
      content,
      imageUrl,
      tags: parseTags(req.body.tags) ?? [],
      isPublished,
      authorId,
      publishedAt: isPublished ? new Date() : undefined,
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
    const { category, title, description, content, imageUrl } = req.body;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return next(new ErrorHandler("Blog post not found.", 404));
    }

    if (!canEditBlog(req, blog)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return next(
        new ErrorHandler("You can only edit blogs you wrote.", 403)
      );
    }

    if (title && title !== blog.title) {
      const newSlug = slugify(title, { lower: true, strict: true });
      const existingSlug = await Blog.findOne({
        slug: newSlug,
        _id: { $ne: blogId },
      });

      if (existingSlug) {
        if (req.file) fs.unlink(req.file.path, () => {});
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

    if (req.file) {
      blog.imageUrl = await uploadBlogImage(req.file);
    } else if (imageUrl !== undefined) {
      blog.imageUrl = imageUrl;
    }

    const tags = parseTags(req.body.tags);
    if (tags) blog.tags = tags;

    const isPublished = parseBoolean(req.body.isPublished);
    if (isPublished !== undefined && isPublished !== blog.isPublished) {
      blog.isPublished = isPublished;
      blog.publishedAt = isPublished ? new Date() : undefined;
    }

    const isListed = parseBoolean(req.body.isListed);
    if (isListed !== undefined && isModerator(req)) {
      blog.isListed = isListed;
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

    if (!canEditBlog(req, blog)) {
      return next(
        new ErrorHandler("You can only unlist blogs you wrote.", 403)
      );
    }

    blog.isListed = false;
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog has been unlisted successfully.",
    });
  }
);

// Admin: Get all blogs (regardless of status). Domain leads only see their own.
export const getAllBlogsAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const filter = isModerator(req) ? {} : { authorId: (req.user as any)?._id };
    const blogs = await Blog.find(filter)
      .sort({ createdAt: -1 })
      .populate("authorId", "name email");

    res.status(200).json({
      success: true,
      blogs,
      message: "All blogs fetched successfully (admin).",
    });
  }
);

// Admin: Get a blog by ID regardless of listed/published status
export const getBlogByIdAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return next(new ErrorHandler("Invalid blog ID.", 400));
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog || !canEditBlog(req, blog)) {
      return next(new ErrorHandler("Blog post not found.", 404));
    }

    await blog.populate("authorId", "name email");
    res.status(200).json({ success: true, blog });
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
