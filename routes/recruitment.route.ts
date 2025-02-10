import express from "express";
import { authorizeRoles, isAuthenticate } from "./../middleware/auth";
import {
  getApplications,
  submitApplication,
  updateApplicationStatus,
  deleteApplication,
  getApplication,
} from "../controllers/recruitment.controller";

const recruitmentRouter = express.Router();

recruitmentRouter.get(
  "/applications",
  isAuthenticate,
  // authorizeRoles("admin"),
  getApplications
);

recruitmentRouter.get("/applications/:id", isAuthenticate, getApplication);

recruitmentRouter.post("/apply", submitApplication);

recruitmentRouter.put(
  "/applications/:id",
  isAuthenticate,
  // authorizeRoles("admin"),
  updateApplicationStatus
);
recruitmentRouter.delete(
  "/applications/:id",
  isAuthenticate,
  // authorizeRoles("admin"),
  deleteApplication
);

export default recruitmentRouter;
