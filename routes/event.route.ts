import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import express from 'express';
import { addEvent, getEvents, updateEvent, deleteEvent, getEventById, getRegistrations, addRegistration, updateRegistration, deleteRegistration, getFAQs, addFAQ, updateFAQ, deleteFAQ, getRegistrationById, getEventRegistrations, checkIfRegistered, uploadGalleryForEvent, updateGalleryForEvent, getAllRegistrations, addMultipleRegistration } from '../controllers/event.controller';

const eventRouter = express.Router();

// Get all events
eventRouter.get('/events', getEvents);

// Get a specific event by ID
eventRouter.get('/events/:id', getEventById);

// Create a new event
eventRouter.post('/events', isAuthenticate, authorizeRoles("admin"), addEvent);

// Update an existing event
eventRouter.put('/events/:id', isAuthenticate, authorizeRoles("admin"), updateEvent);

// Delete an event
eventRouter.delete('/events/:id', isAuthenticate, authorizeRoles("admin"), deleteEvent);

// Delete an event
eventRouter.get('/events/:eventId/registrations', isAuthenticate, authorizeRoles("admin"), getEventRegistrations);

//event gallery upload images
eventRouter.post('/event-gallery/:id', isAuthenticate, authorizeRoles("admin"), uploadGalleryForEvent);


eventRouter.put('/event-gallery/:id', isAuthenticate, authorizeRoles("admin"), updateGalleryForEvent);

// Get all registrations 
eventRouter.get('/all-event-registrations',isAuthenticate, authorizeRoles("admin"), getAllRegistrations);


// Get all registrations for a specific event
eventRouter.get('/event-registrations', isAuthenticate, authorizeRoles("user"), getRegistrations);

// Create a new registration
eventRouter.post('/event-registrations', isAuthenticate, addRegistration);


// check if user is registed the event or not
eventRouter.get('/event-register-check/:event', isAuthenticate, checkIfRegistered);

// Get a registration event by ID
eventRouter.get('/event-registrations/:id', isAuthenticate, authorizeRoles("admin"), getRegistrationById);

// Update an existing registration
eventRouter.put('/event-registrations/:id', isAuthenticate, authorizeRoles("admin"), updateRegistration);

// Delete a registration
eventRouter.delete('/event-registrations/:id', isAuthenticate, authorizeRoles("admin"), deleteRegistration);


// Get all FAQs for a specific event
eventRouter.get('/faqs', getFAQs);

// Create a new FAQ
eventRouter.post('/faqs', isAuthenticate, authorizeRoles("admin"), addFAQ);

// Update an existing FAQ
eventRouter.put('/faqs/:id', isAuthenticate, authorizeRoles("admin"), updateFAQ);

// Delete an FAQ
eventRouter.delete('/faqs/:id', isAuthenticate, authorizeRoles("admin"), deleteFAQ);


//
// eventRouter.post('/addMultipleRegistration', addMultipleRegistration);


export default eventRouter;
