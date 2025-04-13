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
  addBlog
);

blogRouter.put(
  "/updateBlog/:id",
  isAuthenticate,
  authorizeRoles("admin", "member"),
  updateBlog
);

// Soft delete by user
blogRouter.patch(
  "/softDeleteBlog/:id",
  isAuthenticate,
  authorizeRoles("admin", "member"),
  softDeleteBlog
);

// ❌ REMOVED: Permanent delete route
// blogRouter.delete("/deleteBlog/:id", isAuthenticate, authorizeRoles("admin", "member"), deleteBlog);

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
