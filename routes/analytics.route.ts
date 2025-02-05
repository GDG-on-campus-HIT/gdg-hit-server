import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import express from "express";
import { certificateAnalytics, getEventAnalytics, getUserAnalytics } from "../controllers/analytics.controller";

const analyticsRoute = express.Router();

analyticsRoute.get(
  "/getUserAnalytics",
  isAuthenticate,
  authorizeRoles("admin"),
  getUserAnalytics
);

analyticsRoute.get(
    "/getEventAnalytics",
    isAuthenticate,
    authorizeRoles("admin"),
  getEventAnalytics
  );

  analyticsRoute.get(
    "/certificateAnalytics",
    isAuthenticate,
    authorizeRoles("admin"),
  certificateAnalytics
  );


export default analyticsRoute;
