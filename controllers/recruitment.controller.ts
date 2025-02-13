import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/CatchAsyncError";
import ErrorHandler from "../utlis/ErrorHandler";
import { RecruitmentModel } from "../models/recruitment.model";
import userModel from "../models/user.model";

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
      console.log("Received request body:", req.body);

      const { generalInfo, gdgPerspective, roleSpecific, finalInfo } = req.body;

      console.log("Extracted fields:", {
        generalInfo,
        gdgPerspective,
        roleSpecific,
        finalInfo,
      });

      if (!req.user) {
        return next(new ErrorHandler("User authentication failed.", 401));
      }

      const userId = (req.user as { _id: string })?._id;
      console.log("Extracted userId:", userId);

      if (!userId) {
        return next(new ErrorHandler("User ID is missing in request.", 400));
      }

      const user = await userModel.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found.", 404));
      }

      console.log("Checking for existing application...");
      const existingApplication = await RecruitmentModel.findOne({
        $or: [
          { "generalInfo.email": generalInfo.email },
          { "generalInfo.rollNumber": generalInfo.rollNumber },
          { user: user._id },
        ],
      });

      if (existingApplication) {
        return next(
          new ErrorHandler(
            `Application already exists with this ${
              existingApplication.generalInfo.email === generalInfo.email
                ? "email"
                : "roll number"
            }`,
            400
          )
        );
      }

      console.log("Validating general information...");
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
        if (!generalInfo?.[field]) {
          return next(new ErrorHandler(`${field} is required`, 400));
        }
      }

      console.log("Checking and updating user roll number and branch...");
      // Check and update user roll number and branch
      if (
        generalInfo.rollNumber !== user.classRollNo ||
        generalInfo.branch !== user.department
      ) {
        await userModel.findByIdAndUpdate(
          user._id,
          {
            $set: {
              classRollNo: generalInfo.rollNumber,
              department: generalInfo.branch,
            },
          },
          { new: true }
        );
      }

      // Update user's LinkedIn and GitHub profiles
      if (finalInfo?.linkedIn || finalInfo?.portfolio) {
        await userModel.findByIdAndUpdate(
          user._id,
          {
            $set: {
              linkedinProfile: finalInfo.linkedIn || user.linkedinProfile,
              githubProfile: finalInfo.portfolio || user.githubProfile,
            },
          },
          { new: true }
        );
      }
      console.log("Validating GDG perspective...");
      // Validate GDG perspective
      if (!gdgPerspective?.gdgPerspective || !gdgPerspective?.eventIdeas) {
        return next(
          new ErrorHandler("GDG perspective and event ideas are required", 400)
        );
      }

      console.log("Validating final information...");
      if (!finalInfo?.timeCommitment || !finalInfo?.reasonToJoin) {
        return next(
          new ErrorHandler(
            "Time commitment and reason to join are required",
            400
          )
        );
      }

      console.log("Validating role-specific information...");
      // Validate role-specific information
      const roleSpecificData: any = {};
      generalInfo.positions.forEach((position: string) => {
        if (roleSpecific?.[position]) {
          roleSpecificData[position] = roleSpecific[position];
        }
      });

      console.log("Creating new application...");
      const application = await RecruitmentModel.create({
        user: userId,
        generalInfo,
        gdgPerspective,
        roleSpecific: roleSpecificData,
        finalInfo,
        status: "pending",
      });

      console.log("Application created successfully:", application);

      res.status(201).json({
        success: true,
        application,
      });
    } catch (error: any) {
      console.error("Error occurred:", error);

      if (error.code === 11000) {
        return next(
          new ErrorHandler(
            "An application with this email or roll number already exists",
            400
          )
        );
      }

      return next(new ErrorHandler(error.message, 500));
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
