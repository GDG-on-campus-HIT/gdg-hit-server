import express from "express";
import { authorizeRoles, isAuthenticate } from "./../middleware/auth";
import {
  getApplications,
  submitApplication,
  updateApplicationStatus,
  deleteApplication,
  getApplication,
  checkUserRegistration,
  getAllRecruitmentData,
  searchRecruitmentData,
  updateRecruitmentData,
  getAllUsersWithApplications,
} from "../controllers/recruitment.controller";

const recruitmentRouter = express.Router();

recruitmentRouter.get(
  "/applications",
  isAuthenticate,
  authorizeRoles("admin"),
  getApplications
);

recruitmentRouter.get("/applications/:id", isAuthenticate, getApplication);

recruitmentRouter.post("/recruitmentFormSubmission", isAuthenticate, submitApplication);

recruitmentRouter.put(
  "/applications/:id",
  isAuthenticate,
  authorizeRoles("admin"),
  updateApplicationStatus
);
recruitmentRouter.delete(
  "/applications/:id",
  isAuthenticate,
  authorizeRoles("admin"),
  deleteApplication
);
recruitmentRouter.get("/isAlreadyRegistered", isAuthenticate, checkUserRegistration);



// admin only ---------------->
recruitmentRouter.get(
  "/getAllRecruitmentData",
  isAuthenticate,
  authorizeRoles("admin"),
  getAllRecruitmentData
);

recruitmentRouter.get(
  "/searchRecruitmentData",
  isAuthenticate,
  authorizeRoles("admin"),
  searchRecruitmentData
);

recruitmentRouter.patch(
  "/updateRecruitmentData/:id",
  isAuthenticate,
  authorizeRoles("admin"),
  updateRecruitmentData
);


recruitmentRouter.get(
  "/getAllUsersWithApplications",
  isAuthenticate,
  authorizeRoles("admin"),
  getAllUsersWithApplications
);


export default recruitmentRouter;
