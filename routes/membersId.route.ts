import express from "express";
import { isAuthenticate, authorizeRoles } from "../middleware/auth";
import {
  createMemberIdCard,
  deleteMemberIdCard,
  getAllMemberIdCards,
  getMemberIdCard,
  toggleIdCardStatus,
  updateMemberIdCard,
} from "../controllers/membersId.controller";

const membersIdRouter = express.Router();

// Public routes - Anyone can access
membersIdRouter.get("/all", getAllMemberIdCards);
membersIdRouter.get("/:memberId", getMemberIdCard);

// Admin only routes - Require authentication and admin role (also available to super_admin)
membersIdRouter.post("/create", isAuthenticate, authorizeRoles("admin", "super_admin"), createMemberIdCard);
membersIdRouter.put("/update/:id", isAuthenticate, authorizeRoles("admin", "super_admin"), updateMemberIdCard);
membersIdRouter.delete("/deleteId/:id", isAuthenticate, authorizeRoles("admin", "super_admin"), deleteMemberIdCard);
membersIdRouter.patch("/toggle-status/:id", isAuthenticate, authorizeRoles("admin", "super_admin"), toggleIdCardStatus);

export default membersIdRouter;
