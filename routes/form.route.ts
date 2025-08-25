import express from "express";
import { isAuthenticate, authorizeRoles } from "../middleware/auth";
import { createEventForm, getEventFormById, updateEventForm, deleteEventForm, toggleFormStatus } from "../controllers/form.controller";

const eventForm = express.Router();

eventForm.post("/create", isAuthenticate, authorizeRoles("admin"), createEventForm);
eventForm.get("/:id", isAuthenticate, authorizeRoles("admin"), getEventFormById);
eventForm.put("/update/:id", isAuthenticate, authorizeRoles("admin"), updateEventForm);
eventForm.delete("/delete/:id", isAuthenticate, authorizeRoles("admin"), deleteEventForm);
eventForm.patch("/toggle-status/:id", isAuthenticate, authorizeRoles("admin"), toggleFormStatus);

export default eventForm;
