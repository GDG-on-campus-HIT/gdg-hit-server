import express from 'express';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import { addTemplate, deleteTemplateById, getAllTemplates, getTemplateById, updateTemplate } from './../controllers/template.controller';

const templateRouter = express.Router();


// Add a new certificate
templateRouter.post('/template',isAuthenticate, authorizeRoles("admin"), addTemplate);

// Get all certificates
templateRouter.get('/template', isAuthenticate,authorizeRoles("admin"), getAllTemplates);

// Get a specific certificate by ID
templateRouter.get('/template/:id', isAuthenticate,authorizeRoles("admin"), getTemplateById);

// Update a certificate
templateRouter.put('/template/:id', isAuthenticate,authorizeRoles("admin"), updateTemplate);

// Delete a certificate
templateRouter.delete('/template/:id', isAuthenticate,authorizeRoles("admin"), deleteTemplateById);




export default templateRouter;
