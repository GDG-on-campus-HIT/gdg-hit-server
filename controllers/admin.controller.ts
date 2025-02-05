import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import userModel from "../models/user.model";
import ErrorHandler from "../utlis/ErrorHandler";


export const getAllUsers = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const users = await userModel
          .find()
          .sort({ createdAt: -1 }); 
  
        res.status(200).json({
          success: true,
          users,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  