import express from 'express';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import { addContact, getContacts, getContactById, updateContact, deleteContact } from '../controllers/contact.controller';

const contactRouter = express.Router();

// Add a new contact message
contactRouter.post('/contact', addContact);

// Get all contact messages
contactRouter.get('/contact', isAuthenticate,authorizeRoles("admin", "super_admin"), getContacts);

// Get a specific contact message by ID
contactRouter.get('/contact/:id', isAuthenticate,authorizeRoles("admin", "super_admin"), getContactById);

// Update a contact message
contactRouter.put('/contact/:id', isAuthenticate,authorizeRoles("admin", "super_admin"), updateContact);

// Delete a contact message
contactRouter.delete('/contact/:id', isAuthenticate,authorizeRoles("admin", "super_admin"), deleteContact);

export default contactRouter;
