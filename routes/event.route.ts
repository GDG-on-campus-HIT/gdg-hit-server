import { authorizeRoles, isAuthenticate } from "./../middleware/auth";
import express from "express";
import {
  addEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  getEventById,
  getRegistrations,
  addRegistration,
  updateRegistration,
  deleteRegistration,
  getFAQs,
  addFAQ,
  updateFAQ,
  deleteFAQ,
  getRegistrationById,
  getEventRegistrations,
  checkIfRegistered,
  uploadGalleryForEvent,
  updateGalleryForEvent,
  getAllRegistrations,
  addMultipleRegistration,
  getEventPoster,
  uploadEventPoster,
  getEventContactInfo,
  updateEventContactInfo,
  getEventWhatsappLink,
  setEventWhatsappLink,
} from "../controllers/event.controller";

const eventRouter = express.Router();

// Get all events
eventRouter.get("/events", getEvents);

// Get a specific event by ID
eventRouter.get("/events/:id", getEventById);

// Create a new event
eventRouter.post("/events", isAuthenticate, authorizeRoles("admin", "super_admin"), addEvent);

// Update an existing event
eventRouter.put(
  "/events/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateEvent
);

// Delete an event
eventRouter.delete(
  "/events/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  deleteEvent
);

// Delete an event
eventRouter.get(
  "/events/:eventId/registrations",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getEventRegistrations
);

//event gallery upload images
eventRouter.post(
  "/event-gallery/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  uploadGalleryForEvent
);

eventRouter.put(
  "/event-gallery/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateGalleryForEvent
);

// Get all registrations
eventRouter.get(
  "/all-event-registrations",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getAllRegistrations
);

// Get all registrations for a specific event
eventRouter.get(
  "/event-registrations",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getRegistrations
);

// Create a new registration
eventRouter.post("/event-registrations", isAuthenticate, addRegistration);

// check if user is registed the event or not
eventRouter.get(
  "/event-register-check/:event",
  isAuthenticate,
  checkIfRegistered
);

// Get a registration event by ID
eventRouter.get(
  "/event-registrations/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  getRegistrationById
);

// Update an existing registration
eventRouter.put(
  "/event-registrations/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateRegistration
);

// Delete a registration
eventRouter.delete(
  "/event-registrations/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  deleteRegistration
);

// Get all FAQs for a specific event
eventRouter.get("/faqs", getFAQs);

// Create a new FAQ
eventRouter.post("/faqs", isAuthenticate, authorizeRoles("admin", "super_admin"), addFAQ);

// Update an existing FAQ
eventRouter.put(
  "/faqs/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateFAQ
);

// Delete an FAQ
eventRouter.delete(
  "/faqs/:id",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  deleteFAQ
);

//
// eventRouter.post('/addMultipleRegistration', addMultipleRegistration);
eventRouter.post(
  "/events/:eventId/poster",
  // isAuthenticate,
  // authorizeRoles("admin"),
  uploadEventPoster
);  
// Event poster routes
eventRouter.get("/events/:eventId/poster", getEventPoster);
// Update/replace poster (admin only)
eventRouter.put(
  "/events/:eventId/poster",
  // isAuthenticate,
  // authorizeRoles("admin"),
  uploadEventPoster
);


// Event contact info routes
eventRouter.get("/events/:eventId/contact", getEventContactInfo);
eventRouter.put(
  "/events/:eventId/contact",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  updateEventContactInfo
);

// Event whatsapp link routes
// Admin sets/updates the whatsapp group link for an event
eventRouter.post(
  "/events/:eventId/whatsapp",
  isAuthenticate,
  authorizeRoles("admin", "super_admin"),
  setEventWhatsappLink
);

// Public getter for whatsapp link  
eventRouter.get("/events/:eventId/whatsapp", getEventWhatsappLink);

export default eventRouter;
