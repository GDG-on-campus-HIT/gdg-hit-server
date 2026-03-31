
import express from "express";
import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import {
    createRecruitmentForm,
    getAllRecruitmentForms,
    getActiveRecruitmentForm,
    updateRecruitmentForm,
    deleteRecruitmentForm,
    getRecruitmentStats,
    getRecruitmentFormById
} from "../controllers/recruitmentForm.controller";

const recruitmentFormRouter = express.Router();
const recruitmentBase = "/recruitment";

// Public Route to get the active form (anyone can check if recruitment is open)
recruitmentFormRouter.get(`${recruitmentBase}/active-form`, getActiveRecruitmentForm);

// Admin Routes for Form Management (also available to super_admin)
recruitmentFormRouter.post(
    `${recruitmentBase}/forms`,
    isAuthenticate,
    authorizeRoles("admin", "super_admin"),
    createRecruitmentForm
);

recruitmentFormRouter.get(
    `${recruitmentBase}/forms`,
    isAuthenticate,
    authorizeRoles("admin", "super_admin"),
    getAllRecruitmentForms
);
recruitmentFormRouter.get(
    `${recruitmentBase}/forms/:id`,
    isAuthenticate,
    authorizeRoles("admin", "super_admin"),
    getRecruitmentFormById
);

recruitmentFormRouter.put(
    `${recruitmentBase}/forms/:id`,
    isAuthenticate,
    authorizeRoles("admin", "super_admin"),
    updateRecruitmentForm
);

recruitmentFormRouter.delete(
    `${recruitmentBase}/forms/:id`,
    isAuthenticate,
    authorizeRoles("admin", "super_admin"),
    deleteRecruitmentForm
);

// Admin Stats for Dashboard
recruitmentFormRouter.get(
    `${recruitmentBase}/stats`,
    isAuthenticate,
    authorizeRoles("admin", "super_admin"),
    getRecruitmentStats
);

export default recruitmentFormRouter;
