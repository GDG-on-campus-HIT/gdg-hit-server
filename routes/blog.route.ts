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
blogRouter.get("/blogbySlug/:slug", getBlogBySlug);
blogRouter.get("/blog/:id", getBlogById);

// ✅ Member/Admin Routes
blogRouter.post(
  "/createBlog",
  // isAuthenticate,
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

// ✅ Admin-only routes (also available to super_admin)
blogRouter.get(
  "/admin/allBlogs",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getAllBlogsAdmin
);

blogRouter.patch(
  "/admin/unlistBlog/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  adminSoftDeleteBlog
);

export default blogRouter;
