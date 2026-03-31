import express from "express";
import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import {
  getAllAdmins,
  addAdmin,
  removeAdmin,
  getAdminActivityLogs,
  getActivityLogSummary,
  getSpecificAdminActivityLogs,
} from "../controllers/superadmin.controller";

const superadminRouter = express.Router();

// Get all admins (Super admin only)
superadminRouter.get(
  "/admins",
  isAuthenticate,
  authorizeRoles("super_admin"),
  getAllAdmins
);

// Add new admin (Super admin only)
superadminRouter.post(
  "/admins/add",
  isAuthenticate,
  authorizeRoles("super_admin"),
  addAdmin
);

// Remove admin (Super admin only)
superadminRouter.delete(
  "/admins/:adminId",
  isAuthenticate,
  authorizeRoles("super_admin"),
  removeAdmin
);

// Get all admin activity logs (Super admin only)
superadminRouter.get(
  "/activity-logs",
  isAuthenticate,
  authorizeRoles("super_admin"),
  getAdminActivityLogs
);

// Get activity log summary (Super admin only)
superadminRouter.get(
  "/activity-logs/summary",
  isAuthenticate,
  authorizeRoles("super_admin"),
  getActivityLogSummary
);

// Get specific admin's activity logs (Super admin only)
superadminRouter.get(
  "/activity-logs/:adminId",
  isAuthenticate,
  authorizeRoles("super_admin"),
  getSpecificAdminActivityLogs
);

export default superadminRouter;
