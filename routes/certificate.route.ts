import express from 'express';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import { addCertificate, deleteCertificate, getAllCertificates, getCertificateById, getMyCertificates, increaseDownloadCount, updateCertificate, verifyCertificate } from '../controllers/certificate.controller';
import upload from '../middleware/multer';
import {
  certificateCheckPage,
  getCertificateTemplate,
  getEventCertificates,
  issueEventCertificates,
  previewCertificateTemplate,
  printEventCertificates,
  renderCertificateFile,
  saveCertificateTemplate,
  sendCertificateEmail,
  uploadCertificateBackground,
  uploadCertificateFont,
} from '../controllers/eventCertificate.controller';
import multer from 'multer';

const certificateRouter = express.Router();

const CERTIFICATE_ADMINS = ["domain_lead", "super_domain_admin", "super_admin"];

// Get my certificate
certificateRouter.get('/my-certificate',isAuthenticate, getMyCertificates);

// Add a new certificate
certificateRouter.post('/certificate',isAuthenticate, authorizeRoles(...CERTIFICATE_ADMINS),upload.single('certificate'), addCertificate);

// Get all certificates
certificateRouter.get('/certificate', isAuthenticate,authorizeRoles(...CERTIFICATE_ADMINS), getAllCertificates);

// Get a specific certificate by ID
certificateRouter.get('/certificate/:id', isAuthenticate,authorizeRoles(...CERTIFICATE_ADMINS), getCertificateById);

// Update a certificate
certificateRouter.put('/certificate',isAuthenticate, authorizeRoles(...CERTIFICATE_ADMINS),upload.single('certificate'), updateCertificate);

// Delete a certificate
certificateRouter.delete('/certificate/:id', isAuthenticate,authorizeRoles(...CERTIFICATE_ADMINS), deleteCertificate);

// Increase download count
certificateRouter.put('/certificate-download-count/:certificateId', isAuthenticate, increaseDownloadCount);



certificateRouter.get('/certificate/verify/:verification_code', verifyCertificate);

// Per-event certificate design and issuing
const designUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const certAdmin = [isAuthenticate, authorizeRoles(...CERTIFICATE_ADMINS)];

certificateRouter.get('/events/:eventId/certificate-template', ...certAdmin, getCertificateTemplate);
certificateRouter.put('/events/:eventId/certificate-template', ...certAdmin, saveCertificateTemplate);
certificateRouter.post('/events/:eventId/certificate-template/background', ...certAdmin, designUpload.single('file'), uploadCertificateBackground);
certificateRouter.post('/events/:eventId/certificate-template/font', ...certAdmin, designUpload.single('file'), uploadCertificateFont);
certificateRouter.post('/events/:eventId/certificate-template/preview', ...certAdmin, previewCertificateTemplate);
certificateRouter.get('/events/:eventId/certificates', ...certAdmin, getEventCertificates);
certificateRouter.post('/events/:eventId/certificates/issue', ...certAdmin, issueEventCertificates);
certificateRouter.get('/events/:eventId/certificates/print', ...certAdmin, printEventCertificates);
certificateRouter.post('/certificate/:id/send-mail', ...certAdmin, sendCertificateEmail);

// Public: rendered PDF and human-readable verification page (QR codes point here)
certificateRouter.get('/certificate/file/:code', renderCertificateFile);
certificateRouter.get('/certificate/check/:code', certificateCheckPage);

export default certificateRouter;
