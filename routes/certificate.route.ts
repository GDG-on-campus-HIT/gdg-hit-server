import express from 'express';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import { addCertificate, deleteCertificate, getAllCertificates, getCertificateById, getMyCertificates, increaseDownloadCount, updateCertificate, verifyCertificate } from '../controllers/certificate.controller';
import upload from '../middleware/multer';

const certificateRouter = express.Router();

// Get my certificate
certificateRouter.get('/my-certificate',isAuthenticate, getMyCertificates);

// Add a new certificate
certificateRouter.post('/certificate',isAuthenticate, authorizeRoles("admin"),upload.single('certificate'), addCertificate);

// Get all certificates
certificateRouter.get('/certificate', isAuthenticate,authorizeRoles("admin"), getAllCertificates);

// Get a specific certificate by ID
certificateRouter.get('/certificate/:id', isAuthenticate,authorizeRoles("admin"), getCertificateById);

// Update a certificate
certificateRouter.put('/certificate',isAuthenticate, authorizeRoles("admin"),upload.single('certificate'), updateCertificate);

// Delete a certificate
certificateRouter.delete('/certificate/:id', isAuthenticate,authorizeRoles("admin"), deleteCertificate);

// Increase download count
certificateRouter.put('/certificate-download-count/:certificateId', isAuthenticate, increaseDownloadCount);



certificateRouter.get('/certificate/verify/:verification_code', verifyCertificate);

export default certificateRouter;
