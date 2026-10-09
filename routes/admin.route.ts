import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import { getAllUsers, getDashboard } from "../controllers/admin.controller";
import express from "express";
import { uploadManyUser } from "../controllers/user.controller";

const adminRoute = express.Router();

adminRoute.get(
  "/admin/dashboard",
  isAuthenticate,
  authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
  getDashboard
);

// adminRoute.get(
//   "/allusers",
//   // isAuthenticate,
//   // authorizeRoles("admin"),
//   getAllUsers
// );

// adminRoute.post(
//   "/uploadUser",
//   uploadManyUser
// );


export default adminRoute;
