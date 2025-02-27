import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import express from "express";
import { getAllUsers, getRecruitmentAnalytics, getUserAnalytics } from "../controllers/analytics.controller";

const analyticsRoute = express.Router();

analyticsRoute.get(
  "/getUserAnalytics",
  isAuthenticate,
  authorizeRoles("admin"),
  getUserAnalytics
);

analyticsRoute.get(
    "/getRecruitmentAnalytics",
    isAuthenticate,
    authorizeRoles("admin"),
    getRecruitmentAnalytics
  );






  analyticsRoute.get(
    "/getAllUsers",
    isAuthenticate,
    authorizeRoles("admin"),
    getAllUsers
  );



export default analyticsRoute;
