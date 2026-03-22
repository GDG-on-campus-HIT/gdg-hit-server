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
  getRecruitmentForm,
  getAllRecruitmentForms,
  updateRoleWhatsappLink,
  updateRoleWhatsappLinkByName,
} from "../controllers/recruitment.controller";

const recruitmentRouter = express.Router();
const recruitmentBase = "/recruitment"; 

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

// ============ WhatsApp Group Links Management Routes ============

// Admin: Get all recruitment forms
recruitmentRouter.get(
  `${recruitmentBase}/forms`,
  isAuthenticate,
  authorizeRoles("admin"),
  getAllRecruitmentForms
);

// Admin: Get specific recruitment form
recruitmentRouter.get(
  `${recruitmentBase}/forms/:formId`,
  isAuthenticate,
  authorizeRoles("admin"),
  getRecruitmentForm
);

// Admin: Update WhatsApp link for a role (by role ID)
recruitmentRouter.patch(
  `${recruitmentBase}/forms/:formId/roles/:roleId/whatsapp`,
  isAuthenticate,
  authorizeRoles("admin"),
  updateRoleWhatsappLink
);

// Admin: Update WhatsApp link for a role (by role name) - More convenient for admin panel
recruitmentRouter.patch(
  `${recruitmentBase}/forms/:formId/role-whatsapp`,
  isAuthenticate,
  authorizeRoles("admin"),
  updateRoleWhatsappLinkByName
);


export default recruitmentRouter;
