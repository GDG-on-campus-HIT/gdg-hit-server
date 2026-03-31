import {
  sendBulkCertificateMails,
  sendCertificateMail,
  sendPromotionMail,
  sendRecruitmentEmails,
} from "../controllers/mail.controller";
import { authorizeRoles, isAuthenticate } from "./../middleware/auth";
import express from "express";

const mailRoute = express.Router();

// Get all events
mailRoute.post(
  "/certificate-mail/:registration_id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  sendCertificateMail
);

mailRoute.post(
  "/certificate-bulk-mail",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  sendBulkCertificateMails
);

// mailRoute.post('/invite-mail/:registration_id',isAuthenticate, authorizeRoles("admin"), sendInviteMail);

mailRoute.post("/sendPromotionMail", sendPromotionMail);

mailRoute.post(
  "/sendRecruitmentEmails",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
sendRecruitmentEmails
);

export default mailRoute;
