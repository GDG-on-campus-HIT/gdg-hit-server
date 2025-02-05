import ErrorHandler from "../utlis/ErrorHandler";
import Jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utlis/redis";
import { CatchAsyncError } from "./CatchAsyncError";
import { NextFunction, Request, Response } from "express";


// authenticated user
export const isAuthenticate = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token as string;

    if (!access_token) {
      return next(new ErrorHandler("please login to access the resourse", 400));
    }

    const decoded = Jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    if (!decoded) {
      return next(new ErrorHandler("access token is not valid", 400));
    }

    const user = await redis.get(decoded.id);

    if (!user) {
      return next(new ErrorHandler("user not found", 400));
    }

    req.user = JSON.parse(user);
    next();
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