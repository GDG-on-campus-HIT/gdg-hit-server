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

// Admin only routes - Require authentication and admin role
membersIdRouter.post("/create", isAuthenticate, authorizeRoles("admin"), createMemberIdCard);
membersIdRouter.put("/update/:id", isAuthenticate, authorizeRoles("admin"), updateMemberIdCard);
membersIdRouter.delete("/deleteId/:id", isAuthenticate, authorizeRoles("admin"), deleteMemberIdCard);
membersIdRouter.patch("/toggle-status/:id", isAuthenticate, authorizeRoles("admin"), toggleIdCardStatus);

export default membersIdRouter;
