import express from 'express';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import { addTemplate, deleteTemplateById, getAllTemplates, getTemplateById, updateTemplate } from './../controllers/template.controller';

const templateRouter = express.Router();


// Add a new certificate
templateRouter.post('/template',isAuthenticate, authorizeRoles("domain_lead", "super_domain_admin", "super_admin"), addTemplate);

// Get all certificates
templateRouter.get('/template', isAuthenticate,authorizeRoles("domain_lead", "super_domain_admin", "super_admin"), getAllTemplates);

// Get a specific certificate by ID
templateRouter.get('/template/:id', isAuthenticate,authorizeRoles("domain_lead", "super_domain_admin", "super_admin"), getTemplateById);

// Update a certificate
templateRouter.put('/template/:id', isAuthenticate,authorizeRoles("domain_lead", "super_domain_admin", "super_admin"), updateTemplate);

// Delete a certificate
templateRouter.delete('/template/:id', isAuthenticate,authorizeRoles("domain_lead", "super_domain_admin", "super_admin"), deleteTemplateById);




export default templateRouter;
