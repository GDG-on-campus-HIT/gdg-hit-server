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
import { getActiveRecruitmentForm } from "../controllers/recruitmentForm.controller";

const recruitmentRouter = express.Router();
const recruitmentBase = "/recruitment";

recruitmentRouter.get(`${recruitmentBase}/active-form`, getActiveRecruitmentForm);

recruitmentRouter.get(
  `${recruitmentBase}/applications`,
  isAuthenticate,
  authorizeRoles("admin"),
  getApplications
);

recruitmentRouter.get(`${recruitmentBase}/applications/:id`, isAuthenticate, getApplication);

recruitmentRouter.post(`${recruitmentBase}/recruitmentFormSubmission`, isAuthenticate, submitApplication);

recruitmentRouter.put(
  `${recruitmentBase}/applications/:id`,
  isAuthenticate,
  authorizeRoles("admin"),
  updateApplicationStatus
);
recruitmentRouter.delete(
  `${recruitmentBase}/applications/:id`,
  isAuthenticate,
  authorizeRoles("admin"),
  deleteApplication
);
recruitmentRouter.get(`${recruitmentBase}/isAlreadyRegistered`, isAuthenticate, checkUserRegistration);



// admin only ---------------->
recruitmentRouter.get(
  `${recruitmentBase}/getAllRecruitmentData`,
  isAuthenticate,
  authorizeRoles("admin"),
  getAllRecruitmentData
);

recruitmentRouter.get(
  `${recruitmentBase}/searchRecruitmentData`,
  isAuthenticate,
  authorizeRoles("admin"),
  searchRecruitmentData
);

recruitmentRouter.patch(
  `${recruitmentBase}/updateRecruitmentData/:id`,
  isAuthenticate,
  authorizeRoles("admin"),
  updateRecruitmentData
);


recruitmentRouter.get(
  `${recruitmentBase}/getAllUsersWithApplications`,
  isAuthenticate,
  authorizeRoles("admin"),
  getAllUsersWithApplications
);


export default recruitmentRouter;
