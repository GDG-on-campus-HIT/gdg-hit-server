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
} from "../controllers/members.controller";

const memberRouter = express.Router();

memberRouter.get("/members", getMembers);

memberRouter.get("/members/:id", getMemberById);

memberRouter.post(
  "/members",
  isAuthenticate,
  authorizeRoles("admin"),
  addMember
);

memberRouter.put(
  "/members/:id",
  isAuthenticate,
  authorizeRoles("admin"),
  updateMember
);

// Soft delete - Toggle member status (Admin only)
memberRouter.patch(
  "/members/toggle-status/:id",
  isAuthenticate,
  authorizeRoles("admin"),
  toggleMemberStatus
);

// Get all members including inactive (Admin only)
memberRouter.get(
  "/members/admin/all",
  isAuthenticate,
  authorizeRoles("admin"),
  getAllMembersAdmin
);

// Hard delete member (Admin only) - Use with caution
memberRouter.delete(
  "/members/hard-delete/:id",
  isAuthenticate,
  authorizeRoles("admin"),
  deleteMember
);

export default memberRouter;
