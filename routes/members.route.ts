import { authorizeRoles, isAuthenticate } from "./../middleware/auth";
import express from "express";
import {
  addMember,
  deleteMember,
  getMembers,
  getMemberById,
  updateMember,
  toggleMemberStatus,
  getAllMembersAdmin,
  getMemberByIdAdmin,
} from "../controllers/members.controller";

const memberRouter = express.Router();

const CONTENT_MANAGERS = ["super_domain_admin", "super_admin"];

// Get all members including inactive (Admin only)
memberRouter.get(
  "/members/admin/all",
  isAuthenticate,
  authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
  getAllMembersAdmin
);

// Get single member for admin (includes inactive)
memberRouter.get(
  "/members/admin/:id",
  isAuthenticate,
  authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
  getMemberByIdAdmin
);

memberRouter.post(
  "/members",
  isAuthenticate,
  authorizeRoles(...CONTENT_MANAGERS),
  addMember
);

memberRouter.put(
  "/members/:id",
  isAuthenticate,
  authorizeRoles(...CONTENT_MANAGERS),
  updateMember
);

// Soft delete - Toggle member status (Admin only)
memberRouter.patch(
  "/members/toggle-status/:id",
  isAuthenticate,
  authorizeRoles(...CONTENT_MANAGERS),
  toggleMemberStatus
);

// Hard delete member (Admin only) - Use with caution
memberRouter.delete(
  "/members/hard-delete/:id",
  isAuthenticate,
  authorizeRoles(...CONTENT_MANAGERS),
  deleteMember
);

memberRouter.get("/members", getMembers);

memberRouter.get("/members/:id", getMemberById);


export default memberRouter;
