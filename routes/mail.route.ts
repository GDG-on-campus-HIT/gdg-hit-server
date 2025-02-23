import { sendBulkCertificateMails, sendCertificateMail, sendPromotionMail } from '../controllers/mail.controller';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import express from 'express';

const mailRoute = express.Router();

// Get all events
mailRoute.post('/certificate-mail/:registration_id',isAuthenticate, authorizeRoles("admin"), sendCertificateMail);

mailRoute.post('/certificate-bulk-mail',isAuthenticate, authorizeRoles("admin"), sendBulkCertificateMails);


// mailRoute.post('/invite-mail/:registration_id',isAuthenticate, authorizeRoles("admin"), sendInviteMail);

mailRoute.post('/sendPromotionMail', sendPromotionMail);


export default mailRoute;
