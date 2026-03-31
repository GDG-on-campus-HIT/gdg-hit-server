import express from "express";
import { isAuthenticate, authorizeRoles } from "../middleware/auth";
import { createForm, getAllForms, getFormById, updateForm, deleteForm, toggleFormActive } from "../controllers/form.controller";

const eventFormRouter = express.Router();

eventFormRouter.get("/forms/:id",isAuthenticate, authorizeRoles("admin", "super_admin"), getFormById);
eventFormRouter.post("/forms/create",isAuthenticate, authorizeRoles("admin", "super_admin"), createForm);
eventFormRouter.get("/forms/get-forms",isAuthenticate, authorizeRoles("admin", "super_admin"),  getAllForms);
eventFormRouter.put("/forms/:id",isAuthenticate, authorizeRoles("admin", "super_admin"), updateForm);
eventFormRouter.delete("/forms/delete/:id",isAuthenticate, authorizeRoles("admin", "super_admin"), deleteForm);
eventFormRouter.patch("/forms/:id/toggle-status",isAuthenticate, authorizeRoles("admin", "super_admin"),  toggleFormActive);

export default eventFormRouter;

//  