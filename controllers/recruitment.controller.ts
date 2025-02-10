import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { RecruitmentModel } from "../models/recruitment.model";
import userModel from "../models/user.model";
import mongoose from "mongoose";

// Get all applications with filtering
export const getApplications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, branch, positions } = req.query;
      const query: any = {};

      if (status) query.status = status;
      if (branch) query["generalInfo.branch"] = branch;
      if (positions) query["generalInfo.positions"] = { $in: [positions] };

      const applications = await RecruitmentModel.find(query).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        applications,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error?.message || "An error occurred", 400));
    }
  }
);

// Submit new application
export const submitApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, generalInfo, gdgPerspective, roleSpecific, finalInfo } =
        req.body;

      // Validate userId
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return next(new ErrorHandler("Valid User ID is required", 400));
      }

      // Check if user exists
      const user = await userModel.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Check if user already has an application
      const existingApplication = await RecruitmentModel.findOne({
        user: userId,
      });
      if (existingApplication) {
        return next(
          new ErrorHandler("You have already submitted an application", 400)
        );
      }

      // Validate generalInfo fields
      if (!generalInfo) {
        return next(new ErrorHandler("General information is required", 400));
      }

      const requiredGeneralFields = [
        "fullName",
        "email",
        "phoneNumber",
        "rollNumber",
        "branch",
        "branchYear",
        "positions",
      ];

      for (const field of requiredGeneralFields) {
        if (!generalInfo[field]) {
          return next(
            new ErrorHandler(`${field} is required in general information`, 400)
          );
        }
      }

      if (
        !Array.isArray(generalInfo.positions) ||
        generalInfo.positions.length === 0
      ) {
        return next(
          new ErrorHandler("At least one position must be selected", 400)
        );
      }

      // Validate required fields in gdgPerspective
      if (!gdgPerspective?.gdgPerspective || !gdgPerspective?.eventIdeas) {
        return next(
          new ErrorHandler("GDG perspective and event ideas are required", 400)
        );
      }

      // Validate roleSpecific data
      if (Object.keys(roleSpecific).length === 0) {
        return next(
          new ErrorHandler(
            "At least one role-specific section is required",
            400
          )
        );
      }

      // Validate finalInfo
      if (!finalInfo?.timeCommitment || !finalInfo?.reasonToJoin) {
        return next(
          new ErrorHandler(
            "Time commitment and reason to join are required",
            400
          )
        );
      }

      // Create the application
      const application = await RecruitmentModel.create({
        user: userId,
        generalInfo, // Include generalInfo in creation
        gdgPerspective,
        roleSpecific,
        finalInfo,
        status: "pending",
      });

      // Update user's recruitmentId
      await userModel.findByIdAndUpdate(userId, {
        recruitmentId: application._id,
      });

      // Populate user details in response
      const populatedApplication = await application.populate(
        "user",
        "name email classRollNo department"
      );

      res.status(201).json({
        success: true,
        application: populatedApplication,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
// Update application status
export const updateApplicationStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["pending", "shortlisted", "rejected", "accepted"];
      if (!validStatuses.includes(status)) {
        return next(new ErrorHandler("Invalid status", 400));
      }

      const application = await RecruitmentModel.findById(id);
      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      application.status = status;
      await application.save();

      res.status(200).json({
        success: true,
        application,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Delete application
export const deleteApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const application = await RecruitmentModel.findById(id);

      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      await RecruitmentModel.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Application deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get single application
export const getApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const application = await RecruitmentModel.findById(id);

      if (!application) {
        return next(new ErrorHandler("Application not found", 404));
      }

      res.status(200).json({
        success: true,
        application,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
export const checkUserRegistration = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, rollNumber } = req.query;

      if (!email && !rollNumber) {
        return next(
          new ErrorHandler("Email or Roll Number is required for checking", 400)
        );
      }

      // Build query based on provided parameters
      const query: any = {
        $or: [],
      };

      if (email) {
        query.$or.push({ "generalInfo.email": email });
      }

      if (rollNumber) {
        query.$or.push({ "generalInfo.rollNumber": rollNumber });
      }

      const existingApplication = await RecruitmentModel.findOne(query);

      res.status(200).json({
        success: true,
        isRegistered: !!existingApplication,
        application: existingApplication
          ? {
              id: existingApplication._id,
              status: existingApplication.status,
              positions: existingApplication.generalInfo.positions,
            }
          : null,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
