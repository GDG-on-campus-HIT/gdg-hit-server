import express, { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { isAuthenticate, authorizeRoles } from "../middleware/auth";
import {
  createMemberIdCard,
  deleteMemberIdCard,
  getAllMemberIdCards,
  getAllMemberIdCardsAdmin,
  getMemberIdCard,
  toggleIdCardStatus,
  updateMemberIdCard,
} from "../controllers/membersId.controller";

const membersIdRouter = express.Router();

const ID_CARD_ADMINS = ["domain_lead", "super_domain_admin", "super_admin"];

// This router is mounted at /api/v1 root, so "/:memberId" would otherwise
// swallow every unknown GET (e.g. /api/v1/users) and throw a CastError.
const requireObjectIdParam =
  (param: string) => (req: Request, _res: Response, next: NextFunction) => {
    if (!isValidObjectId(req.params[param])) return next("route");
    next();
  };

// Namespaced routes (preferred)
membersIdRouter.get("/member-id-cards", getAllMemberIdCards);
membersIdRouter.get("/admin/member-id-cards", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), getAllMemberIdCardsAdmin);
membersIdRouter.get("/member-id-cards/:memberId", requireObjectIdParam("memberId"), getMemberIdCard);
membersIdRouter.post("/member-id-cards", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), createMemberIdCard);
membersIdRouter.put("/member-id-cards/:id", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), updateMemberIdCard);
membersIdRouter.delete("/member-id-cards/:id", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), deleteMemberIdCard);
membersIdRouter.patch("/member-id-cards/:id/toggle-status", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), toggleIdCardStatus);

// Legacy paths, kept so existing clients and printed QR codes keep working
membersIdRouter.get("/all", getAllMemberIdCards);
membersIdRouter.get("/:memberId", requireObjectIdParam("memberId"), getMemberIdCard);
membersIdRouter.post("/create", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), createMemberIdCard);
membersIdRouter.put("/update/:id", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), updateMemberIdCard);
membersIdRouter.delete("/deleteId/:id", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), deleteMemberIdCard);
membersIdRouter.patch("/toggle-status/:id", isAuthenticate, authorizeRoles(...ID_CARD_ADMINS), toggleIdCardStatus);

export default membersIdRouter;
