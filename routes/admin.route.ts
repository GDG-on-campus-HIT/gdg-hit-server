import { authorizeRoles, isAuthenticate } from "../middleware/auth";
import { getAllUsers } from "../controllers/admin.controller";
import express from "express";
import { uploadManyUser } from "../controllers/user.controller";

const adminRoute = express.Router();

// adminRoute.get(
//   "/allusers",
//   // isAuthenticate,
//   // authorizeRoles("admin"),
//   getAllUsers
// );

// adminRoute.post(
//   "/uploadUser",
//   uploadManyUser
// );


export default adminRoute;
