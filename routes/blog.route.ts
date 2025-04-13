  import express from "express";
  import { isAuthenticate, authorizeRoles } from "../middleware/auth";
  import {
    addBlog,
    getBlogBySlug,
    getBlogById,
    getAllBlogs,
    updateBlog,
    deleteBlog,
  } from "../controllers/blog.controller";

  const blogRouter = express.Router();

  // Public Routes
  blogRouter.get("/allBlogs", getAllBlogs); // Everyone can read blogs
  blogRouter.get("/slug/:slug", getBlogBySlug);
  blogRouter.get("/blog/:id", getBlogById);

  // Admin & Member Only Routes
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

  blogRouter.delete(
    "/deleteBlog/:id",
    isAuthenticate,
    authorizeRoles("admin", "member"),
    deleteBlog
  );

  export default blogRouter;
