import express from "express";
import { isAuthenticate } from "./../middleware/auth";
import { 
  authorizeRoles, 
  domainGuard, 
  activityLogger, 
  ROLES 
} from "../middleware/rbac";
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
  updateRoleWhatsappLink,
  updateRoleWhatsappLinkByName,
} from "../controllers/recruitment.controller";
import { getActiveRecruitmentForm } from "../controllers/recruitmentForm.controller";

const recruitmentRouter = express.Router();
const recruitmentBase = "/recruitment";

recruitmentRouter.get(`${recruitmentBase}/active-form`, getActiveRecruitmentForm);

// GET Applications (Granular access)
recruitmentRouter.get(
  `${recruitmentBase}/applications`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_DOMAIN_ADMIN, ROLES.SUPER_ADMIN),
  domainGuard, // Access ONLY assigned domains
  getApplications
);

// GET Single Application
recruitmentRouter.get(
  `${recruitmentBase}/applications/:id`, 
  isAuthenticate, 
  getApplication
);

// Public submission
recruitmentRouter.post(
  `${recruitmentBase}/recruitmentFormSubmission`, 
  isAuthenticate, 
  submitApplication
);

// UPDATE Application Status (Requires Evaluator/Lead and Domain Access)
recruitmentRouter.put(
  `${recruitmentBase}/applications/:id`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_DOMAIN_ADMIN, ROLES.SUPER_ADMIN),
  domainGuard,
  activityLogger("update_status", "Updated application status"),
  updateApplicationStatus
);

// DELETE Application (Only Domain Lead, Global and Super Admin)
recruitmentRouter.delete(
  `${recruitmentBase}/applications/:id`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_DOMAIN_ADMIN, ROLES.SUPER_ADMIN),
  domainGuard,
  activityLogger("remove_application", "Deleted recruitment application"),
  deleteApplication
);

recruitmentRouter.get(`${recruitmentBase}/isAlreadyRegistered`, isAuthenticate, checkUserRegistration);

// admin only (also super_admin) -------->
// Get all recruitment data with domain filtering
recruitmentRouter.get(
  `${recruitmentBase}/getAllRecruitmentData`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_DOMAIN_ADMIN, ROLES.SUPER_ADMIN),
  domainGuard,
  getAllRecruitmentData
);

recruitmentRouter.get(
  `${recruitmentBase}/searchRecruitmentData`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_DOMAIN_ADMIN, ROLES.SUPER_ADMIN),
  domainGuard,
  searchRecruitmentData
);

recruitmentRouter.patch(
  `${recruitmentBase}/updateRecruitmentData/:id`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_DOMAIN_ADMIN, ROLES.SUPER_ADMIN),
  domainGuard,
  activityLogger("update_data", "Updated recruitment data"),
  updateRecruitmentData
);

recruitmentRouter.get(
  `${recruitmentBase}/getAllUsersWithApplications`,
  isAuthenticate,
  authorizeRoles(ROLES.SUPER_DOMAIN_ADMIN, ROLES.SUPER_ADMIN), // Broad visibility restricted
  getAllUsersWithApplications
);

// ============ WhatsApp Group Links Management Routes ============

// Admin: Update WhatsApp link for a role (by role ID)
recruitmentRouter.patch(
  `${recruitmentBase}/forms/:formId/roles/:roleId/whatsapp`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_ADMIN), // Domain leads can update links for their domains
  domainGuard,
  activityLogger("update_links", "Updated WhatsApp group link"),
  updateRoleWhatsappLink
);

// Admin: Update WhatsApp link for a role (by role name)
recruitmentRouter.patch(
  `${recruitmentBase}/forms/:formId/role-whatsapp`,
  isAuthenticate,
  authorizeRoles(ROLES.DOMAIN_LEAD, ROLES.SUPER_ADMIN),
  domainGuard,
  activityLogger("update_links", "Updated WhatsApp group link"),
  updateRoleWhatsappLinkByName
);

export default recruitmentRouter;
