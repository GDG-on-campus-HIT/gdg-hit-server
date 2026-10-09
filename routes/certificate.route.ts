import express from 'express';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import { addCertificate, deleteCertificate, getAllCertificates, getCertificateById, getMyCertificates, increaseDownloadCount, updateCertificate, verifyCertificate } from '../controllers/certificate.controller';
import upload from '../middleware/multer';

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

export default certificateRouter;
