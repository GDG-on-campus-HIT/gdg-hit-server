import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import express from "express";
import { getAllUsers, getRecruitmentAnalytics, getUserAnalytics } from "../controllers/analytics.controller";

const analyticsRoute = express.Router();

analyticsRoute.get(
  "/getUserAnalytics",
  isAuthenticate,
  authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
  getUserAnalytics
);

analyticsRoute.get(
    "/getRecruitmentAnalytics",
    isAuthenticate,
    authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
    getRecruitmentAnalytics
  );






  analyticsRoute.get(
    "/getAllUsers",
    isAuthenticate,
    authorizeRoles("domain_lead", "super_domain_admin", "super_admin"),
    getAllUsers
  );



export default analyticsRoute;
