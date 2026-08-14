import ErrorHandler from "../utlis/ErrorHandler";
import Jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utlis/redis";
import { CatchAsyncError } from "./CatchAsyncError";
import { NextFunction, Request, Response } from "express";
import userModel from "../models/user.model";

// authenticated user
export const isAuthenticate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    let access_token = req.cookies.access_token as string;

    if (!access_token && req.headers.authorization) {
      access_token = req.headers.authorization.split(" ")[1];
    }

    if (!access_token) {
      return next(new ErrorHandler("Please login to access the resource", 401));
    }

    try {
      const decoded = Jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN as string
      ) as JwtPayload;

      if (!decoded) {
        return next(new ErrorHandler("Access token is not valid", 401));
      }

      // Try to get user from Redis cache first
      let user = await redis.get(decoded.id).catch(() => null);

      if (user) {
        req.user = JSON.parse(user);
      } else {
        // Fallback to database if Redis fails or user is not in cache
        const dbUser = await userModel.findById(decoded.id);
        if (!dbUser) {
          return next(new ErrorHandler("User not found", 404));
        }
        req.user = dbUser;
      }

      next();
    } catch (error) {
      return next(new ErrorHandler("Access token is not valid", 401));
    }
  }
);



export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Access denied: Your role (${req.user?.role}) is not authorized to access this resource.`,
          403
        )
      );
    }
    next();
  };
};