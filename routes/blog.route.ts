import express from "express";
import {
  addBlog,
  getBlogBySlug,
  getBlogById,
  getAllBlogs,
  updateBlog,
  softDeleteBlog,
  getAllBlogsAdmin,
  adminSoftDeleteBlog,
} from "../controllers/blog.controller";
import { isAuthenticate, authorizeRoles } from "../middleware/auth";
import upload from "../middleware/upload"; // 👈 Import multer upload middleware

const blogRouter = express.Router();

// ✅ Public Routes
blogRouter.get("/allBlogs", getAllBlogs);
blogRouter.get("/slug/:slug", getBlogBySlug);
blogRouter.get("/blog/:id", getBlogById);

// ✅ Member/Admin Routes
blogRouter.post(
  "/createBlog",
  isAuthenticate,
  authorizeRoles("admin", "member"),
  upload.single("image"),
  addBlog
);

blogRouter.put(
  "/updateBlog/:id",
  isAuthenticate,
  authorizeRoles("admin", "member"),
  upload.single("image"),
  updateBlog
);

// Soft delete by user
blogRouter.patch(
  "/softDeleteBlog/:id",
  isAuthenticate,
  authorizeRoles("admin", "member"),
  softDeleteBlog
);

// ✅ Admin-only routes
blogRouter.get(
  "/admin/allBlogs",
  isAuthenticate,
  authorizeRoles("admin"),
  getAllBlogsAdmin
);

blogRouter.patch(
  "/admin/unlistBlog/:id",
  isAuthenticate,
  authorizeRoles("admin"),
  adminSoftDeleteBlog
);

export default blogRouter;
