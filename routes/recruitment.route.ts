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
import { getActiveRecruitmentForm } from "../controllers/recruitmentForm.controller";

const recruitmentRouter = express.Router();
const recruitmentBase = "/recruitment";

recruitmentRouter.get(`${recruitmentBase}/active-form`, getActiveRecruitmentForm);

recruitmentRouter.get(
  `${recruitmentBase}/applications`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getApplications
);

recruitmentRouter.get(`${recruitmentBase}/applications/:id`, isAuthenticate, getApplication);

recruitmentRouter.post(`${recruitmentBase}/recruitmentFormSubmission`, isAuthenticate, submitApplication);

recruitmentRouter.put(
  `${recruitmentBase}/applications/:id`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateApplicationStatus
);
recruitmentRouter.delete(
  `${recruitmentBase}/applications/:id`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  deleteApplication
);
recruitmentRouter.get(`${recruitmentBase}/isAlreadyRegistered`, isAuthenticate, checkUserRegistration);



// admin only (also super_admin) -------->
recruitmentRouter.get(
  `${recruitmentBase}/getAllRecruitmentData`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getAllRecruitmentData
);

recruitmentRouter.get(
  `${recruitmentBase}/searchRecruitmentData`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  searchRecruitmentData
);

recruitmentRouter.patch(
  `${recruitmentBase}/updateRecruitmentData/:id`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateRecruitmentData
);


recruitmentRouter.get(
  `${recruitmentBase}/getAllUsersWithApplications`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getAllUsersWithApplications
);

// ============ WhatsApp Group Links Management Routes ============

// Admin: Get all recruitment forms
recruitmentRouter.get(
  `${recruitmentBase}/forms`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getAllRecruitmentForms
);

// Admin: Get specific recruitment form
recruitmentRouter.get(
  `${recruitmentBase}/forms/:formId`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getRecruitmentForm
);

// Admin: Update WhatsApp link for a role (by role ID)
recruitmentRouter.patch(
  `${recruitmentBase}/forms/:formId/roles/:roleId/whatsapp`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateRoleWhatsappLink
);

// Admin: Update WhatsApp link for a role (by role name) - More convenient for admin panel
recruitmentRouter.patch(
  `${recruitmentBase}/forms/:formId/role-whatsapp`,
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateRoleWhatsappLinkByName
);


export default recruitmentRouter;
