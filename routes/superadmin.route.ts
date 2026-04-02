import { Application } from "express";
import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import {
  getAllAdmins,
  addAdmin,
  removeAdmin,
  updateAdminRole,
  getAdminActivityLogs,
  getActivityLogSummary,
  getSpecificAdminActivityLogs,
} from "../controllers/superadmin.controller";

const BASE = "/api/v1/superadmin";

/**
 * Register superadmin routes with full paths on the app.
 * Using app.get/post/... directly avoids 404s some setups hit with app.use(prefix, router).
 */
export function registerSuperadminRoutes(app: Application): void {
  app.get(`${BASE}/admins`, isAuthenticate, authorizeRoles("super_admin"), getAllAdmins);

  app.post(`${BASE}/admins/add`, isAuthenticate, authorizeRoles("super_admin"), addAdmin);

  app.post(
    `${BASE}/admins/update-role`,
    isAuthenticate,
    authorizeRoles("super_admin"),
    updateAdminRole
  );

  app.delete(
    `${BASE}/admins/:adminId`,
    isAuthenticate,
    authorizeRoles("super_admin"),
    removeAdmin
  );

  app.get(
    `${BASE}/activity-logs/summary`,
    isAuthenticate,
    authorizeRoles("super_admin"),
    getActivityLogSummary
  );

  app.get(
    `${BASE}/activity-logs`,
    isAuthenticate,
    authorizeRoles("super_admin"),
    getAdminActivityLogs
  );

  app.get(
    `${BASE}/activity-logs/:adminId`,
    isAuthenticate,
    authorizeRoles("super_admin"),
    getSpecificAdminActivityLogs
  );
}
