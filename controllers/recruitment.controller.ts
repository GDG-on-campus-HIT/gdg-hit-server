import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { RecruitmentModel, IRecruitment } from "../models/recruitment.model";

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
      const { generalInfo, gdgPerspective, roleSpecific, finalInfo } = req.body;

      // Validation for Step 1: General Information
      const requiredGeneralFields = {
        fullName: "Full name is required",
        email: "Email is required",
        phoneNumber: "Phone number is required",
        rollNumber: "Roll number is required",
        branch: "Branch is required",
        branchYear: "Year is required",
        positions: "At least one position is required",
      };

      for (const [key, message] of Object.entries(requiredGeneralFields)) {
        if (!generalInfo?.[key]) {
          return next(new ErrorHandler(message, 400));
        }
      }

      // Validation for Step 2: GDG Perspective
      if (!gdgPerspective?.gdgPerspective || !gdgPerspective?.eventIdeas) {
        return next(
          new ErrorHandler("GDG perspective and event ideas are required", 400)
        );
      }

      // Validation for Step 4: Final Information
      if (!finalInfo?.timeCommitment || !finalInfo?.reasonToJoin) {
        return next(
          new ErrorHandler(
            "Time commitment and reason to join are required",
            400
          )
        );
      }

      // Validate role-specific information based on selected positions
      const selectedPositions = generalInfo.positions;
      const roleSpecificData: any = {};

      selectedPositions.forEach((position: string) => {
        if (roleSpecific?.[position]) {
          roleSpecificData[position] = roleSpecific[position];
        }
      });

      const application = await RecruitmentModel.create({
        generalInfo,
        gdgPerspective,
        roleSpecific: roleSpecificData,
        finalInfo,
        status: "pending",
      });

      res.status(201).json({
        success: true,
        application,
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
