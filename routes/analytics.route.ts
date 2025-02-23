import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import express from "express";
import {  getAllRecruitmentData, getAllUsers, getRecruitmentAnalytics, getUserAnalytics } from "../controllers/analytics.controller";

const analyticsRoute = express.Router();

analyticsRoute.get(
  "/getUserAnalytics",
  // isAuthenticate,
  // authorizeRoles("admin"),
  getUserAnalytics
);

analyticsRoute.get(
    "/getRecruitmentAnalytics",
    // isAuthenticate,
    // authorizeRoles("admin"),
    getRecruitmentAnalytics
  );



  analyticsRoute.get(
    "/getAllRecruitmentData", // New route
    // isAuthenticate,
    // authorizeRoles("admin"),
    getAllRecruitmentData
  );


  analyticsRoute.get(
    "/getAllUsers",
    // isAuthenticate,
    // authorizeRoles("admin"),
    getAllUsers
  );

export default analyticsRoute;
